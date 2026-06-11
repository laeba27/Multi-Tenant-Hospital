# Project Features and AI Flow

## Overview

This project is a hospital and clinic management system built with Next.js on the frontend and Supabase for authentication and data storage. It covers appointment handling, patient records, prescriptions, invoices, staff administration, and an AI-assisted prescription drafting flow for doctors.

The main goal of the system is to help clinical teams manage day-to-day operations in one place while reducing manual work during consultation and prescription writing.

## Main Product Features

### 1. Public Landing Experience

The landing page introduces the platform, shows the main value proposition, and provides entry points for hospital registration and sign-in.

### 2. Authentication and Access Control

The app uses role-based access patterns for different user types such as doctors, staff, and administrators. This keeps hospital data and workflows separated by permissions.

### 3. Dashboard and Operations

The dashboard area is the working center of the app. It groups features for:

- appointments
- patients
- prescriptions
- invoices
- staff records
- departments
- super-admin and hospital approval flows

### 4. Appointment Workflow

Doctors can open an appointment, view patient details, and move into prescription writing. The appointment detail screen includes a direct shortcut into the AI-assisted prescription flow.

### 5. Prescription Management

Prescription creation is supported in two ways:

- a manual prescription composer for normal editing
- an AI-assisted prescription draft flow for audio-based consultation capture

### 6. Billing and Reporting

The project also includes invoice and dashboard-stat features so the clinic can track operational and financial activity.

## AI Feature: What It Does

The current AI feature is designed to turn consultation audio into a structured prescription draft.

It does three things:

1. records or uploads consultation audio
2. transcribes the audio into text
3. converts the transcript into structured prescription fields

This is not a general LLM chatbot flow. The system currently uses speech-to-text plus rule-based extraction logic to produce a structured draft.

## AI Flow End to End

### Step 1: Doctor Opens AI Assist

From the appointment details screen, the doctor can click the AI Assist button and open the AI prescription page for that appointment.

### Step 2: Audio Capture or Upload

In the AI panel, the doctor can:

- record consultation audio from the microphone
- upload one or more audio files

Each clip is stored separately so a consultation can be split into multiple recordings if needed.

### Step 3: Transcription

When the doctor clicks Transcribe clip or Transcribe all recordings, the frontend sends the audio file to the Next.js API route.

That API route forwards the file to the Python transcription service, which loads a Whisper model and returns the transcript text.

### Step 4: Transcript Review

The transcripts from all clips can be combined into one text area. The doctor can edit the transcript before extraction if the speech recognition output needs correction.

### Step 5: Structured Extraction

The transcript is passed through extraction logic that looks for clinical patterns such as:

- symptoms and complaints
- vitals such as blood pressure, pulse, and temperature
- diagnosis text
- treatment references
- prescribed medicines
- examination findings

The result is a structured JSON draft that maps to prescription sections.

### Step 6: Save Draft

When the doctor saves the draft, the app writes a prescription record into Supabase and also stores the extracted values in the prescription-values table. An audit log entry is also created.

## AI Architecture

### Frontend

The AI prescription panel handles:

- microphone recording
- file upload
- transcript merging
- draft re-extraction
- saving the final draft

### Next.js API Layer

The route at `src/app/api/ai/prescribe/route.js` handles transcription orchestration. It accepts audio or a manual transcript override, calls the Python service when needed, and returns both the transcript and structured draft.

The route at `src/app/api/ai/prescribe/save/route.js` stores the final draft in Supabase after validating the doctor, appointment, and patient context.

### Python Transcription Service

The service in `backend/ai_service/main.py` exposes a `/transcribe` endpoint. It loads OpenAI Whisper with the `base` model and returns the text result for the uploaded audio.

### Extraction Logic

The module `src/lib/ai/extraction.js` performs the structured parsing. It is rule-based and uses keyword matching, normalization, and pattern extraction instead of an LLM prompt chain.

## Data Flow Summary

1. Appointment details page opens the AI Assist link.
2. The doctor records or uploads audio.
3. The frontend posts audio to `/api/ai/prescribe`.
4. The Next.js route forwards the file to the Python Whisper service.
5. Whisper returns raw transcript text.
6. The extraction module converts the transcript into structured prescription data.
7. The doctor reviews or edits the transcript and structured draft.
8. The final draft is saved into Supabase through `/api/ai/prescribe/save`.

## Where AI Is Used

The project uses AI in the following way:

- speech-to-text transcription through Whisper
- clinical field extraction from transcript text through deterministic parsing rules

## Where an LLM Is Not Yet Used

There is no visible large language model prompt/response workflow in the current implementation. The system does not appear to call a chat model to generate the draft. Instead, it relies on:

- Whisper for transcription
- JavaScript extraction rules for structuring the prescription

If you want true LLM-based drafting later, the best place to add it would be the extraction step, where the transcript is already available and the app has the appointment context.

## Important Environment Setting

The Next.js app expects the transcription service URL in:

- `AI_TRANSCRIBE_URL=http://localhost:8001/transcribe`

## Current Limitations

- transcription quality depends on the audio quality
- noisy consultations may produce incomplete text
- the extraction logic is rule-based, so it can miss unusual phrasing
- multiple speakers are merged into one transcript

## Key Files

- `src/components/ai/AiPrescribePanel.jsx`
- `src/app/dashboard/doctor/ai/[id]/prescribe/ai/page.js`
- `src/app/api/ai/prescribe/route.js`
- `src/app/api/ai/prescribe/save/route.js`
- `src/lib/ai/extraction.js`
- `backend/ai_service/main.py`

## Suggested Reading Order

If you are new to the codebase, read the files in this order:

1. `src/app/dashboard/doctor/appointments/AppointmentDetailsView.jsx`
2. `src/app/dashboard/doctor/ai/[id]/prescribe/ai/page.js`
3. `src/components/ai/AiPrescribePanel.jsx`
4. `src/app/api/ai/prescribe/route.js`
5. `src/lib/ai/extraction.js`
6. `src/app/api/ai/prescribe/save/route.js`
7. `backend/ai_service/main.py`

## Short Version

This is a hospital management app where AI is used mainly to help doctors turn consultation audio into a draft prescription. The AI layer is currently Whisper-based transcription plus rule-based extraction, not a full LLM generation pipeline.