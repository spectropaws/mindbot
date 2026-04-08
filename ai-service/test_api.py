import requests

# Post local audio.webm to FastAPI server
print("Testing /voice/transcribe API directly...")
try:
    with open("audio.webm", "rb") as f:
        response = requests.post("http://127.0.0.1:8000/voice/transcribe", files={"file": f})
    print("STATUS CODE:", response.status_code)
    print("RESPONSE BODY:", response.text)
except Exception as e:
    print("Failed to call API:", e)
