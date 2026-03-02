from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import pickle
import numpy as np
import math

app = Flask(__name__)
CORS(app)

# Load model
with open("D:/GestureIQ/models/mudra_model.pkl", "rb") as f:
    model = pickle.load(f)

# MediaPipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

current_mudra = {"name": "", "confidence": 0, "detected": False}

MUDRA_MEANINGS = {
    "pataka": "Flag", "tripataka": "Three parts of flag",
    "ardhapataka": "Half flag", "kartarimukha": "Scissors face",
    "mayura": "Peacock", "ardhachandra": "Half moon",
    "arala": "Bent", "shukatunda": "Parrot beak",
    "mushti": "Fist", "shikhara": "Spire",
    "kapittha": "Wood apple", "katakamukha": "Opening in bracelet",
    "suchi": "Needle", "chandrakala": "Digit of moon",
    "padmakosha": "Lotus bud", "sarpashira": "Snake head",
    "mrigashira": "Deer head", "simhamukha": "Lion face",
    "kangula": "Bell", "alapadma": "Full bloomed lotus",
    "chatura": "Clever", "bhramara": "Bee",
    "hamsasya": "Swan beak", "hamsapaksha": "Swan wing",
    "sandamsha": "Tongs", "mukula": "Bud",
    "tamrachuda": "Rooster", "trishula": "Trident"
}

def get_features(landmarks):
    row = []
    for lm in landmarks.landmark:
        row += [lm.x, lm.y, lm.z]

    wrist_x, wrist_y, wrist_z = row[0], row[1], row[2]
    norm_row = []
    for i in range(0, len(row), 3):
        norm_row += [row[i]-wrist_x, row[i+1]-wrist_y, row[i+2]-wrist_z]

    max_val = max(abs(x) for x in norm_row)
    if max_val > 0:
        norm_row = [x / max_val for x in norm_row]

    def get_dist(p1_idx, p2_idx):
        return math.sqrt(
            (norm_row[p1_idx] - norm_row[p2_idx])**2 +
            (norm_row[p1_idx+1] - norm_row[p2_idx+1])**2 +
            (norm_row[p1_idx+2] - norm_row[p2_idx+2])**2
        )

    distances = [
        get_dist(12, 24),
        get_dist(12, 36),
        get_dist(12, 48),
        get_dist(12, 60)
    ]

    straightness = [
        get_dist(24, 15),
        get_dist(36, 27),
        get_dist(48, 39),
        get_dist(60, 51)
    ]

    return norm_row + distances + straightness

def generate_frames():
    global current_mudra
    # Initialize camera when stream is requested
    cap = cv2.VideoCapture(0)
    
    # Allow camera to warm up
    if not cap.isOpened():
        current_mudra = {"name": "Camera error", "confidence": 0, "detected": False}
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Process frame...
            frame = cv2.flip(frame, 1)
            # ... skipping full model processing here for brevity to fix the core issue, but we need the original code block inside.
            
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(frame_rgb)

            if result.multi_hand_landmarks:
                landmarks = result.multi_hand_landmarks[0]
                mp_draw.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

                try:
                    features = get_features(landmarks)
                    prediction = model.predict([features])[0]
                    confidence = max(model.predict_proba([features])[0]) * 100

                    if confidence > 25:
                        current_mudra = {
                            "name": prediction,
                            "confidence": round(confidence, 1),
                            "detected": True,
                            "meaning": MUDRA_MEANINGS.get(prediction, "")
                        }
                    else:
                        current_mudra = {"name": "", "confidence": 0, "detected": False}
                except:
                    current_mudra = {"name": "", "confidence": 0, "detected": False}
            else:
                current_mudra = {"name": "Show your hand", "confidence": 0, "detected": False}

            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    except Exception as e:
        print(f"Error in video feed: {e}")
    except GeneratorExit:
        print("Client disconnected, releasing camera.")
    finally:
        # Release the camera when the client disconnects or an error occurs
        if cap is not None:
            cap.release()
            cv2.destroyAllWindows()
            print("Camera fully released.")

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/mudra_data')
def mudra_data():
    return jsonify(current_mudra)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
