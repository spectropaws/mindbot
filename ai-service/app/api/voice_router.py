"""
voice_router.py
FastAPI router for the /voice/transcribe endpoint.
Uses OpenAI Whisper (local) to transcribe uploaded audio files.
"""
import os
import tempfile
import whisper
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Load the Whisper model once at startup (lazy singleton)
_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        # 'base' model: ~74M params — good accuracy, fits in 4GB VRAM
        _whisper_model = whisper.load_model("base")
    return _whisper_model


class TranscriptResponse(BaseModel):
    transcript: str


@router.post("/voice/transcribe", response_model=TranscriptResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts an audio file (webm/wav/mp3 etc.) and returns its transcription
    using OpenAI Whisper running locally.
    """
    # Determine extension — browsers typically record as webm
    original_name = file.filename or "audio.webm"
    suffix = os.path.splitext(original_name)[1] or ".webm"

    tmp_path = None
    try:
        # Write uploaded bytes to a temp file so Whisper can read it
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        model = get_whisper_model()
        result = model.transcribe(tmp_path)
        transcript = result.get("text", "").strip()

        if not transcript:
            raise HTTPException(status_code=422, detail="Could not extract any speech from the audio.")

        return TranscriptResponse(transcript=transcript)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
