# notebooks/extract_double_landmarks.py
# Reads sorted_frames/ folder, extracts 42 landmarks (both hands) per image,
# saves to dataset/double_handed_mudras/landmarks_double.csv
#
# Usage:
#   cd D:/GestureIQ/notebooks
#   python extract_double_landmarks.py

import os, csv, sys
import cv2
import mediapipe as mp
import numpy as np
from multiprocessing import Pool, cpu_count

#SORTED_FRAMES_DIR = "D:/GestureIQ/dataset/double_handed_mudras/sorted_frames"
#OUTPUT_CSV        = "D:/GestureIQ/dataset/double_handed_mudras/landmarks_double.csv"

SORTED_FRAMES_DIR = "../dataset/double_handed_mudras/sorted_frames"
OUTPUT_CSV        = "../dataset/double_handed_mudras/landmarks_double.csv"

mp_hands_mod = mp.solutions.hands

def brightness_variants(img):
    variants = [img]
    try:
        variants.append(cv2.convertScaleAbs(img, alpha=1.4, beta=20))
        gamma = 1.2
        table = np.array([((i/255.0)**gamma)*255 for i in range(256)]).astype("uint8")
        variants.append(cv2.LUT(img, table))
    except:
        pass
    return variants

# Global hands object for worker processes
hands_worker = None

def init_worker():
    global hands_worker
    hands_worker = mp_hands_mod.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.1
    )

def process_image(args):
    img_path, mudra_name = args
    img = cv2.imread(img_path)
    if img is None:
        return None

    filename = os.path.basename(img_path)
    if "_frame_" in filename:
        group = filename.split("_frame_")[0]
    else:
        group = filename.split(".")[0]

    # Try to detect hands from multiple brightness variants
    global hands_worker
    for variant in brightness_variants(img):
        rgb    = cv2.cvtColor(variant, cv2.COLOR_BGR2RGB)
        result = hands_worker.process(rgb)

        if result.multi_hand_landmarks and len(result.multi_hand_landmarks) >= 1:
            # Build hand dict: label → landmarks
            hand_dict = {}
            if len(result.multi_hand_landmarks) == 2:
                # If we have 2 hands, check if there's a label collision
                labels = []
                for idx in range(2):
                    if result.multi_handedness and idx < len(result.multi_handedness):
                        labels.append(result.multi_handedness[idx].classification[0].label)
                    else:
                        labels.append("Right" if idx == 0 else "Left")
                
                # If both are the same, resolve by spatial position
                if labels[0] == labels[1]:
                    lms0 = result.multi_hand_landmarks[0]
                    lms1 = result.multi_hand_landmarks[1]
                    # The hand with the smaller x coordinate (wrist is landmark 0) is on the left
                    if lms0.landmark[0].x < lms1.landmark[0].x:
                        hand_dict["Left"] = lms0
                        hand_dict["Right"] = lms1
                    else:
                        hand_dict["Left"] = lms1
                        hand_dict["Right"] = lms0
                else:
                    hand_dict[labels[0]] = result.multi_hand_landmarks[0]
                    hand_dict[labels[1]] = result.multi_hand_landmarks[1]
            else:
                # 1 hand
                idx = 0
                hand_lm = result.multi_hand_landmarks[0]
                if result.multi_handedness and idx < len(result.multi_handedness):
                    label = result.multi_handedness[idx].classification[0].label
                else:
                    label = "Right"
                hand_dict[label] = hand_lm

            right_lm = hand_dict.get("Right")
            left_lm  = hand_dict.get("Left")

            # Build CSV row: mudra_name, R_x0..R_z20, R_label, L_x0..L_z20, L_label
            row = [mudra_name]

            # Right hand (or zeros)
            if right_lm:
                for lm in right_lm.landmark:
                    row += [lm.x, lm.y, lm.z]
                row.append("Right")
            else:
                row += [0.0] * 63 + ["NONE"]

            # Left hand (or zeros)
            if left_lm:
                for lm in left_lm.landmark:
                    row += [lm.x, lm.y, lm.z]
                row.append("Left")
            else:
                row += [0.0] * 63 + ["NONE"]

            # Only save if at least one real hand detected
            if right_lm or left_lm:
                return row + [group]

    return None   # no hand detected in any variant


def main():
    if not os.path.exists(SORTED_FRAMES_DIR):
        print(f"[ERROR] Sorted frames folder not found: {SORTED_FRAMES_DIR}")
        sys.exit(1)

    tasks = []
    mudra_counts = {}
    for mudra_name in sorted(os.listdir(SORTED_FRAMES_DIR)):
        mudra_path = os.path.join(SORTED_FRAMES_DIR, mudra_name)
        if not os.path.isdir(mudra_path):
            continue
        images = [f for f in os.listdir(mudra_path)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        mudra_counts[mudra_name] = len(images)
        for img_file in images:
            tasks.append((os.path.join(mudra_path, img_file), mudra_name))

    print(f"Mudra classes found: {list(mudra_counts.keys())}")
    print(f"Total images to process: {len(tasks)}")
    print(f"Samples per class:")
    for k, v in sorted(mudra_counts.items()):
        print(f"  {k:<25} {v} images")
    print(f"\nStarting extraction on {cpu_count()} cores...")

    results = []
    # Use initializer to create the hands object once per worker
    with Pool(processes=min(cpu_count(), 8), initializer=init_worker) as pool:
        for i, res in enumerate(pool.imap_unordered(process_image, tasks)):
            if res:
                results.append(res)
            if (i+1) % 500 == 0:
                print(f"  Processed {i+1}/{len(tasks)} — {len(results)} successful")

    print(f"\nSaving {len(results)} rows to {OUTPUT_CSV}...")
    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

    with open(OUTPUT_CSV, 'w', newline='') as f:
        writer = csv.writer(f)
        # Header
        header = ['mudra_name']
        for side in ['R', 'L']:
            for i in range(21):
                header += [f'{side}_x{i}', f'{side}_y{i}', f'{side}_z{i}']
            header.append(f'{side}_label')
        header.append('group')
        writer.writerow(header)
        writer.writerows(results)

    # Print per-class count
    from collections import Counter
    counts = Counter(r[0] for r in results)
    print("\nExtracted samples per class:")
    for k, v in sorted(counts.items()):
        print(f"  {k:<25} {v}")
    print(f"\nTotal: {len(results)} rows")
    print(f"Saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()