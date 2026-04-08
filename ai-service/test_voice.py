import io
import os
import tempfile
import whisper
import traceback

def test_transcribe():
    try:
        # Create a dummy audio file using ffmpeg (a 1 second beep)
        print("Generating dummy audio.webm...")
        os.system("ffmpeg -y -f lavfi -i sine=frequency=1000:duration=1 -acodec libopus audio.webm")
        
        print("Loading model...")
        model = whisper.load_model("base")
        print("Model loaded. Transcribing...")
        
        result = model.transcribe("audio.webm")
        print("Transcript:", result.get("text", ""))
        
    except Exception as e:
        print("ERROR:", str(e))
        traceback.print_exc()

if __name__ == "__main__":
    test_transcribe()
