import cv2
import mediapipe as mp
import pickle
import numpy as np

# Load model
with open("D:/GestureIQ/models/mudra_model.pkl", "rb") as f:
    model = pickle.load(f)

# MediaPipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

# Webcam
cap = cv2.VideoCapture(0)
print("Press Q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(frame_rgb)

    if result.multi_hand_landmarks:
        landmarks = result.multi_hand_landmarks[0]
        mp_draw.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

        row = []
        for lm in landmarks.landmark:
            row += [lm.x, lm.y, lm.z]

        # Normalize relative to wrist
        wrist_x, wrist_y, wrist_z = row[0], row[1], row[2]
        norm_row = []
        for i in range(0, len(row), 3):
            norm_row += [row[i]-wrist_x, row[i+1]-wrist_y, row[i+2]-wrist_z]
            
        max_val = max(abs(x) for x in norm_row)
        if max_val > 0:
            norm_row = [x / max_val for x in norm_row]
            
        import math
        def get_dist(p1_idx, p2_idx):
            return math.sqrt(
                (norm_row[p1_idx] - norm_row[p2_idx])**2 +
                (norm_row[p1_idx+1] - norm_row[p2_idx+1])**2 +
                (norm_row[p1_idx+2] - norm_row[p2_idx+2])**2
            )
            
        distances = [
            get_dist(12, 24), # Thumb to Index
            get_dist(12, 36), # Thumb to Middle
            get_dist(12, 48), # Thumb to Ring
            get_dist(12, 60)  # Thumb to Pinky
        ]
        
        straightness = [
            get_dist(24, 15), # Index curl
            get_dist(36, 27), # Middle curl
            get_dist(48, 39), # Ring curl
            get_dist(60, 51)  # Pinky curl
        ]
        
        final_features = norm_row + distances + straightness

        prediction = model.predict([final_features])[0]
        confidence = max(model.predict_proba([final_features])[0]) * 100

        if confidence > 25:
            cv2.putText(frame, f"{prediction} ({confidence:.1f}%)",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "Detecting...",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

    cv2.imshow("GestureIQ - Mudra Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
