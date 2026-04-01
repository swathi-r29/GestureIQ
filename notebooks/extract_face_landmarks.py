import cv2
import os
import csv
import mediapipe as mp

mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.4,
)

FRAMES_FOLDER = "D:/GestureIQ/dataset/navarasa/frames"
OUTPUT_CSV    = "D:/GestureIQ/dataset/navarasa/navarasa_landmarks.csv"

RASAS = [
    "hasya", "karuna", "raudra", "vira", "bhayanaka",
    "bibhatsa", "adbhuta", "shanta", "shringara"
]

def extract():
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)

        # Build header
        header = ["label"]
        for i in range(468):
            header += [f"x{i}", f"y{i}", f"z{i}"]
        writer.writerow(header)

        total_saved  = 0
        total_failed = 0

        for rasa in RASAS:
            rasa_folder = os.path.join(FRAMES_FOLDER, rasa)
            if not os.path.exists(rasa_folder):
                print(f"Skipping — folder not found: {rasa_folder}")
                continue

            images = [f for f in os.listdir(rasa_folder)
                      if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            print(f"\nProcessing {rasa}: {len(images)} images")

            rasa_saved  = 0
            rasa_failed = 0

            for img_file in images:
                img_path = os.path.join(rasa_folder, img_file)
                img      = cv2.imread(img_path)
                if img is None:
                    rasa_failed += 1
                    continue

                rgb    = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                result = face_mesh.process(rgb)

                if not result.multi_face_landmarks:
                    rasa_failed += 1
                    continue

                landmarks = result.multi_face_landmarks[0].landmark

                # Normalise relative to nose tip (landmark 1)
                nose_x = landmarks[1].x
                nose_y = landmarks[1].y
                nose_z = landmarks[1].z

                row = [rasa]   # ← rasa name goes first as label
                for lm in landmarks:
                    row.append(round(lm.x - nose_x, 6))
                    row.append(round(lm.y - nose_y, 6))
                    row.append(round(lm.z - nose_z, 6))

                writer.writerow(row)
                rasa_saved  += 1
            total_saved  += rasa_saved
            total_failed += rasa_failed
            print(f"  Saved: {rasa_saved}  Failed: {rasa_failed}")

    print(f"\n=== DONE ===")
    print(f"CSV: {OUTPUT_CSV}")
    print(f"Total rows saved : {total_saved}")
    print(f"Total failed     : {total_failed}")

    # Verify
    import pandas as pd
    df = pd.read_csv(OUTPUT_CSV)
    print(f"\nVerification:")
    print(f"Shape: {df.shape}")
    print(f"Label column unique values: {df['label'].unique()}")

if __name__ == "__main__":
    extract()

face_mesh.close()