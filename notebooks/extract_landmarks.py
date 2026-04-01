import os
import csv
import mediapipe as mp
import cv2
import numpy as np

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.1)

data_folders = [
    "e:/GestureIQ/dataset/bharatanatyam_mudras/sorted_mudras"
]

output_csv = "e:/GestureIQ/dataset/bharatanatyam_mudras/landmarks.csv"

def get_versions(img):
    versions = []
    
    # Version 1 - Original
    versions.append(img)
    
    # Version 2 - Brighten
    versions.append(cv2.convertScaleAbs(img, alpha=1.8, beta=50))
    
    # Version 3 - High contrast
    versions.append(cv2.convertScaleAbs(img, alpha=2.5, beta=80))
    
    # Version 4 - CLAHE
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    versions.append(cv2.cvtColor(cv2.merge([l,a,b]), cv2.COLOR_LAB2BGR))
    
    # Version 5 - Gamma correction
    gamma = 1.5
    table = np.array([((i/255.0)**gamma)*255 for i in range(256)]).astype("uint8")
    versions.append(cv2.LUT(img, table))
    
    # Version 6 - Sharpen
    kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]])
    versions.append(cv2.filter2D(img, -1, kernel))
    
    # Version 7 - Resize larger
    h, w = img.shape[:2]
    versions.append(cv2.resize(img, (w*2, h*2)))
    
    return versions

with open(output_csv, 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    header = ['mudra_name']
    for i in range(21):
        header += [f'x{i}', f'y{i}', f'z{i}']
    writer.writerow(header)

    total = 0
    success = 0
    failed = 0

    for folder in data_folders:
        for mudra_name in sorted(os.listdir(folder)):
            mudra_path = os.path.join(folder, mudra_name)
            if not os.path.isdir(mudra_path):
                continue
            if mudra_name == "unknown":
                continue

            images = [f for f in os.listdir(mudra_path) if f.endswith(('.jpg','.jpeg','.png'))]
            print(f"Processing {mudra_name} from {os.path.basename(folder)}: {len(images)} images...")

            for img_file in images:
                img_path = os.path.join(mudra_path, img_file)
                total += 1
                img = cv2.imread(img_path)
                if img is None:
                    failed += 1
                    continue

                detected = False
                for version in get_versions(img):
                    img_rgb = cv2.cvtColor(version, cv2.COLOR_BGR2RGB)
                    result = hands.process(img_rgb)
                    if result.multi_hand_landmarks:
                        landmarks = result.multi_hand_landmarks[0]
                        row = [mudra_name]
                        for lm in landmarks.landmark:
                            row += [lm.x, lm.y, lm.z]
                        writer.writerow(row)
                        success += 1
                        detected = True
                        break

                if not detected:
                    failed += 1

print(f"\nTotal images: {total}")
print(f"Landmarks extracted: {success}")
print(f"Failed: {failed}")
print(f"CSV saved!")
print("🎉 Done!")
hands.close()