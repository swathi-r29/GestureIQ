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
hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.5,  # Lowered from 0.7 for better detection
    min_tracking_confidence=0.5
)
mp_draw = mp.solutions.drawing_utils
import requests
import json
import time

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
        handedness = result.multi_handedness[0].classification[0].label if result.multi_handedness else "Right"
        mp_draw.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

        # Extract landmarks for backend
        lm_list = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in landmarks.landmark]
        presence_score = 0.9  # Mock high confidence

        # 1. Local model test
        features = extract_features(landmarks.landmark)
        features_arr = np.array([features])
        prediction = model.predict(features_arr)[0]
        probs = model.predict_proba(features_arr)[0]
        ml_conf = max(probs) * 100

        # 2. Backend full pipeline test (Flask MADM + corrections)
        try:
            response = requests.post("http://localhost:5001/api/detect_landmarks", 
                json={"landmarks": lm_list, "handedness": handedness, "presenceScore": presence_score, "targetMudra": TARGET_MUDRA},
                timeout=1.0)
            backend_data = response.json()
        except:
            backend_data = {"detected": False, "name": "Backend Offline", "accuracy": 0, "corrections": []}

        # UI Feedback (Backend Priority)
        if backend_data["detected"] and backend_data["name"].lower() == TARGET_MUDRA.lower():
            display_text = f"✓ Correct: {backend_data['name']} ({backend_data['accuracy']:.0f}%)"
            color = (0, 255, 0)
        elif backend_data["detected"]:
            display_text = f"Detected: {backend_data['name']} ({backend_data['accuracy']:.0f}%)"
            color = (0, 255, 255)  # Yellow
        else:
            display_text = f"ML: {prediction} ({ml_conf:.0f}%) | Backend: No Hand"
            color = (0, 0, 255)

        cv2.putText(frame, display_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # Backend corrections
        if backend_data.get("corrections"):
            for i, corr in enumerate(backend_data["corrections"][:2]):
                cv2.putText(frame, corr, (20, 120 + i*30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

        # Handedness
        cv2.putText(frame, f"Hand: {handedness}", (20, h-60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # UI Instructions
    cv2.putText(frame, f"Target: {TARGET_MUDRA.upper()}", 
                (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    cv2.imshow("GestureIQ - Robust Mudra Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
