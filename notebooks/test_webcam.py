import cv2
import mediapipe as mp
import pickle
import numpy as np
import sys
import os

# Add root directory for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

# CONFIGURATION
TARGET_MUDRA = "pataka" # Set target for validation (all lowercase)
#MODEL_PATH = "e:/GestureIQ/models/mudra_model.pkl"
#MODEL_PATH = "D:\GestureIQ\models\mudra_model.pkl"
MODEL_PATH = "E:\GestureIQ\models\mudra_model.pkl"
# Load model
if not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model not found at {MODEL_PATH}. Run train_mudra_model.py first.")
    sys.exit(1)

with open(MODEL_PATH, "rb") as f:    
    model = pickle.load(f)

# MediaPipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

# Webcam
cap = cv2.VideoCapture(0)
print(f"Target Mudra: {TARGET_MUDRA}")
print("Press Q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Flip frame for mirror effect
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(frame_rgb)

    if result.multi_hand_landmarks:
        landmarks = result.multi_hand_landmarks[0]
        mp_draw.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

        # 1. Extract 72 features using the SHARED module
        features = extract_features(landmarks.landmark)

        # 2. Predict mudra
        features_arr = np.array([features])
        prediction = model.predict(features_arr)[0]
        
        # Get confidence (max probability)
        probs = model.predict_proba(features_arr)[0]
        confidence = max(probs) * 100

        # UI Feedback Logic
        if confidence > 35: # Threshold for reliable prediction
            # Target validation
            if prediction.lower() == TARGET_MUDRA.lower():
                display_text = f"Correct Mudra: {prediction}"
                color = (0, 255, 0) # Green
            else:
                display_text = f"Wrong Mudra - Detected: {prediction}"
                color = (0, 0, 255) # Red
                
            cv2.putText(frame, f"{display_text} ({confidence:.1f}%)",
                        (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 3)
        else:
            cv2.putText(frame, "Detecting...",
                        (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

    # UI Instructions
    cv2.putText(frame, f"Target: {TARGET_MUDRA.upper()}", 
                (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    cv2.imshow("GestureIQ - Robust Mudra Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
