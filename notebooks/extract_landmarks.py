import os
import csv
import mediapipe as mp
import cv2
import numpy as np
from multiprocessing import Pool, cpu_count
from functools import partial

# Constants
#DATA_FOLDERS = [
 #   "D:/GestureIQ/dataset/bharatanatyam_mudras/sorted_mudras"
#]
#OUTPUT_CSV = "D:/GestureIQ/dataset/bharatanatyam_mudras/landmarks.csv"

DATA_FOLDERS = [
    "E:/GestureIQ/dataset/bharatanatyam_mudras/sorted_mudras"
]
OUTPUT_CSV = "E:/GestureIQ/dataset/bharatanatyam_mudras/landmarks.csv"

def get_versions(img):
    versions = []
    # Original
    versions.append(img)
    # Brighten
    versions.append(cv2.convertScaleAbs(img, alpha=1.5, beta=30))
    # Gamma correction
    gamma = 1.2
    table = np.array([((i/255.0)**gamma)*255 for i in range(256)]).astype("uint8")
    versions.append(cv2.LUT(img, table))
    return versions

def process_image(args):
    img_path, mudra_name = args
    img = cv2.imread(img_path)
    if img is None:
        return None

    # Initialize MediaPipe in each process
    mp_hands = mp.solutions.hands
    with mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.1) as hands:
        for version in get_versions(img):
            img_rgb = cv2.cvtColor(version, cv2.COLOR_BGR2RGB)
            result = hands.process(img_rgb)
            if result.multi_hand_landmarks:
                landmarks = result.multi_hand_landmarks[0]
                row = [mudra_name]
                for lm in landmarks.landmark:
                    row += [lm.x, lm.y, lm.z]
                return row
    return None

def main():
    tasks = []
    for folder in DATA_FOLDERS:
        for mudra_name in sorted(os.listdir(folder)):
            mudra_path = os.path.join(folder, mudra_name)
            if not os.path.isdir(mudra_path):
                continue
            if mudra_name == "unknown":
                continue

            images = [f for f in os.listdir(mudra_path) if f.endswith(('.jpg', '.jpeg', '.png'))]
            for img_file in images:
                tasks.append((os.path.join(mudra_path, img_file), mudra_name))

    print(f"Total images to process: {len(tasks)}")
    print(f"Starting multiprocessing with {cpu_count()} cores...")

    results = []
    # Use Pool to parallelize image processing
    with Pool(processes=cpu_count()) as pool:
        # Using TQDM or just periodic prints would be nice, but we'll stick to a simple print
        for i, res in enumerate(pool.imap_unordered(process_image, tasks)):
            if res:
                results.append(res)
            if i % 100 == 0:
                print(f"Processed {i}/{len(tasks)} images... ({len(results)} successful)")

    # Save to CSV
    print(f"Saving {len(results)} rows to {OUTPUT_CSV}...")
    with open(OUTPUT_CSV, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        header = ['mudra_name']
        for i in range(21):
            header += [f'x{i}', f'y{i}', f'z{i}']
        writer.writerow(header)
        writer.writerows(results)

    print("🎉 Done!")

if __name__ == "__main__":
    main()
