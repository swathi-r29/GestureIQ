from gtts import gTTS
import io

try:
    tts = gTTS(text="Hello world", lang="en")
    mp3_fp = io.BytesIO()
    tts.write_to_fp(mp3_fp)
    print("SUCCESS: gTTS generated audio in memory.")
except Exception as e:
    print(f"FAILED: {e}")
