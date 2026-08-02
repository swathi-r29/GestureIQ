import os
import cv2
import yt_dlp

URL = "https://youtube.com/shorts/gbdlTwTIjj0?si=gQxf7EqDIzzUsOTq"
OUTPUT_DIR = r"D:\GestureIQ\dataset\25-07-2026_shorts"
TEMP_VIDEO = r"D:\GestureIQ\scratch\temp_video_shorts.mp4"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_VIDEO), exist_ok=True)

if os.path.exists(TEMP_VIDEO):
    try:
        os.remove(TEMP_VIDEO)
    except Exception:
        pass

print(f"Downloading video from {URL} ...")
ydl_opts = {
    'format': 'b',  # Single pre-merged format (does not require ffmpeg)
    'outtmpl': TEMP_VIDEO,
    'quiet': False
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([URL])

print(f"\nVideo downloaded successfully to {TEMP_VIDEO}")

cap = cv2.VideoCapture(TEMP_VIDEO)
if not cap.isOpened():
    print("Error: Could not open video file.")
    exit(1)

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
print(f"Total Video Frames: {total_frames}, FPS: {fps:.2f}")

frame_count = 0
saved_count = 0

print(f"Extracting frames into {OUTPUT_DIR} ...")
while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    filename = os.path.join(OUTPUT_DIR, f"frame_{frame_count:05d}.jpg")
    cv2.imwrite(filename, frame)
    saved_count += 1

    if saved_count % 100 == 0 or saved_count == total_frames:
        print(f"Saved {saved_count}/{total_frames} frames...")

cap.release()

try:
    if os.path.exists(TEMP_VIDEO):
        os.remove(TEMP_VIDEO)
except Exception:
    pass

print(f"\n[SUCCESS] Saved {saved_count} frames to {OUTPUT_DIR}")
