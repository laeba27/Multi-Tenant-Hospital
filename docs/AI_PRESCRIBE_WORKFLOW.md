# AI Prescribe Workflow

This document explains how the AI Prescribe feature works across the frontend and backend.

## Frontend flow

Entry point
- UI: [src/components/ai/AiPrescribePanel.jsx](../src/components/ai/AiPrescribePanel.jsx)
- Route: /dashboard/doctor/ai/[id]/prescribe/ai

User steps
1. Record one or more audio clips or upload multiple audio files.
2. Transcribe individual clips or transcribe all clips at once.
3. Combine transcripts and extract fields into a structured draft.
4. Review and edit the combined transcript or the structured draft JSON.
5. Save the structured draft to the database.

Frontend behaviors
- Each recording is stored in memory as a clip with its own transcript.
- "Transcribe clip" sends the clip to the Next.js API route for transcription.
- "Transcribe all recordings" loops through clips that do not have transcripts yet.
- "Combine & extract" concatenates all clip transcripts and runs the extraction rules.
- "Re-extract fields" re-runs extraction using the current transcript text area.
- "Save as Draft" creates a draft prescription in Supabase.

## Backend flow

Transcription API (Next.js)
- Route: [src/app/api/ai/prescribe/route.js](../src/app/api/ai/prescribe/route.js)
- Input: multipart form data with audio and appointmentId
- Behavior:
  - Forwards audio to the Python Whisper service
  - Receives transcript text
  - Runs rule-based extraction
  - Returns transcript and structured draft

Draft save API (Next.js)
- Route: [src/app/api/ai/prescribe/save/route.js](../src/app/api/ai/prescribe/save/route.js)
- Input: JSON payload with appointmentId, transcript, structured
- Behavior:
  - Resolves doctor, appointment, and patient context
  - Inserts a prescription draft and audit log
  - Writes structured values into prescription_values
  - Returns the new prescription ID

Whisper transcription service (Python)
- Service: backend/ai_service/main.py
- Endpoint: POST /transcribe
- Input: multipart form data with an audio file
- Output: transcript text

## Data extraction

Extraction logic
- Module: src/lib/ai/extraction.js
- Strategy: rule-based parsing of symptoms, vitals, durations, and other fields
- Output: structured draft JSON for mapping into prescription template sections

## Environment configuration

Required environment variable
- AI_TRANSCRIBE_URL=http://localhost:8001/transcribe

## Known limitations

- Extraction quality depends on transcript accuracy
- Long or noisy audio may reduce transcription quality
- Multiple speakers are not separated; all text is merged

## Testing tips

- Start both the Next.js app and the Python service
- Use short, clear audio clips for reliable transcription
- Combine clips, then re-extract if you edit the transcript
