import os
import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.1)

data_folders = [
    "D:/GestureIQ/dataset/bharatanatyam_mudras/sorted_mudras",
    "D:/GestureIQ/dataset/bharatanatyam_mudras/real_hands"
]

bad_images = []

for folder in data_folders:
    for mudra_name in sorted(os.listdir(folder)):
        mudra_path = os.path.join(folder, mudra_name)
        if not os.path.isdir(mudra_path):
            continue
        if mudra_name == "unknown":
            continue

        images = [f for f in os.listdir(mudra_path) if f.endswith(('.jpg', '.jpeg', '.png'))]

        for img_file in images:
            img_path = os.path.join(mudra_path, img_file)
            img = cv2.imread(img_path)
            if img is None:
                bad_images.append(img_path)
                continue
            img = cv2.convertScaleAbs(img, alpha=1.5, beta=30)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            result = hands.process(img_rgb)
            if not result.multi_hand_landmarks:
                bad_images.append(img_path)

# Save list to file
with open("D:/GestureIQ/bad_images.txt", "w") as f:
    for path in bad_images:
        f.write(path + "\n")

print(f"Total bad images: {len(bad_images)}")
print("Saved to D:/GestureIQ/bad_images.txt")
hands.close()
