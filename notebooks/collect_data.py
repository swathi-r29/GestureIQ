import cv2
import mediapipe as mp
import os

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5)
mp_draw = mp.solutions.drawing_utils

mudra_name = input("Enter mudra name: ")
save_path = f"D:/GestureIQ/dataset/bharatanatyam_mudras/real_hands/{mudra_name}"
os.makedirs(save_path, exist_ok=True)

# Start count from existing images
existing_count = len(os.listdir(save_path))
count = 0
auto_save = False

print(f"Collecting: {mudra_name}")
print(f"Existing images: {existing_count}")
print("Press A to start | Press Q to quit | Need 90 images")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    clean_frame = frame.copy()
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(frame_rgb)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
        if auto_save and count < 90:
            cv2.imwrite(f"{save_path}/{existing_count + count:04d}.jpg", clean_frame)
            count += 1

    status = "SAVING..." if auto_save else "Press A to Start"
    color = (0, 255, 0) if auto_save else (0, 165, 255)
    cv2.putText(frame, f"{mudra_name} | {count}/90 | {status}",
                (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

    if count >= 90:
        cv2.putText(frame, "DONE! Press Q",
                    (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

    cv2.imshow("GestureIQ - Data Collection", frame)

    key = cv2.waitKey(100)
    if key == ord('a'):
        auto_save = True
        print("Saving started!")
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print(f"✅ Done! {count} new images saved for {mudra_name}")
print(f"Total images now: {existing_count + count}")