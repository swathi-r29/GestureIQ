from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import cv2
import mediapipe as mp
import pickle
import numpy as np
import math
import base64
from datetime import datetime
from collections import deque

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Load model
with open("D:/GestureIQ/models/mudra_model.pkl", "rb") as f:
    model = pickle.load(f)

# MediaPipe setup
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.5, min_tracking_confidence=0.5)
mp_draw = mp.solutions.drawing_utils

current_mudra = {
    "name": "", "confidence": 0.0, "detected": False,
    "accuracy": 0.0, "corrections": [],
    "hold_state": "idle",   # "idle" | "holding" | "evaluating"
    "hold_progress": 0      # 0-100 fill for frontend progress ring
}
last_landmarks = None
# cap = cv2.VideoCapture(0) # Removed: redundant with client-side capture

# ─────────────────────────────────────────────────────────────
# IMPROVEMENT 1 — FRAME SMOOTHING BUFFER
# Reference: Zhang et al. MediaPipe Hands 2020
# Average angles over last 5 frames to remove noise
# ─────────────────────────────────────────────────────────────
angle_buffer = deque(maxlen=5)

# ─────────────────────────────────────────────────────────────
# IMPROVEMENT 2 — VELOCITY-BASED HOLD DETECTION
# Reference: Gesture nucleus detection via velocity threshold
# (Mitra & Acharya, IEEE TSMCS 2007; Ohn-Bar & Trivedi 2014)
#
# Logic:
#   Every frame → compute average landmark movement vs prev frame
#   If movement < HOLD_THRESHOLD for HOLD_FRAMES consecutive frames
#   → hand is being HELD STILL → trigger MADM evaluation
#
# This enables FREE PRACTICE MODE:
#   Student can move hand naturally, system auto-detects hold phases
#   No need to click a button or hold deliberately
# ─────────────────────────────────────────────────────────────
HOLD_THRESHOLD   = 0.018   # max avg movement per landmark (normalised 0-1)
HOLD_FRAMES      = 8       # consecutive still frames needed to trigger hold
COOLDOWN_FRAMES  = 20      # frames to wait after evaluation before next hold

landmark_history     = deque(maxlen=2)   # last 2 frames for velocity
hold_frame_buffer    = deque(maxlen=HOLD_FRAMES)  # True/False per frame
cooldown_counter     = 0
hold_triggered       = False
last_auto_evaluation = {}   # stores last auto-eval result


def compute_landmark_velocity(prev_lm, curr_lm):
    """
    Compute average movement of all 21 landmarks between two frames.
    Returns normalised float. < HOLD_THRESHOLD = hand is still.
    """
    total = sum(
        abs(curr_lm.landmark[i].x - prev_lm.landmark[i].x) +
        abs(curr_lm.landmark[i].y - prev_lm.landmark[i].y)
        for i in range(21)
    )
    return total / 21


def is_hand_held(landmarks):
    """
    Returns (is_held: bool, hold_progress: int 0-100)
    hold_progress used by frontend to show a progress ring
    """
    global cooldown_counter, hold_triggered

    # During cooldown period — do not trigger again
    if cooldown_counter > 0:
        cooldown_counter -= 1
        hold_frame_buffer.clear()
        return False, 0

    if len(landmark_history) < 2:
        landmark_history.append(landmarks)
        return False, 0

    velocity = compute_landmark_velocity(landmark_history[-1], landmarks)
    landmark_history.append(landmarks)

    is_still = velocity < HOLD_THRESHOLD
    hold_frame_buffer.append(is_still)

    still_count = sum(hold_frame_buffer)
    hold_progress = int((still_count / HOLD_FRAMES) * 100)

    if still_count >= HOLD_FRAMES and not hold_triggered:
        hold_triggered = True
        cooldown_counter = COOLDOWN_FRAMES
        hold_frame_buffer.clear()
        return True, 100

    # Reset trigger when hand starts moving again
    if not is_still:
        hold_triggered = False

    return False, hold_progress


# ─────────────────────────────────────────────────────────────
# MUDRA DATA
# ─────────────────────────────────────────────────────────────
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

MUDRA_REFERENCE_ANGLES = {
    "pataka":       {"thumb": 150, "index": 170, "middle": 170, "ring": 170, "pinky": 170},
    "tripataka":    {"thumb": 150, "index": 170, "middle": 170, "ring":  50, "pinky": 170},
    "ardhapataka":  {"thumb": 150, "index": 170, "middle": 170, "ring":  50, "pinky":  50},
    "kartarimukha": {"thumb": 150, "index": 170, "middle": 170, "ring":  50, "pinky":  50},
    "mayura":       {"thumb": 120, "index": 170, "middle": 170, "ring": 120, "pinky": 170},
    "ardhachandra": {"thumb": 150, "index": 170, "middle": 170, "ring": 170, "pinky": 170},
    "arala":        {"thumb": 150, "index":  90, "middle": 170, "ring": 170, "pinky": 170},
    "shukatunda":   {"thumb": 120, "index": 170, "middle": 170, "ring":  65, "pinky": 170},
    "mushti":       {"thumb": 150, "index":  45, "middle":  45, "ring":  45, "pinky":  45},
    "shikhara":     {"thumb": 170, "index":  45, "middle":  45, "ring":  45, "pinky":  45},
    "kapittha":     {"thumb": 130, "index":  50, "middle":  50, "ring":  50, "pinky":  50},
    "katakamukha":  {"thumb": 120, "index": 120, "middle": 120, "ring": 170, "pinky": 170},
    "suchi":        {"thumb": 120, "index": 170, "middle":  45, "ring":  45, "pinky":  45},
    "chandrakala":  {"thumb": 170, "index": 170, "middle":  45, "ring":  45, "pinky":  45},
    "padmakosha":   {"thumb": 145, "index": 145, "middle": 145, "ring": 145, "pinky": 145},
    "sarpashira":   {"thumb": 150, "index": 160, "middle": 160, "ring": 160, "pinky": 160},
    "mrigashira":   {"thumb": 170, "index":  50, "middle":  50, "ring":  50, "pinky": 170},
    "simhamukha":   {"thumb": 120, "index": 170, "middle": 120, "ring": 120, "pinky": 170},
    "kangula":      {"thumb": 160, "index": 170, "middle": 170, "ring":  50, "pinky": 170},
    "alapadma":     {"thumb": 150, "index": 150, "middle": 150, "ring": 150, "pinky": 150},
    "chatura":      {"thumb":  60, "index": 170, "middle": 170, "ring": 170, "pinky": 170},
    "bhramara":     {"thumb": 120, "index":  50, "middle": 120, "ring": 170, "pinky": 170},
    "hamsasya":     {"thumb": 150, "index": 120, "middle": 170, "ring": 170, "pinky": 170},
    "tamrachuda":   {"thumb": 120, "index":  60, "middle":  50, "ring":  50, "pinky":  50},
    "trishula":     {"thumb":  60, "index": 170, "middle": 170, "ring": 170, "pinky":  60},
}

CORRECTION_THRESHOLDS = {
    "thumb": 40, "index": 25, "middle": 25, "ring": 25, "pinky": 25,
}

STRAIGHT_FINGER_MUDRAS = {
    "pataka", "tripataka", "ardhapataka", "ardhachandra",
    "arala", "sarpashira", "trishula"
}
STRAIGHT_FINGER_THRESHOLD = 15

SKIP_CORRECTION_FINGERS = {
    "mushti":      {"index", "middle", "ring", "pinky"},
    "shikhara":    {"index", "middle", "ring", "pinky"},
    "kapittha":    {"thumb", "middle", "ring", "pinky"},
    "tamrachuda":  {"index", "middle", "ring"},
    "suchi":       {"thumb"},
    "shukatunda":  {"thumb", "ring"},
    "trishula":    {"thumb", "pinky"},
    "chandrakala": {"index", "middle", "ring", "pinky"},
    "pataka":      {"thumb"},
    "katakamukha": {"ring", "pinky"},
    "padmakosha":  {"thumb", "index", "middle", "ring", "pinky"},
    "bhramara":    {"ring", "pinky"},
}


# ─────────────────────────────────────────────────────────────
# IMPROVEMENT 3 — DUAL JOINT ANGLE (MCP-PIP-DIP + PIP-DIP-TIP)
# Reference: Nambiar et al. Amrita IEEE 2024
# ─────────────────────────────────────────────────────────────
def calculate_angle(p1, p2, p3):
    v1 = np.array([p1.x - p2.x, p1.y - p2.y, p1.z - p2.z])
    v2 = np.array([p3.x - p2.x, p3.y - p2.y, p3.z - p2.z])
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 180.0
    dot_product = np.dot(v1 / norm1, v2 / norm2)
    return np.degrees(np.arccos(np.clip(dot_product, -1.0, 1.0)))


def get_finger_angles(landmarks):
    finger_joints = {
        "thumb":  (1,  2,  3,  4),
        "index":  (5,  6,  7,  8),
        "middle": (9,  10, 11, 12),
        "ring":   (13, 14, 15, 16),
        "pinky":  (17, 18, 19, 20)
    }
    angles = {}
    for name, (mcp, pip, dip, tip) in finger_joints.items():
        a1 = calculate_angle(landmarks.landmark[mcp], landmarks.landmark[pip], landmarks.landmark[dip])
        a2 = calculate_angle(landmarks.landmark[pip], landmarks.landmark[dip], landmarks.landmark[tip])
        angles[name] = (a1 * 0.6) + (a2 * 0.4)
    return angles


def get_smoothed_angles(raw_angles):
    angle_buffer.append(raw_angles)
    return {
        finger: sum(f[finger] for f in angle_buffer) / len(angle_buffer)
        for finger in raw_angles
    }


def get_landmark_list(landmarks):
    """
    Returns list of {x, y, z} for all 21 landmarks.
    Used by /api/landmarks endpoint for 3D visualisation.
    """
    return [
        {"x": lm.x, "y": lm.y, "z": lm.z}
        for lm in landmarks.landmark
    ]


def get_corrections(detected_mudra, current_angles, landmarks_ref=None):
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

        if finger in skip_fingers:
            continue

        threshold = (
            STRAIGHT_FINGER_THRESHOLD if (mudra_key in STRAIGHT_FINGER_MUDRAS and finger != "thumb")
            else CORRECTION_THRESHOLDS.get(finger, 25)
        )

        if abs_dev > threshold:
            finger_label = "little" if finger == "pinky" else finger
            target_straight = ref_angle >= 120
            more_open = actual_angle > ref_angle

            if target_straight:
                msg = ("Extend your thumb outward" if finger == "thumb" else f"Straighten your {finger_label} finger") if not more_open else f"Relax your {finger_label} finger slightly"
            else:
                msg = ("Bend your thumb inward" if finger == "thumb" else f"Curl your {finger_label} finger more") if more_open else ("Relax your thumb slightly" if finger == "thumb" else f"Uncurl your {finger_label} finger slightly")

            deviations.append((abs_dev, msg))

    if landmarks_ref:
        if mudra_key == "shukatunda":
            t, r = landmarks_ref.landmark[4], landmarks_ref.landmark[13]
            if math.sqrt((t.x-r.x)**2 + (t.y-r.y)**2) > 0.15:
                # Add to total_error to affect accuracy
                err = 40
                total_error += err
                deviations.append((err, "Press your thumb against your ring finger"))

        if mudra_key == "kapittha":
             # Kapittha: index curled, thumb presses index. 
             # Tip distance check
             t = landmarks_ref.landmark[4]
             i = landmarks_ref.landmark[8]
             dist = math.sqrt((t.x-i.x)**2 + (t.y-i.y)**2)
             if dist > 0.12:
                 err = 30
                 total_error += err
                 deviations.append((err, "Press your thumb against your index finger"))

    deviations.sort(key=lambda x: x[0], reverse=True)
    # Increase divisor from 6.5 to 10.0 for more leniency
    # Average deviation of 20 deg per finger should still give ~80%
    accuracy = max(0.0, 100.0 - (total_error / 10.0))
    return [d[1] for d in deviations], float("{:.1f}".format(accuracy))


def get_features(landmarks):
    row = []
    for lm in landmarks.landmark:
        row += [lm.x, lm.y, lm.z]
    wx, wy, wz = row[0], row[1], row[2]
    norm_row = [row[i]-wx if i%3==0 else row[i]-wy if i%3==1 else row[i]-wz for i in range(len(row))]
    max_val = max(abs(x) for x in norm_row)
    if max_val > 0:
        norm_row = [x / max_val for x in norm_row]

    def dist(a, b):
        return math.sqrt(sum((norm_row[a+k]-norm_row[b+k])**2 for k in range(3)))

    return norm_row + [dist(12,24), dist(12,36), dist(12,48), dist(12,60)] + [dist(24,15), dist(36,27), dist(48,39), dist(60,51)]


def run_madm(landmarks, target_mudra=""):
    """
    Core MADM evaluation — shared by both auto-hold and manual detect_frame.
    Returns full evaluation dict.
    """
    try:
        # ─── UPDATE GLOBAL STATE (Always, even on low confidence) ───
        global last_landmarks, last_auto_evaluation
        last_landmarks = landmarks

        features   = get_features(landmarks)
        prediction = model.predict([features])[0]
        prob_array = model.predict_proba([features])[0]
        confidence = max(prob_array) * 100

        raw_angles    = get_finger_angles(landmarks)
        finger_angles = get_smoothed_angles(raw_angles)
        eval_mudra    = target_mudra if target_mudra else prediction
        corrections, art_accuracy = get_corrections(eval_mudra, finger_angles, landmarks)

        total_accuracy = float("{:.1f}".format((confidence * 0.4) + (art_accuracy * 0.6)))

        # Update global mudra state
        current_mudra["name"]        = str(prediction)
        current_mudra["confidence"]  = float("{:.1f}".format(confidence))
        current_mudra["accuracy"]    = total_accuracy
        current_mudra["corrections"] = corrections

        # Check for sufficient confidence to mark as "detected"
        # We lower this to 30% to be more permissive during practice
        if confidence < 30:
            current_mudra["detected"] = False
            return {
                "detected": False, 
                "feedback": "Show your hand more clearly",
                "name": str(prediction), 
                "confidence": float("{:.1f}".format(confidence)), 
                "accuracy": total_accuracy, 
                "corrections": corrections,
                "meaning": MUDRA_MEANINGS.get(str(prediction), ""),
                "landmarks": get_landmark_list(landmarks)
            }

        current_mudra["detected"] = True

        feedback = (
            "Correct! Great form." if total_accuracy >= 75
            else "Try Again — almost there!" if total_accuracy >= 50
            else "Try Again — adjust your hand position."
        )

        # Also run hold detection logic here for the API feed
        held, hold_progress = is_hand_held(landmarks)
        current_mudra["hold_progress"] = hold_progress
        
        if held:
            current_mudra["hold_state"] = "evaluating"
            last_auto_evaluation = {
                "detected":    True,
                "name":        str(prediction),
                "confidence":  float("{:.1f}".format(confidence)),
                "accuracy":    total_accuracy,
                "corrections": corrections,
                "feedback":    feedback,
                "meaning":     MUDRA_MEANINGS.get(str(prediction), ""),
                "landmarks":   get_landmark_list(landmarks),
            }
            socketio.emit('auto_evaluation', last_auto_evaluation)
        elif hold_progress > 20:
            current_mudra["hold_state"] = "holding"
        else:
            current_mudra["hold_state"] = "idle"

        return {
            "detected":    True,
            "name":        str(prediction),
            "confidence":  float("{:.1f}".format(confidence)),
            "accuracy":    total_accuracy,
            "corrections": corrections,
            "feedback":    feedback,
            "meaning":     MUDRA_MEANINGS.get(str(prediction), ""),
            "landmarks":   get_landmark_list(landmarks),
        }
    except Exception as e:
        print(f"[run_madm] Error: {e}")
        current_mudra["detected"] = False
        return {"detected": False, "feedback": "Evaluation error", "name": "", "confidence": 0, "accuracy": 0, "corrections": [], "meaning": ""}


# ─── IN-MEMORY STORES ────────────────────────────────────────
session_reports = {}
class_targets   = {}


# ─── ROUTES ──────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "GestureIQ Flask API running"})


@app.route('/mudra_data', methods=['GET'])
def mudra_data():
    """
    Polled by Detect.jsx video feed mode.
    Returns current mudra state including hold_state and hold_progress
    for the frontend progress ring animation.
    """
    target = request.args.get('target', '').lower().strip()

    accuracy, corrections, meaning = 0, [], ""
    feedback = "Show your hand to the camera"

    prediction = str(current_mudra.get("name", "") or "")
    
    # Safely get confidence as float
    raw_conf = current_mudra.get("confidence", 0)
    try:
        # Use str() to handle list/dict edge cases before float cast
        confidence = float(str(raw_conf)) if raw_conf is not None else 0.0
    except (ValueError, TypeError):
        confidence = 0.0

    detected   = bool(current_mudra.get("detected", False))
    hold_state = current_mudra.get("hold_state", "idle")
    hold_progress = current_mudra.get("hold_progress", 0)

    if detected and last_landmarks:
        try:
            raw_angles   = get_finger_angles(last_landmarks)
            finger_angles = get_smoothed_angles(raw_angles)
            eval_mudra   = target if target else prediction
            corrections, art_accuracy = get_corrections(eval_mudra, finger_angles, last_landmarks)
            total_accuracy = (confidence * 0.4) + (float(art_accuracy) * 0.6)
            accuracy = float("{:.1f}".format(total_accuracy))
            feedback = (
                "Correct! Great form." if accuracy >= 75
                else "Try Again — almost there!" if accuracy >= 50
                else "Try Again — adjust your hand position."
            )
            meaning = MUDRA_MEANINGS.get(prediction, "")
        except Exception as e:
            print(f"[mudra_data] Error: {e}")

    return jsonify({
        "name": prediction, "confidence": confidence,
        "detected": detected, "accuracy": accuracy,
        "corrections": corrections, "feedback": feedback,
        "meaning": meaning, "target": target,
        "hold_state": hold_state,
        "hold_progress": hold_progress,
        "auto_result": last_auto_evaluation if hold_state == "evaluating" else None,
        "landmarks": get_landmark_list(last_landmarks) if last_landmarks else []
    })


@app.route('/api/landmarks', methods=['GET'])
def get_landmarks():
    """
    Dedicated endpoint for 3D hand visualisation component.
    Returns current 21 landmarks + reference angles for target mudra.
    Frontend Three.js component polls this at 10fps.
    """
    target = request.args.get('target', '').lower().strip()

    current_lm = get_landmark_list(last_landmarks) if last_landmarks else []
    ref_angles = MUDRA_REFERENCE_ANGLES.get(target, {})

    current_angles = {}
    if last_landmarks:
        try:
            current_angles = get_smoothed_angles(get_finger_angles(last_landmarks))
        except:
            pass

    return jsonify({
        "landmarks":      current_lm,
        "current_angles": current_angles,
        "ref_angles":     ref_angles,
        "detected":       bool(current_mudra.get("detected", False)),
        "mudra_name":     str(current_mudra.get("name", "") or ""),
    })


@app.route('/video_feed')
def video_feed():
    return jsonify({"error": "Video feed disabled. Use client-side capture via /api/detect_frame"}), 404


@app.route('/api/detect_frame', methods=['POST'])
def detect_frame():
    """
    Manual detection — called by Detect.jsx when student clicks Evaluate.
    Also used in live class mode by StaffConductClass.
    """
    data         = request.get_json(force=True)
    frame_data   = data.get('frame', '')
    target_mudra = data.get('targetMudra', '').lower().strip()

    base_response = {
        "detected": False, "name": "", "confidence": 0,
        "accuracy": 0, "corrections": [],
        "feedback": "Show your hand to the camera", "meaning": "",
        "landmarks": []
    }

    if not frame_data:
        return jsonify(base_response)

    try:
        _, encoded = frame_data.split(",", 1)
        nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify(base_response)
    except Exception as e:
        print(f"[detect_frame] Decode error: {e}")
        return jsonify(base_response)

    result = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    if not result.multi_hand_landmarks:
        return jsonify(base_response)

    return jsonify(run_madm(result.multi_hand_landmarks[0], target_mudra))


@app.route('/api/session_report', methods=['POST'])
def save_session_report():
    data = request.get_json(force=True)
    report = {
        "studentId": data.get('studentId', ''),
        "classId":   data.get('classId', ''),
        "mudraName": data.get('mudraName', ''),
        "aiScore":   data.get('aiScore', 0),
        "timeTaken": data.get('timeTaken', 0),
        "timestamp": data.get('timestamp', datetime.utcnow().isoformat() + 'Z'),
        "feedback":  "Excellent" if data.get('aiScore', 0) >= 75 else "Needs Practice"
    }
    key = f"{report['studentId']}_{report['classId']}"
    session_reports[key] = report
    print(f"[session_report] Saved: {report}")
    return jsonify(report)


@app.route('/api/session_report/<student_id>/<class_id>', methods=['GET'])
def get_session_report(student_id, class_id):
    report = session_reports.get(f"{student_id}_{class_id}")
    return jsonify(report) if report else (jsonify({"error": "Not found"}), 404)


# ─── SOCKET EVENTS ───────────────────────────────────────────

@socketio.on('join_class')
def handle_join_class(data):
    class_id = data.get('classId')
    if class_id:
        join_room(class_id)
        print(f"[socket] {request.sid} joined class {class_id}")


@socketio.on('set_target_mudra')
def handle_set_target(data):
    class_id = data.get('classId')
    target   = data.get('target')
    if class_id and target:
        class_targets[class_id] = target.lower().strip()
        class_targets["free_practice"] = target.lower().strip()
        emit('target_changed', {'target': target}, room=class_id)


@socketio.on('set_free_practice_target')
def handle_free_practice_target(data):
    """
    Called by Detect.jsx when student selects a mudra to practice.
    Sets the target for auto-hold evaluation in free practice mode.
    """
    target = data.get('target', '')
    if target:
        class_targets["free_practice"] = target.lower().strip()
        print(f"[socket] Free practice target set: {target}")


if __name__ == '__main__':
    print("GestureIQ Flask API starting on http://0.0.0.0:5001")
    socketio.run(app, host='0.0.0.0', port=5001, debug=False)