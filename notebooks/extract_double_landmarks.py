import os
import cv2
import csv
import mediapipe as mp
import numpy as np
from multiprocessing import Pool, cpu_count

# --- PATHS ---
DATA_FOLDER = "../dataset/double_handed_mudras/sorted_frames"
OUTPUT_CSV  = "../dataset/double_handed_mudras/double_landmarks.csv"

mp_hands = mp.solutions.hands

# Mudras requiring the most aggressive detection (hands overlap)
OVERLAP_MUDRAS = {
    "anjali", "kapota", "karkata", "svastika", "puspaputa",
    "samputa", "utsanga", "sivalinga", "kurma", "matsya",
    "chakra", "varaha", "dola"
}

def get_enhanced_versions(img):
    """Creates variants to help MediaPipe 'see' hands in difficult lighting."""
    versions = [img]
    # 1. High Contrast/Bright
    versions.append(cv2.convertScaleAbs(img, alpha=1.6, beta=45))
    # 2. Sharpening Filter (makes finger edges clear)
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    versions.append(cv2.filter2D(img, -1, kernel))
    # 3. Horizontal Flip (sometimes detection is orientation-dependent)
    versions.append(cv2.flip(img, 1))
    return versions

def detect_and_normalize(img, confidence):
    """Detects 2 hands and makes coordinates scale-invariant."""
    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=confidence
    ) as hands:
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        if not result.multi_hand_landmarks or len(result.multi_hand_landmarks) < 2:
            return None

        # Sort hands by screen position (Leftmost hand is always 'Hand 1')
        # This stops the AI from getting confused if hands cross (like in Svastika)
        sorted_hands = sorted(result.multi_hand_landmarks, key=lambda h: h.landmark[0].x)
        
        final_row = []
        for hand in sorted_hands:
            # Step 1: Center at Wrist (Landmark 0)
            wrist = hand.landmark[0]
            temp_pts = [[p.x - wrist.x, p.y - wrist.y, p.z - wrist.z] for p in hand.landmark]

            # Step 2: Scale by Palm Size (Distance from Wrist to Middle Finger Base)
            # This makes the detection distance-invariant
            palm_size = np.linalg.norm(np.array(temp_pts[9]) - np.array(temp_pts[0]))
            if palm_size < 1e-6: palm_size = 1.0
            
            for pt in temp_pts:
                final_row.extend([pt[0]/palm_size, pt[1]/palm_size, pt[2]/palm_size])

        return final_row

def process_image(args):
    img_path, mudra_name = args
    img = cv2.imread(img_path)
    if img is None: return None

    # Aggressive levels for tricky mudras, standard for clear ones
    conf_levels = [0.15, 0.1, 0.05] if mudra_name in OVERLAP_MUDRAS else [0.4, 0.2]

    for version in get_enhanced_versions(img):
        for conf in conf_levels:
            landmarks = detect_and_normalize(version, conf)
            if landmarks:
                return [mudra_name] + landmarks
    return None

def main():
    tasks = []
    for mudra in sorted(os.listdir(DATA_FOLDER)):
        m_path = os.path.join(DATA_FOLDER, mudra)
        if not os.path.isdir(m_path): continue
        for img in os.listdir(m_path):
            if img.lower().endswith(('.png', '.jpg', '.jpeg')):
                tasks.append((os.path.join(m_path, img), mudra))

    print(f"🚀 Processing {len(tasks)} images using {cpu_count()} cores...")

    valid_data = []
    with Pool(processes=cpu_count()) as pool:
        for i, res in enumerate(pool.imap_unordered(process_image, tasks)):
            if res: valid_data.append(res)
            if i % 200 == 0:
                print(f"Progress: {i}/{len(tasks)} | Valid detected: {len(valid_data)}")

    # Save to CSV
    header = ['mudra_name']
    for hand in ['h1', 'h2']:
        for i in range(21):
            header += [f'{hand}_x{i}', f'{hand}_y{i}', f'{hand}_z{i}']

    with open(OUTPUT_CSV, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(valid_data)

    print(f"\n✅ DONE: Saved {len(valid_data)} valid rows to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()