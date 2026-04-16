# AI Speech-to-Text Service

Minimal FastAPI service for local Whisper transcription.

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

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

## Endpoint

- POST /transcribe (multipart form field: file)

## Next.js Integration

Set the following in your environment:

```
AI_TRANSCRIBE_URL=http://localhost:8001/transcribe
```
