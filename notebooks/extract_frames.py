import os
import sys
import cv2

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RAW_VIDEO_DIR = os.path.join(DATASET_DIR, "raw_reference_videos")

def extract_frames_for_all_videos(sample_fps=5):
    dirs_to_check = [RAW_VIDEO_DIR, os.path.join(BASE_DIR, "scratch", "temp_ingest")]
    video_entries = []

    for d in dirs_to_check:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.endswith(".mp4"):
                    item_name = os.path.splitext(f)[0].replace("_temp", "")
                    video_entries.append((item_name, os.path.join(d, f)))

    if not video_entries:
        print("❌ No mp4 videos found.")
        return

    print(f"🎬 Found {len(video_entries)} reference videos to extract frames from:")

    for item_name, video_path in video_entries:
        output_folder = os.path.join(DATASET_DIR, item_name)
        os.makedirs(output_folder, exist_ok=True)

        print(f"\n🎥 Processing '{item_name}' -> {output_folder}")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"⚠️ Could not open {video_path}")
            continue

        video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = max(1, int(video_fps / sample_fps))
        
        frame_idx = 0
        saved_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            if frame_idx % frame_interval != 0:
                continue

            saved_count += 1
            frame_filename = f"frame_{saved_count:04d}.jpg"
            out_file = os.path.join(output_folder, frame_filename)
            cv2.imwrite(out_file, frame)

        cap.release()
        print(f"✅ Extracted {saved_count} JPG image frames into dataset/{item_name}/")

if __name__ == "__main__":
    extract_frames_for_all_videos()
