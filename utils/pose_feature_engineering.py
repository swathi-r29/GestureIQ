"""
utils/pose_feature_engineering.py
Centralized 3D Pose Feature Engineering, Normalization & Multi-Stance Classifier for GestureIQ
"""

import math
import numpy as np


def check_full_body_visibility(landmarks, min_vis=0.45):
    """
    Checks if key body parts (shoulders 11,12, hips 23,24, knees 25,26) are in camera frame.
    Returns (is_visible, list_of_missing_parts).
    """
    if not landmarks:
        return False, ["No body detected"]

    if hasattr(landmarks, 'landmark'):
        lm_list = landmarks.landmark
        if len(lm_list) < 27:
            return False, ["Lower body not detected"]

        missing = []
        if lm_list[11].visibility < min_vis or lm_list[12].visibility < min_vis:
            missing.append("Shoulders out of frame")
        if lm_list[23].visibility < min_vis or lm_list[24].visibility < min_vis:
            missing.append("Hips out of frame")
        if lm_list[25].visibility < min_vis or lm_list[26].visibility < min_vis:
            missing.append("Knees out of frame")

        return len(missing) == 0, missing

    elif isinstance(landmarks, list) and len(landmarks) >= 27:
        missing = []
        # Support dict format with 'visibility' key if provided by client
        if isinstance(landmarks[0], dict) and 'visibility' in landmarks[0]:
            if landmarks[11].get('visibility', 1.0) < min_vis or landmarks[12].get('visibility', 1.0) < min_vis:
                missing.append("Shoulders out of frame")
            if landmarks[23].get('visibility', 1.0) < min_vis or landmarks[24].get('visibility', 1.0) < min_vis:
                missing.append("Hips out of frame")
            if landmarks[25].get('visibility', 1.0) < min_vis or landmarks[26].get('visibility', 1.0) < min_vis:
                missing.append("Knees out of frame")
            return len(missing) == 0, missing

    return True, []


def normalize_landmarks(landmarks):
    """
    Normalizes 33 MediaPipe pose landmarks relative to hip center and torso length.
    Supports MediaPipe landmark objects, lists of dicts [{'x', 'y', 'z'}], or numpy arrays.
    """
    if not landmarks:
        return None

    if hasattr(landmarks, 'landmark'):
        coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark])
    elif isinstance(landmarks, list):
        if len(landmarks) == 0:
            return None
        if isinstance(landmarks[0], dict):
            coords = np.array([[lm.get('x', 0.0), lm.get('y', 0.0), lm.get('z', 0.0)] for lm in landmarks])
        else:
            coords = np.array(landmarks)
    elif isinstance(landmarks, np.ndarray):
        coords = landmarks
    else:
        return None

    if len(coords) < 25:
        return None

    # Hips center (joints 23 & 24)
    hip_center = (coords[23] + coords[24]) / 2.0
    centered = coords - hip_center

    # Torso length (distance between hip center and shoulder center 11 & 12)
    shoulder_center = (coords[11] + coords[12]) / 2.0
    torso_length = float(np.linalg.norm(shoulder_center - hip_center))

    if torso_length > 1e-6:
        normalized = centered / torso_length
    else:
        normalized = centered

    return normalized


def calculate_angle_3d(a, b, c):
    """Calculates 3D joint angle at vertex 'b' in degrees."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba * norm_bc == 0:
        return 0.0
    dot = np.dot(ba, bc)
    cosine = np.clip(dot / (norm_ba * norm_bc), -1.0, 1.0)
    return round(float(math.degrees(math.acos(cosine))), 1)


def classify_bharatanatyam_stance(angles, norm_coords):
    """
    Deterministic rule-based stance classification for classical Bharatanatyam Sthanakas.
    """
    lk = angles["left_knee"]
    rk = angles["right_knee"]
    tilt = angles["torso_tilt"]
    avg_knee = (lk + rk) / 2.0

    nc = np.array(norm_coords)
    # Ankle distance normalized by torso length (27: left ankle, 28: right ankle)
    ankle_dist = float(np.linalg.norm(nc[27] - nc[28]))
    # Knee turnout width (25: left knee, 26: right knee)
    knee_width = float(np.linalg.norm(nc[25] - nc[26]))

    # Swastika (Crossed legs - Left and Right ankle X positions inverted)
    # In MediaPipe coords, left ankle (27) is normally on the left of right ankle (28) in camera view
    if nc[27][0] > nc[28][0] and avg_knee < 155:
        return "Swastika Stance", 0.90

    # Muzhumandi (Full squat)
    if lk <= 90 and rk <= 90:
        conf = min(1.0, (90.0 - avg_knee) / 30.0 + 0.65)
        return "Muzhumandi Stance", round(conf, 2)

    # Araimandi (Half-seated mandala)
    if 100 <= lk <= 145 and 100 <= rk <= 145:
        conf = 1.0 - (abs(avg_knee - 120.0) / 35.0)
        return "Araimandi Stance", round(max(0.60, conf), 2)

    # Samapada (Straight upright standing)
    if lk >= 162 and rk >= 162 and ankle_dist < 0.65:
        conf = 1.0 - (abs(avg_knee - 175.0) / 20.0)
        return "Samapada Stance", round(max(0.70, conf), 2)

    # Prenkhana (One leg bent in Araimandi, one leg stretched straight)
    if (lk < 135 and rk > 158) or (rk < 135 and lk > 158):
        return "Prenkhana Stance", 0.85

    return "Transition / Movement", 0.50


def extract_body_angles(norm_coords):
    """
    Extracts key anatomical Bharatanatyam posture angles, distances, and stance classification.
    """
    if norm_coords is None:
        return None

    nc = np.array(norm_coords)
    if len(nc) < 29:
        return None

    k_left = calculate_angle_3d(nc[23], nc[25], nc[27])
    k_right = calculate_angle_3d(nc[24], nc[26], nc[28])
    e_left = calculate_angle_3d(nc[11], nc[13], nc[15])
    e_right = calculate_angle_3d(nc[12], nc[14], nc[16])

    # Spine / Torso tilt relative to vertical Y axis
    shoulder_center = (nc[11] + nc[12]) / 2.0
    hip_center = (nc[23] + nc[24]) / 2.0
    spine_vec = shoulder_center - hip_center
    torso_tilt = round(float(math.degrees(math.atan2(abs(spine_vec[0]), abs(spine_vec[1])))), 1)

    # Shoulder tilt (levelness)
    shoulder_tilt = round(float(abs(nc[11][1] - nc[12][1])), 3)

    # Geometric base distances
    ankle_distance = round(float(np.linalg.norm(nc[27] - nc[28])), 3)
    wrist_span = round(float(np.linalg.norm(nc[15] - nc[16])), 3)

    angles = {
        "left_knee": k_left,
        "right_knee": k_right,
        "left_elbow": e_left,
        "right_elbow": e_right,
        "torso_tilt": torso_tilt,
        "shoulder_tilt": shoulder_tilt,
        "ankle_distance": ankle_distance,
        "wrist_span": wrist_span
    }

    stance_name, stance_conf = classify_bharatanatyam_stance(angles, nc)
    angles["detected_stance"] = stance_name
    angles["stance_confidence"] = stance_conf

    # Feature vector for dynamic matching
    angles["feature_vector"] = [k_left, k_right, e_left, e_right, torso_tilt, ankle_distance * 100.0]

    return angles