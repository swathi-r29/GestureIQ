import os
import json
import cv2
import numpy as np
import mediapipe as mp
import math

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
REF_SEQ_DIR = os.path.join(DATASET_DIR, "reference_sequences")

def normalize_landmarks(landmarks):
    """Normalizes 33 pose landmarks relative to hip center and torso length."""
    if not landmarks:
        return None
    
    coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark])
    
    # Hips center (joints 23 & 24)
    hip_center = (coords[23] + coords[24]) / 2.0
    centered = coords - hip_center
    
    # Torso length (distance between hip center and shoulder center 11 & 12)
    shoulder_center = (coords[11] + coords[12]) / 2.0
    torso_length = np.linalg.norm(shoulder_center - hip_center)
    
    if torso_length > 0:
        normalized = centered / torso_length
    else:
        normalized = centered
        
    return normalized.tolist()

def calculate_angle_3d(a, b, c):
    """Calculates 3D joint angle in degrees."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba * norm_bc == 0:
        return 0.0
    dot = np.dot(ba, bc)
    cosine = np.clip(dot / (norm_ba * norm_bc), -1.0, 1.0)
    return round(math.degrees(math.acos(cosine)), 1)

def extract_body_angles(norm_coords):
    """Extracts key anatomical Bharatanatyam posture angles."""
    if norm_coords is None:
        return None
    
    nc = np.array(norm_coords)
    k_left = calculate_angle_3d(nc[23], nc[25], nc[27])
    k_right = calculate_angle_3d(nc[24], nc[26], nc[28])
    e_left = calculate_angle_3d(nc[11], nc[13], nc[15])
    e_right = calculate_angle_3d(nc[12], nc[14], nc[16])
    
    # Spine / Torso tilt relative to vertical Y axis
    spine_vec = (nc[11] + nc[12]) / 2.0 - (nc[23] + nc[24]) / 2.0
    torso_tilt = round(math.degrees(math.atan2(abs(spine_vec[0]), abs(spine_vec[1]))), 1)
    
    return {
        "left_knee": k_left,
        "right_knee": k_right,
        "left_elbow": e_left,
        "right_elbow": e_right,
        "torso_tilt": torso_tilt
    }

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
    print("Starting GestureIQ Reference Landmark Extraction...")
    dance_items = ["Alarippu", "Pushpanjali"]
    for dance in dance_items:
        process_dance_folder(dance)

if __name__ == "__main__":
    main()
