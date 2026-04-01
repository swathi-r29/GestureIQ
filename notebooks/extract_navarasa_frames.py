import cv2
import os

# All 9 rasa names — OCR will match these
RASAS = [
    "hasya", "karuna", "raudra", "vira", "bhayanaka",
    "bibhatsa", "adbhuta", "shanta", "shringara"
]

# Also handle spelling variations seen in videos
RASA_ALIASES = {
    "haasya": "hasya",
    "hasya":  "hasya",
    "karuna": "karuna",
    "raudra": "raudra",
    "veera":  "vira",
    "vira":   "vira",
    "bhayanaka": "bhayanaka",
    "bibhatsa":  "bibhatsa",
    "adbhuta":   "adbhuta",
    "shanta":    "shanta",
    "shringara": "shringara",
    "srungara":  "shringara",
}

VIDEO_FOLDER  = "D:/GestureIQ/dataset/navarasa/raw_videos"
FRAMES_FOLDER = "D:/GestureIQ/dataset/navarasa/frames"

def extract_frames():
    import pytesseract
    from PIL import Image
    import numpy as np

    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

    # Get all mp4 files directly in raw_videos folder
    videos = [f for f in os.listdir(VIDEO_FOLDER) if f.endswith(".mp4")]
    print(f"Found {len(videos)} videos: {videos}")

    for video_file in videos:
        video_path = os.path.join(VIDEO_FOLDER, video_file)
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"\nProcessing: {video_file} | FPS: {fps:.0f} | Total frames: {total_frames}")

        frame_count   = 0
        saved_count   = 0
        current_rasa  = None

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # Check every 10th frame for performance
            if frame_count % 10 != 0:
                continue

            # Convert to PIL for OCR
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            # Read full frame text
            text = pytesseract.image_to_string(pil_img).lower().strip()

            # Match rasa name from text
            detected_rasa = None
            for word in text.split():
                clean = word.strip().replace(",", "").replace(".", "")
                if clean in RASA_ALIASES:
                    detected_rasa = RASA_ALIASES[clean]
                    break

            if detected_rasa:
                current_rasa = detected_rasa

            # Save frame if we know current rasa AND face is likely visible
            # Skip frames that are mostly black (title card frames)
            if current_rasa:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                mean_brightness = gray.mean()

                # Skip black title card frames (brightness < 30)
                if mean_brightness < 30:
                    continue

                save_dir  = os.path.join(FRAMES_FOLDER, current_rasa)
                save_path = os.path.join(save_dir, f"{video_file}_{frame_count:05d}.jpg")
                cv2.imwrite(save_path, frame)
                saved_count += 1

        cap.release()
        print(f"  Saved {saved_count} frames from {video_file}")

    # Final count per rasa
    print("\n=== FRAMES PER RASA ===")
    total = 0
    for rasa in RASAS:
        folder = os.path.join(FRAMES_FOLDER, rasa)
        count  = len(os.listdir(folder)) if os.path.exists(folder) else 0
        total += count
        status = "✅" if count >= 100 else "⚠️ NEED MORE"
        print(f"  {rasa:12s}: {count:4d} frames  {status}")
    print(f"\n  Total: {total} frames")

if __name__ == "__main__":
    extract_frames()