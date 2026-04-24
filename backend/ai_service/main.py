from __future__ import annotations

import os
import tempfile
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import whisper

try:
    from structurer import PrescriptionStructurer, StructurerNotReadyError
    _STRUCTURER_IMPORT_ERROR: Optional[str] = None
except Exception as error:
    PrescriptionStructurer = None  # type: ignore[assignment]

    class StructurerNotReadyError(RuntimeError):
        pass

    _STRUCTURER_IMPORT_ERROR = str(error)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
model = whisper.load_model(WHISPER_MODEL_NAME)


class StructureRequest(BaseModel):
    text: str


if PrescriptionStructurer is None:
    structurer = None
else:
    try:
        structurer = PrescriptionStructurer(
            model_name_or_path=os.getenv("AI_STRUCTURE_MODEL", "google/flan-t5-base")
        )
    except Exception as error:
        structurer = None
        _STRUCTURER_IMPORT_ERROR = str(error)


@app.get("/health")
async def health_check():
    return {
        "ok": True,
        "whisper_model": WHISPER_MODEL_NAME,
        "structurer_ready": structurer is not None,
        "structurer_error": _STRUCTURER_IMPORT_ERROR,
    }


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    result = model.transcribe(temp_path)

    return {
        "text": result.get("text", ""),
        "segments": result.get("segments", []),
    }


@app.post("/structure")
async def structure_text(payload: StructureRequest):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Missing text")

    if structurer is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Structurer model is not ready. Install transformer dependencies and provide "
                "a valid AI_STRUCTURE_MODEL."
            ),
        )

    try:
        structured, meta = structurer.structure_text(payload.text)
    except StructurerNotReadyError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to structure text: {error}") from error

    return {
        "structured": structured,
        "meta": meta,
    }
