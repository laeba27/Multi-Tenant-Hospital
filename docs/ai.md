# AI-Assisted Prescription System (Hybrid Approach)

## 1. Overview

This document defines the architecture and implementation strategy for an **AI-assisted prescription system** using a **hybrid approach**. The system focuses on:

* Local processing (privacy + control)
* Minimal dependency on external APIs
* Fast, practical implementation (MVP in ~1–2 days)
* Doctor-in-the-loop validation (no autonomous medical decisions)

---

## 2. Core Philosophy

> **“AI assists in structuring medical conversations, not making medical decisions.”**

The system:

* Converts doctor-patient conversations into structured data
* Pre-fills prescription fields
* Allows full manual control and editing by the doctor

---

## 3. High-Level Pipeline

```
Audio Recording
      ↓
Speech-to-Text (Whisper - local)
      ↓
Speaker Identification (light heuristic)
      ↓
Text Cleaning
      ↓
Rule-Based + NLP Extraction
      ↓
Structured JSON
      ↓
Mapping to Template Fields
      ↓
UI Preview (Editable)
      ↓
Final Prescription Save

---

## 3.1 Hybrid Execution Split

Only speech-to-text runs in Python. All extraction and mapping happens inside Next.js.

1. Next.js records audio and sends it to `/api/ai/prescribe`.
2. Next.js API forwards the audio to the local FastAPI service (`/transcribe`).
3. FastAPI returns transcript (and optional timestamps).
4. Next.js normalizes text, extracts fields, maps to prescription schema.
5. API responds with structured JSON used to prefill the UI.
```

---

## 4. System Components

### 4.1 Frontend

* Audio recording (browser)
* Upload audio file
* Display transcript
* Show extracted data
* Allow manual editing

---

### 4.2 Backend (Python - FastAPI)

Responsibilities:

* Process audio
* Generate transcript
* Extract structured data
* Return draft prescription

---

### 4.3 Database (Supabase)

Stores:

* Templates
* Fields
* Prescriptions
* Extracted values

---

## 5. Speech-to-Text (Local)

### Tool:

* Whisper (open-source)

### Features:

* Supports Hindi + English (mixed speech)
* Works offline
* Good baseline accuracy

### Implementation:

```python
import whisper

model = whisper.load_model("base")

result = model.transcribe("audio.wav")

text = result["text"]
segments = result["segments"]
```

---

## 6. Speaker Identification (Lightweight)

Avoid heavy diarization for MVP.

### Approach 1: Alternating Speakers

```python
def assign_speakers(segments):
    result = []
    speaker = "doctor"
    
    for seg in segments:
        result.append({
            "speaker": speaker,
            "text": seg["text"]
        })
        speaker = "patient" if speaker == "doctor" else "doctor"
    
    return result
```

---

### Approach 2: Keyword-Based Detection

```python
if "kya problem hai" in text:
    speaker = "doctor"
elif "mujhe" in text:
    speaker = "patient"
```

---

## 7. Text Cleaning

Normalize and sanitize input text.

```python
import re

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\u0900-\u097F\s]', '', text)
    return text
```

---

## 8. Data Extraction (Rule-Based Core)

The system uses deterministic rules for reliability and speed.

---

### 8.1 Symptom Extraction

```python
SYMPTOMS = ["fever", "bukhar", "cough", "khansi", "pain", "dard"]

def extract_symptoms(text):
    found = []
    for word in SYMPTOMS:
        if word in text:
            found.append(word)
    return list(set(found))
```

---

### 8.2 Duration Detection

```python
def extract_duration(text):
    if "2 din" in text or "2 days" in text:
        return "2 days"
    return None
```

---

### 8.3 Vitals Extraction

```python
def extract_vitals(text):
    vitals = []

    if "bp" in text:
        vitals.append("BP mentioned")

    if "temperature" in text or "fever" in text:
        vitals.append("Fever")

    return vitals
```

---

## 9. Optional NLP Layer (Local Only)

### Tool:

* spaCy (lightweight NLP)

```bash
pip install spacy
python -m spacy download en_core_web_sm
```

### Usage:

* Sentence parsing
* Named entity recognition
* Improved extraction accuracy

---

## 10. Structured Data Output

```python
def build_structured_data(conversation):
    full_text = " ".join([c["text"] for c in conversation])
    full_text = clean_text(full_text)

    return {
        "symptoms": extract_symptoms(full_text),
        "duration": extract_duration(full_text),
        "vitals": extract_vitals(full_text),
        "notes": full_text
    }
```

---

## 11. Mapping to Database Schema

Convert extracted data into your dynamic prescription system.

```python
def map_to_fields(structured, template_fields):
    result = []

    for field in template_fields:
        if field["field_key"] == "symptoms":
            result.append({
                "field_id": field["id"],
                "value": structured["symptoms"]
            })

        if field["field_key"] == "notes":
            result.append({
                "field_id": field["id"],
                "value": structured["notes"]
            })

    return result
```

---

## 12. API Design (FastAPI)

### Endpoint:

```
POST /ai-prescription
```

### Implementation:

```python
from fastapi import FastAPI, UploadFile

app = FastAPI()

@app.post("/ai-prescription")
async def generate(file: UploadFile):

    with open("audio.wav", "wb") as f:
        f.write(await file.read())

    result = model.transcribe("audio.wav")

    conversation = assign_speakers(result["segments"])

    structured = build_structured_data(conversation)

    return {
        "transcript": result["text"],
        "structured": structured
    }

---

## 12.1 Next.js API Route (Bridge)

```
POST /api/ai/prescribe
```

Form data:

- audio: file
- appointmentId: string
- transcript: optional string override

Environment:

```
AI_TRANSCRIBE_URL=http://localhost:8001/transcribe
```
```

---

## 13. Frontend Workflow

1. Click "Start Recording"
2. Record doctor-patient conversation
3. Upload audio
4. Display:

   * Transcript
   * Extracted data
5. Auto-fill prescription form
6. Doctor edits
7. Save final prescription

---

## 13.1 Appointment-Level AI Route

The AI-assisted flow is anchored to the appointment context so the draft always stays
linked to the patient and visit record.

Route shape:

```
/dashboard/doctor/ai/{appointmentId}/prescribe/ai
```

Entry point:

* From appointment details: `AI Prescribe` button
* Returns to: `/dashboard/doctor/appointments/{appointmentId}/prescribe`

UI blocks for MVP:

1. Appointment summary (patient + visit metadata)
2. Audio capture / upload
3. Transcript preview
4. Extracted JSON preview (editable)
5. Draft prescription preview

---

## 14. What the System Generates

### Automatically:

* Symptoms
* Notes
* Basic findings
* Vitals (if detected)

### Not Automatically:

* Medicines
* Diagnosis
* Tests

Doctor remains fully in control.

---

## 15. Advantages of Hybrid Approach

* No dependency on paid APIs
* Full data privacy (local processing)
* Faster execution
* Predictable outputs
* Easier debugging
* Scalable architecture

---

## 16. Limitations (MVP Reality)

* Speaker detection is approximate
* Hindi slang may reduce accuracy
* No deep medical reasoning
* Rule-based extraction is limited

---

## 17. Future Improvements

* Replace rule engine with ML model
* Add proper speaker diarization
* Integrate medicine suggestions
* Train domain-specific models
* Add voice commands for fields

---

## 18. Final Summary

This system transforms raw conversation into structured medical input using:

* Local speech-to-text
* Lightweight speaker detection
* Rule-based extraction
* Dynamic schema mapping

It ensures:

> **Efficiency for doctors, flexibility for the system, and safety for patients.**

The system is not an AI doctor—it is an **AI-powered assistant for structured documentation**.
