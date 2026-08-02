import os
import sys
import argparse
import subprocess
import numpy as np
import cv2
import mediapipe as mp

try:
    from skimage.metrics import structural_similarity as ssim
except ImportError:
    ssim = None

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Default reference videos provided by the user
DEFAULT_VIDEOS = {
    "Alarippu": "https://youtu.be/qmlMspToIpc?si=rfTPqdQ4C7QtS1e6",
    "Pushpanjali": "https://youtu.be/gKCzcTHyzKc?si=f_vzJOfTug_9Ibt6"
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RAW_VIDEOS_DIR = os.path.join(DATASET_DIR, "raw_reference_videos")

def download_youtube_video(url: str, output_name: str) -> str:
    """Downloads YouTube video using yt-dlp into RAW_VIDEOS_DIR if not already present."""
    os.makedirs(RAW_VIDEOS_DIR, exist_ok=True)
    target_path = os.path.join(RAW_VIDEOS_DIR, f"{output_name}.mp4")

    if os.path.exists(target_path):
        print(f"  [INFO] Found existing video file at {target_path}")
        return target_path

    print(f"  [DOWNLOAD] Downloading video from YouTube: {url}")
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-f", "mp4/bestvideo+bestaudio/best",
        "-o", target_path,
        url
    ]
    try:
        res = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print(f"  [OK] Download complete: {target_path}")
        return target_path
    except Exception as e:
        print(f"  [WARN] Direct yt-dlp execution failed or yt-dlp not installed via module: {e}")
        # Try fallback using yt-dlp executable directly
        cmd_fallback = ["yt-dlp", "-f", "mp4/bestvideo+bestaudio/best", "-o", target_path, url]
        try:
            subprocess.run(cmd_fallback, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            print(f"  [OK] Download complete via yt-dlp CLI: {target_path}")
            return target_path
        except Exception as err:
            print(f"  [FAIL] Failed to download video {url}: {err}")
            return None

def is_blurry(gray_frame, blur_threshold=45.0) -> tuple:
    """Calculates Laplacian variance to detect blurriness."""
    var = cv2.Laplacian(gray_frame, cv2.CV_64F).var()
    return var < blur_threshold, var

def check_pose_visibility(rgb_frame, pose_detector) -> tuple:
    """
    Checks whether dancer posture key landmarks (shoulders, hips, knees, ankles)
    are present and clearly visible.
    """
    results = pose_detector.process(rgb_frame)
    if not results.pose_landmarks:
        return False, 0.0

    landmarks = results.pose_landmarks.landmark
    # Key posture landmarks: Shoulders (11, 12), Hips (23, 24), Knees (25, 26), Ankles (27, 28)
    key_indices = [11, 12, 23, 24, 25, 26, 27, 28]
    visibilities = [landmarks[i].visibility for i in key_indices]
    avg_visibility = float(np.mean(visibilities))

    # Dancer is considered visible if key landmarks have average visibility >= 0.45
    return avg_visibility >= 0.45, avg_visibility

def is_duplicate_ssim(gray_frame, last_saved_gray_resized, ssim_threshold=0.92) -> tuple:
    """Checks structural similarity (SSIM) against the last accepted reference frame."""
    if last_saved_gray_resized is None:
        return False, 0.0

    resized_current = cv2.resize(gray_frame, (256, 256))
    if ssim is not None:
        score, _ = ssim(resized_current, last_saved_gray_resized, full=True)
    else:
        # Fallback to normalized correlation/absdiff if scikit-image is not installed
        diff = cv2.absdiff(resized_current, last_saved_gray_resized)
        score = 1.0 - (np.mean(diff) / 255.0)

    return score >= ssim_threshold, score

def process_dance_video(video_path: str, dance_name: str, step_interval=5, blur_threshold=45.0, ssim_threshold=0.92):
    """
    Extracts and filters dance sequence frames into dataset/<dance_name>/.
    Preserves dance sequence order (frame_0001.jpg, frame_0002.jpg, ...).
    """
    if not video_path or not os.path.exists(video_path):
        print(f"  [FAIL] Video file does not exist: {video_path}")
        return

    output_dir = os.path.join(DATASET_DIR, dance_name)
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n==================================================")
    print(f"  Processing Dance Sequence: {dance_name}")
    print(f"  Source Video: {video_path}")
    print(f"  Output Directory: {output_dir}")
    print(f"==================================================")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  [FAIL] Failed to open video: {video_path}")
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(f"  Total frames: {total_frames} | FPS: {fps:.2f}")

    mp_pose = mp.solutions.pose
    pose_detector = mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.5
    )

    frame_idx = 0
    sampled_count = 0
    saved_count = 0

    stats = {
        "low_brightness": 0,
        "blurry": 0,
        "no_pose": 0,
        "duplicate": 0
    }

    last_saved_gray_resized = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1

        # Step 1: Sub-sample every N frames
        if frame_idx % step_interval != 0:
            continue

        sampled_count += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Step 2: Brightness Filter (skip completely black intro/transition frames)
        if gray.mean() < 2.0 or gray.max() < 35:
            stats["low_brightness"] += 1
            continue

        # Step 3: Blur Filter
        blurry, lap_var = is_blurry(gray, blur_threshold=blur_threshold)
        if blurry:
            stats["blurry"] += 1
            continue

        # Step 4: MediaPipe Posture Visibility Check
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pose_ok, avg_vis = check_pose_visibility(rgb, pose_detector)
        if not pose_ok:
            stats["no_pose"] += 1
            continue

        # Step 5: Near-Identical Frame Duplicate Filter (SSIM)
        duplicate, ssim_score = is_duplicate_ssim(gray, last_saved_gray_resized, ssim_threshold=ssim_threshold)
        if duplicate:
            stats["duplicate"] += 1
            continue

        # Accept Frame & Save in Sequence
        saved_count += 1
        frame_name = f"frame_{saved_count:04d}.jpg"
        save_path = os.path.join(output_dir, frame_name)
        cv2.imwrite(save_path, frame)

        # Update last saved reference frame
        last_saved_gray_resized = cv2.resize(gray, (256, 256))

        if saved_count % 20 == 0 or saved_count == 1:
            print(f"  Saved [{saved_count:04d}]: {frame_name} (LapVar: {lap_var:.1f}, PoseVis: {avg_vis:.2f}, SSIM: {ssim_score:.2f})")

    cap.release()
    pose_detector.close()

    print(f"\n[SUMMARY] Extraction Summary for {dance_name}:")
    print(f"  - Total frames in video : {total_frames}")
    print(f"  - Sampled frames        : {sampled_count}")
    print(f"  - Filtered (Low Light)  : {stats['low_brightness']}")
    print(f"  - Filtered (Blurry)     : {stats['blurry']}")
    print(f"  - Filtered (No Pose)    : {stats['no_pose']}")
    print(f"  - Filtered (Duplicates) : {stats['duplicate']}")
    print(f"  - [OK] Saved Clean Frames : {saved_count} -> {output_dir}\n")

def main():
    parser = argparse.ArgumentParser(description="GestureIQ - Reference Dance Frame Extraction Pipeline")
    parser.add_argument("--alarippu_url", type=str, default=DEFAULT_VIDEOS["Alarippu"], help="YouTube URL or local path for Alarippu")
    parser.add_argument("--pushpanjali_url", type=str, default=DEFAULT_VIDEOS["Pushpanjali"], help="YouTube URL or local path for Pushpanjali")
    parser.add_argument("--jatiswaram_path", type=str, default=None, help="YouTube URL or local video path for Jatiswaram")
    parser.add_argument("--video4_path", type=str, default=None, help="YouTube URL or local video path for Video4")
    parser.add_argument("--step", type=int, default=5, help="Frame step interval (default: 5)")
    parser.add_argument("--blur_thresh", type=float, default=45.0, help="Laplacian variance threshold for blur detection (default: 45.0)")
    parser.add_argument("--ssim_thresh", type=float, default=0.92, help="SSIM threshold for duplicate detection (default: 0.92)")
    args = parser.parse_args()

    videos_to_process = {
        "Alarippu": args.alarippu_url,
        "Pushpanjali": args.pushpanjali_url,
    }
    if args.jatiswaram_path:
        videos_to_process["Jatiswaram"] = args.jatiswaram_path
    if args.video4_path:
        videos_to_process["Video4"] = args.video4_path

    print("Starting GestureIQ Reference Dance Frame Extraction Pipeline...")
    os.makedirs(DATASET_DIR, exist_ok=True)

    for dance_name, source in videos_to_process.items():
        if source.startswith("http://") or source.startswith("https://") or "youtu" in source:
            video_path = download_youtube_video(source, dance_name)
        else:
            video_path = source

        if video_path and os.path.exists(video_path):
            process_dance_video(
                video_path,
                dance_name,
                step_interval=args.step,
                blur_threshold=args.blur_thresh,
                ssim_threshold=args.ssim_thresh
            )
        else:
            print(f"  [WARN] Skipping {dance_name}: source video unavailable.")

    print("\nAll reference dance video datasets processed successfully!")

if __name__ == "__main__":
    main()
