# AI Speech + Structuring Service

FastAPI service with two layers:
- Whisper transcription from audio
- Seq2seq text-to-JSON structuring with a transformer model
- Rule-based post-processing for normalization, negation handling, and schema-safe mapping

## Prerequisites

**macOS:**

If `python3` is not installed, use Homebrew:

```bash
brew install python@3.11
```

Verify:

```bash
python3 --version
```

## Setup

```bash
cd backend/ai_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

First model run may download transformer checkpoints and can take time.

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

## Endpoint

- POST /transcribe (multipart form field: file)
- POST /structure (json body: {"text":"..."})
- GET /health

## Extraction Quality Layer

The `/structure` pipeline now runs in two stages:

1. Seq2seq model generates draft JSON.
2. Post-processing layer applies deterministic fixes before schema validation:
	- Routes section-like content out of `additional_notes` into dedicated fields.
	- Normalizes list/string outputs and deduplicates repeated items.
	- Handles common negations like "no significant history" and "not on medications".
	- Infers common implicit items for advice, investigations, treatment, and vitals.
	- Enriches overly generic examination findings using extracted vitals.

This improves reliability when model outputs are structurally correct but semantically partial.

## Next.js Integration

Set the following in your environment:

```
AI_TRANSCRIBE_URL=http://localhost:8001/transcribe
AI_STRUCTURE_URL=http://localhost:8001/structure
AI_STRUCTURE_MODEL=google/flan-t5-base
```

## Fine-tune your own model

Train with paired raw text and JSON output examples:

```bash
python train_t5_prescription.py \
	--train-file /absolute/path/to/train.jsonl \
	--model-name google/flan-t5-base \
	--output-dir ./models/prescription-t5
```

Then set:

```
AI_STRUCTURE_MODEL=/absolute/path/to/backend/ai_service/models/prescription-t5
```

## Dataset Guidance (Important)

For better extraction quality, prioritize dataset improvements:

- Include noisy real-world transcripts (pauses, fillers, shorthand).
- Explicitly annotate negations and null-intent phrases:
	- "no significant history"
	- "not on medications"
- Label implicit clinical intent directly in target JSON:
	- lifestyle advice
	- follow-up recommendations
	- monitoring/investigation intent
- Keep outputs consistent across paraphrases of the same concept.
- Avoid mixing diagnosis/treatment/advice/investigation text under `additional_notes` unless truly unclassified.

## Dataset format

Each line in jsonl should contain:

```json
{"input": "fever for 3 days give paracetamol 500 mg twice daily", "output": {"vitals": {"temperature": "", "bp": "", "pulse": ""}, "complaints": [{"symptom": "fever", "duration": "3 days"}], "prescribed_medicines": [{"name": "paracetamol", "dosage": "500 mg", "frequency": "twice daily", "timing": ""}]}}
```
