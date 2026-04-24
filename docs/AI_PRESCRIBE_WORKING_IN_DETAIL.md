# AI Prescribe Working in Detail

This document explains, step by step, how AI Prescribe is currently working after the latest backend and extraction improvements.

## 1. What the feature now does

AI Prescribe now runs a hybrid extraction pipeline:

1. Audio to text using Whisper.
2. Text to structured prescription JSON using seq2seq model inference.
3. Rule-based post-processing to fix semantic gaps, normalize fields, map sections correctly, and infer common implicit clinical intent.
4. Schema validation before returning structured output.
5. Fallback to rule-only extraction if seq2seq structuring is unavailable.

## 1.1 Target architecture (0 cost, fully local)

Processing chain
- Whisper
- Fine-tuned medical transformer (T5)
- Constrained JSON generation (strict schema prompt)
- Light post-processing (not heavy rule inference)
- Schema validation model layer

Core components
- Model family: T5 (t5-small or t5-base)
- ML framework: PyTorch + Hugging Face Transformers
- Backend API: FastAPI
- App stack: Next.js + Supabase

Cost model
- Everything above can run fully local at zero API usage cost.

## 2. Entry points and core files

UI and frontend orchestration
- Panel UI: [src/components/ai/AiPrescribePanel.jsx](../src/components/ai/AiPrescribePanel.jsx)
- API route for transcription plus structuring: [src/app/api/ai/prescribe/route.js](../src/app/api/ai/prescribe/route.js)
- API route for saving draft: [src/app/api/ai/prescribe/save/route.js](../src/app/api/ai/prescribe/save/route.js)

Python AI service
- API service: [backend/ai_service/main.py](../backend/ai_service/main.py)
- Structurer model logic: [backend/ai_service/structurer.py](../backend/ai_service/structurer.py)
- Schema validation model: [backend/ai_service/schema.py](../backend/ai_service/schema.py)
- Post-processing quality layer: [backend/ai_service/postprocess.py](../backend/ai_service/postprocess.py)

Fallback rules (when structure service is unavailable)
- Rule extractor: [src/lib/ai/extraction.js](../src/lib/ai/extraction.js)

## 3. End to end flow

### Step A: Doctor uses AI Prescribe page

1. Doctor opens route /dashboard/doctor/ai/[id]/prescribe/ai.
2. Doctor records or uploads one or more audio clips.
3. Doctor transcribes clips.
4. Doctor combines transcript and requests field extraction.
5. Doctor reviews structured draft JSON.
6. Doctor saves as draft prescription.

### Step B: Next.js API route handles transcription and structuring

In [src/app/api/ai/prescribe/route.js](../src/app/api/ai/prescribe/route.js):

1. Accepts audio or transcript override.
2. Sends audio to AI transcribe service at AI_TRANSCRIBE_URL.
3. Receives transcript text.
4. Calls structure endpoint at AI_STRUCTURE_URL.
5. Returns:
   - appointmentId
   - transcript
   - structured
   - extractionMode
   - extractionWarning

Current behavior:
- Primary mode: seq2seq from Python structure service.
- Fallback mode: rules-fallback from frontend extraction module if structure endpoint fails.

### Step C: Python service handles AI extraction

In [backend/ai_service/main.py](../backend/ai_service/main.py):

1. POST /transcribe
   - Runs Whisper model.
   - Returns transcript text and segments.
2. POST /structure
   - Validates input text.
   - Uses PrescriptionStructurer to generate structured JSON.
   - Returns structured and meta.
3. GET /health
   - Returns whisper model and structurer readiness.

## 4. Seq2seq plus post-processing pipeline

In [backend/ai_service/structurer.py](../backend/ai_service/structurer.py):

1. Builds strict schema prompt with required keys.
2. Runs transformer generation.
3. Extracts JSON object from model output.
4. Parses JSON.
5. Sends parsed JSON to post-processing layer.
6. Validates final payload against PrescriptionDraft schema.
7. Returns validated JSON with postprocess metadata.

Why this matters:
- Seq2seq gives broad understanding.
- Post-processing closes semantic gaps and enforces consistent section mapping.

## 5. Schema now includes diagnosis as first class field

In [backend/ai_service/schema.py](../backend/ai_service/schema.py), PrescriptionDraft now includes diagnosis directly.

Impact:
- Diagnosis no longer needs to live in additional_notes.
- Downstream template mapping is cleaner and easier to validate.

## 6. Post-processing improvements now active

In [backend/ai_service/postprocess.py](../backend/ai_service/postprocess.py), the following fixes are applied.

### 6.1 Normalization
- Normalizes list-like sections even when model returns mixed formats.
- Cleans empty markers like none, nil, unknown, not mentioned.
- Deduplicates repeated values.
- Canonicalizes common medicine frequency variants.

### 6.2 Section remapping
- Routes section-like text out of additional_notes into dedicated fields.
- Supports routing for diagnosis, advice, treatment, investigations, history, and medications.

### 6.3 Negation handling
- Detects medical history negations such as no significant history.
- Detects current medication negations such as not on medications.
- Populates canonical outputs for these cases.

### 6.4 Implicit intent inference
- Advice inference examples:
  - stress reduction
  - proper sleep
  - hydration
  - low-salt diet
  - avoid smoking or alcohol
  - regular exercise
- Investigation inference examples:
  - BP monitoring
  - CBC
  - blood glucose profile
  - ECG
  - thyroid profile
- Treatment inference examples:
  - painkiller if needed
  - symptomatic medication as needed
  - conservative management

### 6.5 Examination findings enrichment
- Uses extracted vitals to enrich generic examination findings.
- Example: if BP and pulse are known, general_condition can be expanded with those values.

### 6.6 Temporary light salvage rule (now added)

Purpose
- Fix a common failure mode where the model copies a full mixed sentence into history_present_illness instead of splitting complaint, medicines, and advice.

When it runs
- history_present_illness has content.
- prescribed_medicines or advice is still empty.

What it does
1. Looks for medication action phrases such as give, prescribe, start, continue.
2. Extracts medicine candidates with dosage, frequency, and timing.
3. Looks for advice action phrases such as advise, suggest, recommend.
4. Extracts advice items into advice list.
5. Cleans history_present_illness to keep only symptom-history text before treatment or advice directives.

Example behavior
- Input style: cough for one week give azithromycin 500 mg once daily and advise steam inhalation
- Output style:
   - history_present_illness: cough for one week
   - prescribed_medicines: azithromycin 500 mg once daily
   - advice: steam inhalation

Design note
- This is intentionally a light temporary fallback, not a replacement for stronger model training.
- Long-term accuracy should come from better supervised data and stricter training targets.

## 7. What is returned in metadata

The structure endpoint returns meta with post-processing diagnostics, including:
- rules_applied_count
- rules_applied list

This makes extraction behavior auditable and easier to debug.

## 8. Save flow to database

In [src/app/api/ai/prescribe/save/route.js](../src/app/api/ai/prescribe/save/route.js):

1. Validates appointmentId and structured payload.
2. Resolves user, doctor, appointment, patient context.
3. Inserts draft row in prescriptions.
4. Stores full structured payload in template_snapshot.
5. Expands structured keys into prescription_values rows.
6. Writes audit log event created_from_ai.

## 9. Environment variables required

Minimum variables for full AI flow:
- AI_TRANSCRIBE_URL
- AI_STRUCTURE_URL
- AI_STRUCTURE_MODEL

Reference service setup details in [backend/ai_service/README.md](../backend/ai_service/README.md).

## 10. Fallback behavior and resilience

If structure endpoint is down, times out, or errors:
- Next.js route catches error.
- It builds structured payload using rule extractor in [src/lib/ai/extraction.js](../src/lib/ai/extraction.js).
- extractionMode becomes rules-fallback.
- extractionWarning includes failure details.

This prevents full feature failure and keeps doctor workflow usable.

## 11. Known operational checks

Before testing end to end:
1. Ensure Next.js app is running.
2. Ensure Python AI service is running on configured host and port.
3. Verify GET /health shows structurer_ready true for seq2seq mode.
4. Confirm transformer dependencies are installed in backend venv.

## 12. Current limitations

- Accuracy still depends on transcript quality and domain coverage in training data.
- Highly complex multi-problem consultations may still need manual correction.
- Implicit inference is rule-based and should be extended as new phrase variants appear.

## 13. Recommended future improvements

1. Build evaluation set with field-level metrics for diagnosis, advice, investigations, treatment, and negations.
2. Expand dataset with more real noisy transcripts and paraphrase diversity.
3. Add confidence scores per extracted section.
4. Add regression test suite for post-processing rules.
5. Periodically tune rule patterns from real production misses.
