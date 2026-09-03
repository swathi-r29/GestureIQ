"""
notebooks/ingest_youtube_reference.py
One-Command YouTube Reference Ingestion & Benchmark Extractor for GestureIQ

Usage:
  python notebooks/ingest_youtube_reference.py --url "https://www.youtube.com/watch?v=XXXX" --name "Alarippu" [--fps 5]
"""

import os
import sys
import argparse
import json
import cv2
import yt_dlp
import numpy as np
import mediapipe as mp

# Add parent directory for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.pose_feature_engineering import normalize_landmarks, extract_body_angles

# Reconfigure stdout for Windows console UTF-8 support
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_SEQ_DIR = os.path.join(BASE_DIR, "dataset", "reference_sequences")
RAW_VIDEO_DIR = os.path.join(BASE_DIR, "dataset", "raw_reference_videos")
TEMP_DIR = os.path.join(BASE_DIR, "scratch", "temp_ingest")


def ingest_youtube_dance(url, dance_name, sample_fps=5):
    print("=========================================================")
    print(f"  GestureIQ - Reference Sequence Ingestion: {dance_name}")
    print("=========================================================")

    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(REF_SEQ_DIR, exist_ok=True)
    os.makedirs(RAW_VIDEO_DIR, exist_ok=True)

    # Check for local video fallback first
    local_video_path = os.path.join(RAW_VIDEO_DIR, f"{dance_name}.mp4")
    temp_video_path = os.path.join(TEMP_DIR, f"{dance_name}_temp.mp4")

    target_video_file = None

    if os.path.exists(local_video_path):
        print(f"📌 Found existing local reference video: {local_video_path}")
        target_video_file = local_video_path
    elif url:
        print(f"[1/4] Downloading video from {url}...")
        ydl_opts = {
            'format': 'best[ext=mp4]/bestvideo+bestaudio/best',
            'outtmpl': temp_video_path,
            'nocheckcertificate': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['mweb', 'android']
                }
            },
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'quiet': False
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            target_video_file = temp_video_path
        except Exception as e:
            print(f"⚠️ YouTube download attempt 1 error: {e}")
            try:
                fallback_opts = {
                    'format': 'b[ext=mp4]/b',
                    'outtmpl': temp_video_path,
                    'nocheckcertificate': True,
                    'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'extractor_args': {'youtube': {'player_client': ['ios', 'mweb']}}
                }
                with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                    ydl.download([url])
                target_video_file = temp_video_path
            except Exception as e2:
                print(f"❌ YouTube download failed: {e2}")

    if not target_video_file or not os.path.exists(target_video_file):
        print("❌ Error: No valid video source available to extract landmarks.")
        return False

    print(f"\n[2/4] Opening video file: {target_video_file}")
    cap = cv2.VideoCapture(target_video_file)
    if not cap.isOpened():
        print("❌ Error: Unable to open downloaded video.")
        return False

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_interval = max(1, int(video_fps / sample_fps))

    print(f"  Total Video Frames: {total_frames} | Video FPS: {video_fps:.2f} | Sampling Interval: every {frame_interval} frames ({sample_fps} FPS)")

    print("\n[3/4] Extracting 3D Pose Landmarks & Anatomical Angles...")
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, min_detection_confidence=0.5)

    sequence_data = []
    frame_idx = 0
    sampled_count = 0
    prev_angles = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % frame_interval != 0:
            continue

        sampled_count += 1
        timestamp_sec = round(frame_idx / video_fps, 2)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        is_keyframe = False
        keyframe_label = None
        angular_velocity = 0.0

        if res.pose_landmarks:
            norm_coords = normalize_landmarks(res.pose_landmarks)
            norm_coords_list = norm_coords.tolist() if norm_coords is not None else None
            angles = extract_body_angles(norm_coords)
            raw_landmarks = [[lm.x, lm.y, lm.z, lm.visibility] for lm in res.pose_landmarks.landmark]

            if angles and prev_angles:
                delta_lk = abs(angles.get("left_knee", 180) - prev_angles.get("left_knee", 180))
                delta_rk = abs(angles.get("right_knee", 180) - prev_angles.get("right_knee", 180))
                delta_le = abs(angles.get("left_elbow", 180) - prev_angles.get("left_elbow", 180))
                delta_re = abs(angles.get("right_elbow", 180) - prev_angles.get("right_elbow", 180))
                angular_velocity = round(delta_lk + delta_rk + delta_le + delta_re, 1)

                if angular_velocity <= 8.0:
                    is_keyframe = True
                    stance = angles.get("detected_stance", "Pose Stance")
                    keyframe_label = f"{stance} Hold Peak"

            prev_angles = angles
        else:
            norm_coords_list = None
            angles = None
            raw_landmarks = None

        sequence_data.append({
            "step_index": sampled_count - 1,
            "frame_idx": frame_idx,
            "timestamp_sec": timestamp_sec,
            "has_landmarks": norm_coords_list is not None,
            "angular_velocity": angular_velocity,
            "is_keyframe": is_keyframe,
            "keyframe_label": keyframe_label,
            "normalized_pose": norm_coords_list,
            "angles": angles,
            "raw_landmarks": raw_landmarks
        })

        if sampled_count % 20 == 0:
            print(f"  Processed {sampled_count} sampled frames ({timestamp_sec:.1f}s)...")

    cap.release()
    pose.close()

    # Clean up temp video file
    try:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
    except Exception:
        pass

    keyframe_count = sum(1 for item in sequence_data if item.get("is_keyframe"))

    # Save benchmark JSON
    out_file = os.path.join(REF_SEQ_DIR, f"{dance_name}_sequence.json")
    with open(out_file, "w") as f:
        json.dump({
            "dance_name": dance_name,
            "source_url": url,
            "total_sampled_frames": len(sequence_data),
            "valid_pose_frames": sum(1 for item in sequence_data if item["has_landmarks"]),
            "keyframe_count": keyframe_count,
            "sample_fps": sample_fps,
            "sequence": sequence_data
        }, f, indent=2)

    print(f"\n✅ [4/4] SUCCESS! Benchmark reference sequence created:")
    print(f"     Target File: {out_file}")
    print(f"     Valid Pose Frames: {sum(1 for item in sequence_data if item['has_landmarks'])} / {len(sequence_data)}")
    print(f"     Keyframe Holds Tagged: {keyframe_count}")
    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Ingest reference video to generate GestureIQ reference pose sequence.")
    parser.add_argument("--url", type=str, default="", help="YouTube Video URL (optional if local video exists in dataset/raw_reference_videos/)")
    parser.add_argument("--name", type=str, required=True, help="Dance Item Name (e.g. Alarippu)")
    parser.add_argument("--fps", type=int, default=5, help="Sampling rate in frames per second (default: 5)")
    args = parser.parse_args()

    ingest_youtube_dance(args.url, args.name, args.fps)
