import cv2
import os
import pytesseract
from PIL import Image
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Extended aliases covering all spelling variations
RASA_ALIASES = {
    # hasya
    "hasya": "hasya", "haasya": "hasya", "hAsya": "hasya",
    # karuna
    "karuna": "karuna", "karunaa": "karuna", "karUna": "karuna",
    # raudra
    "raudra": "raudra", "roudra": "raudra", "rudra": "raudra",
    # vira
    "vira": "vira", "veera": "vira", "vIra": "vira",
    # bhayanaka
    "bhayanaka": "bhayanaka", "bhayanak": "bhayanaka",
    "bhayanaka": "bhayanaka", "bhayanaka": "bhayanaka",
    "bhaya": "bhayanaka",
    # bibhatsa
    "bibhatsa": "bibhatsa", "vibhatsa": "bibhatsa",
    "bibhats": "bibhatsa",
    # adbhuta
    "adbhuta": "adbhuta", "adbuta": "adbhuta", "adhbuta": "adbhuta",
    # shanta
    "shanta": "shanta", "santa": "shanta", "saanta": "shanta",
    "shAnta": "shanta",
    # shringara
    "shringara": "shringara", "sringara": "shringara",
    "srungara": "shringara", "shrungara": "shringara",
    "shringaram": "shringara",
}

VIDEO_FOLDER  = "D:/GestureIQ/dataset/navarasa/raw_videos"
FRAMES_FOLDER = "D:/GestureIQ/dataset/navarasa/frames"

def detect_rasa_from_frame(frame):
    """Try reading rasa name from multiple regions of frame."""
    h, w = frame.shape[:2]
    
    regions = [
        frame,                          # full frame
        frame[0:h//3, :],              # top third
        frame[h//3:2*h//3, :],        # middle third
        frame[2*h//3:h, :],           # bottom third
        frame[h//4:3*h//4, w//4:3*w//4],  # center crop
    ]
    
    for region in regions:
        # Try normal
        pil = Image.fromarray(cv2.cvtColor(region, cv2.COLOR_BGR2RGB))
        text = pytesseract.image_to_string(pil).lower().strip()
        
        # Try with white text enhancement
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
        pil2 = Image.fromarray(thresh)
        text2 = pytesseract.image_to_string(pil2).lower().strip()
        
        for text_to_check in [text, text2]:
            for word in text_to_check.split():
                clean = word.strip(".,!?:;-_()[]")
                if clean in RASA_ALIASES:
                    return RASA_ALIASES[clean]
                # Partial match for long words
                for alias in RASA_ALIASES:
                    if alias in clean or clean in alias:
                        if len(clean) >= 4:
                            return RASA_ALIASES[alias]
    return None

def extract_frames():
    videos = [f for f in os.listdir(VIDEO_FOLDER) if f.endswith(".mp4")]
    print(f"Found {len(videos)} videos")

    for video_file in videos:
        video_path = os.path.join(VIDEO_FOLDER, video_file)
        cap = cv2.VideoCapture(video_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"\nProcessing: {video_file} | Total frames: {total}")

        frame_count  = 0
        saved_count  = 0
        current_rasa = None

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1

            # Check every 8th frame for rasa name
            if frame_count % 8 == 0:
                detected = detect_rasa_from_frame(frame)
                if detected:
                    if detected != current_rasa:
                        print(f"  Frame {frame_count}: Switched to → {detected}")
                    current_rasa = detected

            # Save every 5th frame when rasa is known
            if current_rasa and frame_count % 5 == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                brightness = gray.mean()
                
                # Skip black title card frames
                if brightness < 25:
                    continue

                save_dir  = os.path.join(FRAMES_FOLDER, current_rasa)
                save_path = os.path.join(save_dir,
                            f"{video_file}_{frame_count:05d}.jpg")
                cv2.imwrite(save_path, frame)
                saved_count += 1

        cap.release()
        print(f"  Saved {saved_count} frames")

    # Final count
    print("\n=== FINAL FRAMES PER RASA ===")
    rasas = ["hasya","karuna","raudra","vira","bhayanaka",
             "bibhatsa","adbhuta","shanta","shringara"]
    total = 0
    for rasa in rasas:
        folder = os.path.join(FRAMES_FOLDER, rasa)
        count  = len(os.listdir(folder)) if os.path.exists(folder) else 0
        total += count
        status = "✅ OK" if count >= 100 else "⚠️ NEED MORE"
        print(f"  {rasa:12s}: {count:4d} frames  {status}")
    print(f"\n  Total: {total} frames")

if __name__ == "__main__":
    extract_frames()