import os
import json
import cv2
import numpy as np
import mediapipe as mp
import math

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
REF_SEQ_DIR = os.path.join(DATASET_DIR, "reference_sequences")

import sys
import argparse

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.pose_feature_engineering import normalize_landmarks, calculate_angle_3d, extract_body_angles

def process_dance_folder(dance_name):
    folder_path = os.path.join(DATASET_DIR, dance_name)
    if not os.path.exists(folder_path):
        print(f"  [WARN] Directory does not exist: {folder_path}")
        return

    image_files = sorted([f for f in os.listdir(folder_path) if f.endswith(('.jpg', '.png', '.jpeg'))])
    if not image_files:
        print(f"  [WARN] No image frames found in {folder_path}")
        return

    print(f"\n==================================================")
    print(f"  Extracting Landmark Sequences: {dance_name}")
    print(f"  Source Directory: {folder_path} ({len(image_files)} frames)")
    print(f"==================================================")

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

    sequence_data = []

    for idx, img_name in enumerate(image_files):
        img_path = os.path.join(folder_path, img_name)
        img = cv2.imread(img_path)
        if img is None:
            continue

        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        if res.pose_world_landmarks:
            norm_coords = normalize_landmarks(res.pose_world_landmarks)
            angles = extract_body_angles(norm_coords)
            raw_landmarks = [[lm.x, lm.y, lm.z, lm.visibility] for lm in res.pose_landmarks.landmark]
        else:
            norm_coords = None
            angles = None
            raw_landmarks = None

        sequence_data.append({
            "frame_idx": idx + 1,
            "frame_file": img_name,
            "has_landmarks": norm_coords is not None,
            "normalized_pose": norm_coords,
            "angles": angles,
            "raw_landmarks": raw_landmarks
        })

        if (idx + 1) % 50 == 0 or (idx + 1) == len(image_files):
            print(f"  Processed [{idx + 1}/{len(image_files)}] frames...")

    pose.close()

    os.makedirs(REF_SEQ_DIR, exist_ok=True)
    out_file = os.path.join(REF_SEQ_DIR, f"{dance_name}_sequence.json")
    with open(out_file, "w") as f:
        json.dump({
            "dance_name": dance_name,
            "total_frames": len(sequence_data),
            "valid_pose_frames": sum(1 for item in sequence_data if item["has_landmarks"]),
            "sequence": sequence_data
        }, f, indent=2)

    print(f"  [OK] Saved landmark sequence to: {out_file}\n")

def main():
    parser = argparse.ArgumentParser(description="Extract reference pose sequence from image frames.")
    parser.add_argument("--name", type=str, default=None, help="Specific dance folder name (e.g. Alarippu)")
    args = parser.parse_args()

    print("Starting GestureIQ Reference Landmark Extraction...")
    if args.name:
        process_dance_folder(args.name)
    else:
        dance_items = ["Alarippu", "Pushpanjali"]
        for dance in dance_items:
            process_dance_folder(dance)

if __name__ == "__main__":
    main()
