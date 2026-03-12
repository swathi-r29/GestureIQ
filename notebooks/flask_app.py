from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import mediapipe as mp
import pickle
import numpy as np
import math
import threading
import time

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

# ─────────────────────────────────────────────────────────────
# FIXED REFERENCE ANGLES
# Convention: ~160–175° = straight/extended, ~40–60° = fully curled/bent
# Values are the TARGET angle each finger should be at.
# Threshold for triggering a correction message is ±25°.
# ─────────────────────────────────────────────────────────────
MUDRA_REFERENCE_ANGLES = {
    # ALL fingers straight, thumb slightly bent
    "pataka":       {"thumb":  80, "index": 170, "middle": 170, "ring": 170, "pinky": 170},  # thumb bent inward
    # Ring finger bent, rest straight
    "tripataka":    {"thumb": 155, "index": 170, "middle": 170, "ring":  50, "pinky": 170},
    # Ring + pinky bent, rest straight
    "ardhapataka":  {"thumb": 155, "index": 170, "middle": 170, "ring":  50, "pinky":  50},
    # Index + middle spread straight, thumb + ring + pinky curled
    "kartarimukha": {"thumb":  60, "index": 170, "middle": 170, "ring":  50, "pinky":  50},
    # Thumb touches index (both ~100°), middle/ring/pinky spread straight
    "mayura":       {"thumb": 100, "index": 100, "middle": 170, "ring": 170, "pinky": 170},
    # All fingers open and straight, thumb extended (similar to pataka but wrist open)
    "ardhachandra": {"thumb":  80, "index": 170, "middle": 170, "ring": 170, "pinky": 170},  # thumb extended sideways (reads low with new landmarks)
    # Only index bent inward (~90°), all others straight
    "arala":        {"thumb": 155, "index":  90, "middle": 170, "ring": 170, "pinky": 170},
    # Thumb presses ring (~90° each), index/middle/pinky straight
    "shukatunda":   {"thumb": 120, "index": 170, "middle": 170, "ring":  65, "pinky": 170},  # thumb presses ring — reads ~120 with (1,2,4), ring ~65
    # TRUE FIST: all four fingers fully curled, thumb over top
    "mushti":       {"thumb": 155, "index":  45, "middle":  45, "ring":  45, "pinky":  45},
    # Fist with thumb raised straight up
    "shikhara":     {"thumb": 170, "index":  45, "middle":  45, "ring":  45, "pinky":  45},
    # Index curled tight, thumb presses it, others curled
    "kapittha":     {"thumb": 130, "index":  50, "middle":  50, "ring":  50, "pinky":  50},  # thumb presses index — reads ~130 with (1,2,4) landmarks
    # Thumb+index+middle form circle, ring+pinky relaxed curled
    "katakamukha":  {"thumb": 100, "index": 100, "middle": 100, "ring": 130, "pinky": 130},  # ring+pinky just relax naturally
    # Index pointing straight up, all others curled
    "suchi":        {"thumb":  60, "index": 170, "middle":  80, "ring":  80, "pinky":  80},  # index up, others relaxed down
    # Thumb+index curve together (~120°), others relaxed
    "chandrakala":  {"thumb": 120, "index": 155, "middle": 170, "ring": 170, "pinky": 170},  # index is extended, thumb curves toward it
    # All fingers spread, curved like a cup (~130°)
    "padmakosha":   {"thumb": 145, "index": 145, "middle": 145, "ring": 145, "pinky": 145},  # gently curved cup shape
    # All fingers together, hand flat (wrist bends — fingers themselves stay straight)
    "sarpashira":   {"thumb": 155, "index": 170, "middle": 170, "ring": 170, "pinky": 170},
    # Thumb+ring+pinky touch (~80°), index+middle straight up
    "mrigashira":   {"thumb":  80, "index": 170, "middle": 170, "ring":  80, "pinky":  80},
    # Thumb+index+middle spread wide (~150°), ring+pinky curled
    "simhamukha":   {"thumb": 150, "index": 150, "middle": 150, "ring":  50, "pinky":  50},
    # Four fingers together straight, thumb bent across palm
    "kangula":      {"thumb":  60, "index": 170, "middle": 170, "ring": 170, "pinky": 170},
    # ALL five fingers spread wide and curved outward (~150°)
    "alapadma":     {"thumb": 150, "index": 150, "middle": 150, "ring": 150, "pinky": 150},
    # Four fingers bent (~80°), thumb tucked at side (~60°)
    "chatura":      {"thumb":  60, "index":  80, "middle":  80, "ring":  80, "pinky":  80},
    # Index touches thumb (~90°), middle bent (~80°), ring+pinky straight
    "bhramara":     {"thumb":  90, "index":  90, "middle":  80, "ring": 170, "pinky": 170},
    # All five fingertips meet (all ~70° — pinched)
    "hamsasya":     {"thumb":  70, "index":  70, "middle":  70, "ring":  70, "pinky":  70},
    # Fingers gently spread in a wave, slightly bent (~140°)
    "hamsapaksha":  {"thumb": 140, "index": 140, "middle": 140, "ring": 140, "pinky": 140},
    # Index+middle pinch together tightly (~60°), others curled
    "sandamsha":    {"thumb":  80, "index":  60, "middle":  60, "ring":  50, "pinky":  50},
    # All five fingertips meet at one point (tighter than hamsasya, ~60°)
    "mukula":       {"thumb":  60, "index":  60, "middle":  60, "ring":  60, "pinky":  60},
    # Fist with thumb up AND pinky raised
    "tamrachuda":   {"thumb": 170, "index":  45, "middle":  45, "ring":  45, "pinky": 170},
    # Index+middle+ring straight (~170°), thumb+pinky closed
    "trishula":     {"thumb":  60, "index": 170, "middle": 170, "ring": 170, "pinky":  60},
}

# ─────────────────────────────────────────────────────────────
# Per-finger correction thresholds (degrees).
# Thumb is measured differently and has more natural variance,
# so it gets a larger tolerance to avoid false corrections.
CORRECTION_THRESHOLDS = {
    "thumb":  40,   # thumb anatomy + landmark noise → generous tolerance
    "index":  25,
    "middle": 25,
    "ring":   25,
    "pinky":  25,
}

# Tighter thresholds for mudras where ALL fingers must be clearly straight
# A bent finger at 140° vs target 170° is only 30° — needs tighter catch
STRAIGHT_FINGER_MUDRAS = {
    "pataka", "tripataka", "ardhapataka", "ardhachandra", 
    "arala", "sarpashira", "trishula"
}
STRAIGHT_FINGER_THRESHOLD = 15  # tighter — catch even slight bends

def calculate_angle(p1, p2, p3):
    """Calculates angle P1-P2-P3 in degrees using 3D coordinates."""
    v1 = np.array([p1.x - p2.x, p1.y - p2.y, p1.z - p2.z])
    v2 = np.array([p3.x - p2.x, p3.y - p2.y, p3.z - p2.z])
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 180.0
    unit_v1 = v1 / norm1
    unit_v2 = v2 / norm2
    dot_product = np.dot(unit_v1, unit_v2)
    angle = np.arccos(np.clip(dot_product, -1.0, 1.0))
    return np.degrees(angle)


def get_finger_angles(landmarks):
    # FIX: Thumb now uses landmarks (1, 2, 4) — wrist-base → MCP → tip.
    # This gives a stable "how upright is the thumb" reading regardless
    # of wrist rotation, fixing false corrections on Shikhara/Tamrachuda.
    # All other fingers use MCP → PIP → TIP as before.
    finger_indices = {
        "thumb":  (1,  2,  4),   # CHANGED from (2,3,4)
        "index":  (5,  6,  8),
        "middle": (9,  10, 12),
        "ring":   (13, 14, 16),
        "pinky":  (17, 18, 20)
    }
    return {
        name: calculate_angle(
            landmarks.landmark[p1],
            landmarks.landmark[p2],
            landmarks.landmark[p3]
        )
        for name, (p1, p2, p3) in finger_indices.items()
    }


# For fist-based mudras, only the DISTINGUISHING fingers need correction
# messages. The curled fingers are naturally variable — skip their messages
# but still count them toward the accuracy score.
SKIP_CORRECTION_FINGERS = {
    "mushti":     {"index", "middle", "ring", "pinky"},
    "shikhara":   {"index", "middle", "ring", "pinky"},  # only thumb matters
    "kapittha":   {"thumb", "middle", "ring", "pinky"},  # thumb-against-index is hard to measure reliably
    "tamrachuda": {"index", "middle", "ring"},
    "suchi":      {"thumb"},  # index must be straight; middle/ring/pinky must curl — only thumb skipped
    "shukatunda": {"thumb", "ring"},  # use distance check instead for thumb+ring; index/middle/pinky must be straight
    "trishula":   {"thumb", "pinky"},
    "chandrakala":{"index", "middle", "ring", "pinky"},  # only thumb curve matters for crescent
    "pataka":     {"thumb"},  # thumb naturally varies — only 4 straight fingers matter
    "katakamukha":{"ring", "pinky"},  # only thumb+index+middle circle matters
    "padmakosha": {"thumb", "index", "middle", "ring", "pinky"},  # cup shape — no per-finger corrections
    "bhramara":   {"ring", "pinky"},
}

def get_corrections(detected_mudra, current_angles):
    """
    Returns correction messages only for the meaningful/distinguishing
    fingers of each mudra. Fist fingers are excluded from messages to
    prevent false 'uncurl slightly' noise, but still affect accuracy.
    """
    mudra_key = str(detected_mudra).lower().strip()
    reference = MUDRA_REFERENCE_ANGLES.get(mudra_key)

    if not reference:
        return [], 100

    skip_fingers = SKIP_CORRECTION_FINGERS.get(mudra_key, set())
    deviations = []
    total_error = 0

    for finger, ref_angle in reference.items():
        actual_angle = current_angles.get(finger, ref_angle)
        abs_dev = abs(ref_angle - actual_angle)
        total_error += abs_dev

        # Always count error toward accuracy, but only show messages
        # for non-skipped fingers
        if finger in skip_fingers:
            continue

        # Use tighter threshold for mudras requiring clearly straight fingers
        if mudra_key in STRAIGHT_FINGER_MUDRAS:
            threshold = STRAIGHT_FINGER_THRESHOLD if finger != "thumb" else CORRECTION_THRESHOLDS["thumb"]
        else:
            threshold = CORRECTION_THRESHOLDS.get(finger, 25)

        if abs_dev > threshold:
            finger_label = "little" if finger == "pinky" else finger
            target_is_straight = ref_angle >= 120
            actual_is_more_open = actual_angle > ref_angle

            if target_is_straight:
                if not actual_is_more_open:
                    msg = "Extend your thumb outward" if finger == "thumb" else f"Straighten your {finger_label} finger"
                else:
                    msg = f"Relax your {finger_label} finger slightly"
            else:
                if actual_is_more_open:
                    msg = "Bend your thumb inward" if finger == "thumb" else f"Curl your {finger_label} finger more"
                else:
                    msg = "Relax your thumb slightly" if finger == "thumb" else f"Uncurl your {finger_label} finger slightly"

            deviations.append((abs_dev, msg))

    # ── SPECIAL DISTANCE CHECK for Shukatunda ──────────────────
    # Angle-based thumb measurement is unreliable when thumb presses ring.
    # Instead check if thumb tip (4) is close to ring finger base (13).
    if mudra_key == "shukatunda" and hasattr(get_corrections, '_landmarks_ref'):
        lm = get_corrections._landmarks_ref
        thumb_tip = lm.landmark[4]
        ring_mcp  = lm.landmark[13]
        dist = math.sqrt((thumb_tip.x - ring_mcp.x)**2 + (thumb_tip.y - ring_mcp.y)**2)
        # dist > 0.15 means thumb is far from ring → not pressing
        if dist > 0.15:
            deviations.append((60, "Press your thumb against your ring finger"))

    deviations.sort(key=lambda x: x[0], reverse=True)
    correction_messages = [d[1] for d in deviations]

    accuracy = max(0.0, 100.0 - (total_error / 6.5))
    return correction_messages, round(accuracy, 1)


def get_features(landmarks):
    row = []
    for lm in landmarks.landmark:
        row += [lm.x, lm.y, lm.z]

    wrist_x, wrist_y, wrist_z = row[0], row[1], row[2]
    norm_row = []
    for i in range(0, len(row), 3):
        norm_row += [row[i] - wrist_x, row[i+1] - wrist_y, row[i+2] - wrist_z]

    max_val = max(abs(x) for x in norm_row)
    if max_val > 0:
        norm_row = [x / max_val for x in norm_row]

    def get_dist(p1_idx, p2_idx):
        return math.sqrt(
            (norm_row[p1_idx]   - norm_row[p2_idx])**2 +
            (norm_row[p1_idx+1] - norm_row[p2_idx+1])**2 +
            (norm_row[p1_idx+2] - norm_row[p2_idx+2])**2
        )

    distances = [get_dist(12, 24), get_dist(12, 36), get_dist(12, 48), get_dist(12, 60)]
    straightness = [get_dist(24, 15), get_dist(36, 27), get_dist(48, 39), get_dist(60, 51)]
    return norm_row + distances + straightness


# Global shared state
output_frame = None
lock = threading.Lock()
cap = cv2.VideoCapture(0)

def camera_worker():
    global cap, output_frame, current_mudra
    print("Background camera worker started")
    
    while True:
        if not cap.isOpened():
            cap = cv2.VideoCapture(0)
            time.sleep(1)
            continue
            
        success, frame = cap.read()
        if not success:
            print("Failed to read frame, reconnecting...")
            cap.release()
            cap = cv2.VideoCapture(0)
            time.sleep(1)
            continue

        frame = cv2.flip(frame, 1)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(frame_rgb)

        if result.multi_hand_landmarks:
            landmarks = result.multi_hand_landmarks[0]
            mp_draw.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

            try:
                features = get_features(landmarks)
                prediction = model.predict([features])[0]
                prob_array = model.predict_proba([features])[0]
                confidence = max(prob_array) * 100
                finger_angles = get_finger_angles(landmarks)

                target = current_mudra.get("target")
                eval_mudra = target if target else prediction

                get_corrections._landmarks_ref = landmarks
                corrections, art_accuracy = get_corrections(eval_mudra, finger_angles)

                total_accuracy = (confidence * 0.4) + (art_accuracy * 0.6)

                current_mudra.update({
                    "name": prediction,
                    "confidence": round(confidence, 1),
                    "detected": True,
                    "meaning": MUDRA_MEANINGS.get(prediction, ""),
                    "corrections": corrections,
                    "accuracy": round(total_accuracy, 1),
                })
            except Exception as e:
                print(f"AI Error: {e}")
        else:
            current_mudra.update({
                "name": "Show your hand", "confidence": 0,
                "detected": False, "corrections": [], "accuracy": 0
            })

        # Encode and store frame for clients
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            with lock:
                output_frame = buffer.tobytes()
        
        time.sleep(0.01) # Max ~100 FPS processing

def generate_frames():
    global output_frame
    while True:
        with lock:
            if output_frame is None:
                continue
            frame = output_frame
        
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        time.sleep(0.04) # Target ~25 FPS for clients

# Start the background worker
t = threading.Thread(target=camera_worker)
t.daemon = True
t.start()


@app.route('/video_feed')
def video_feed():
    response = Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route('/mudra_data')
def mudra_data():
    target = request.args.get('target')
    current_mudra["target"] = target.lower().strip() if target else None
    return jsonify(current_mudra)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)