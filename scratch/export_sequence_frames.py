import os
import cv2
import yt_dlp

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_DIR = os.path.join(BASE_DIR, "dataset", "Veeshi_Adavu_Suite")
TEMP_VIDEO = os.path.join(BASE_DIR, "scratch", "temp_veeshi.mp4")

os.makedirs(TARGET_DIR, exist_ok=True)
url = "https://www.youtube.com/watch?v=uenOGBFDVnw"

print(f"[EXPORT] Downloading video stream to extract frames for Veeshi_Adavu_Suite...")
ydl_opts = {
    'format': 'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
    'outtmpl': TEMP_VIDEO,
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
    'nocheckcertificate': True,
    'quiet': True
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
except Exception as e:
    print(f"Fallback download: {e}")
    ydl_opts['format'] = 'best'
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

if os.path.exists(TEMP_VIDEO):
    cap = cv2.VideoCapture(TEMP_VIDEO)
    total_f = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, int(fps / 5)) # 5 FPS

    print(f"[EXPORT] Extracting frames into {TARGET_DIR}...")
    f_idx = 0
    saved_cnt = 0
    while True:
        ret, frame = cap.read()
        if not ret: break
        f_idx += 1
        if f_idx % step != 0: continue
        saved_cnt += 1
        img_name = f"frame_{saved_cnt:04d}.jpg"
        cv2.imwrite(os.path.join(TARGET_DIR, img_name), frame)
        if saved_cnt >= 180: break
    cap.release()

    try:
        os.remove(TEMP_VIDEO)
    except Exception: pass

    print(f"✅ SUCCESS! Created folder '{TARGET_DIR}' with {saved_cnt} extracted JPEG images!")
else:
    print("❌ Failed to download video stream.")
