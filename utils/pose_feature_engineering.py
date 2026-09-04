"""
utils/pose_feature_engineering.py
Centralized 3D Pose Feature Engineering, Normalization & Multi-Stance Classifier for GestureIQ
"""

import math
import numpy as np
def _to_xyz_array(landmarks):
    """
    Convert a landmark collection to a float64 NumPy array of shape (N, 3).
    Always returns exactly 3 columns so np.cross() never sees a 4-element vector.
    """
    if landmarks is None:
        return np.zeros((33, 3), dtype=np.float64)

    if isinstance(landmarks, np.ndarray):
        arr = landmarks.astype(np.float64)
        if arr.ndim == 2 and arr.shape[1] >= 3:
            return arr[:, :3]
        if arr.ndim == 1 and arr.shape[0] >= 3:
            return arr[:3].reshape(1, 3)
        return np.zeros((33, 3), dtype=np.float64)

    if hasattr(landmarks, 'landmark'):
        lms = landmarks.landmark
    else:
        lms = landmarks

    rows = []
    for lm in lms:
        if isinstance(lm, dict):
            rows.append([float(lm.get('x', 0)),
                         float(lm.get('y', 0)),
                         float(lm.get('z', 0))])
        elif hasattr(lm, 'x'):
            rows.append([float(lm.x), float(lm.y), float(lm.z)])
        elif isinstance(lm, (list, tuple)) and len(lm) >= 3:
            rows.append([float(lm[0]), float(lm[1]), float(lm[2])])
        else:
            rows.append([0.0, 0.0, 0.0])

    return np.array(rows, dtype=np.float64)


def _get_visibility(landmark):
    """Read visibility value from a single landmark regardless of data structure."""
    if isinstance(landmark, dict):
        return float(landmark.get('visibility', 1.0))
    if hasattr(landmark, 'visibility'):
        return float(landmark.visibility)
    if isinstance(landmark, (list, tuple)):
        if len(landmark) >= 4:
            return float(landmark[3])
        if len(landmark) == 3:
            return 1.0
    if isinstance(landmark, np.ndarray):
        if landmark.shape[0] >= 4:
            return float(landmark[3])
        return 1.0
    return 1.0


def check_full_body_visibility(landmarks, min_vis=0.15):
    """
    Validates visibility and geometric sanity of lower body keypoints.
    """
    if not landmarks:
        return False, ["No body detected"]

    if hasattr(landmarks, 'landmark'):
        lms = landmarks.landmark
    elif isinstance(landmarks, list):
        lms = landmarks
    else:
        return False, ["Invalid landmark structure"]

    if len(lms) < 27:
        return False, ["Lower body landmarks missing"]

    def get_y(idx):
        if hasattr(lms[idx], 'y'):
            return lms[idx].y
        if isinstance(lms[idx], dict):
            return lms[idx].get('y', 0.0)
        if isinstance(lms[idx], (list, tuple)) and len(lms[idx]) > 1:
            return lms[idx][1]
        return 0.0

    def get_vis(idx):
        if idx < len(lms):
            v = _get_visibility(lms[idx])
            y_val = get_y(idx)
            # If coordinates are validly within normalized image bounds (-0.15 to 1.15),
            # treat keypoint as present even if MediaPipe static model gave a low visibility float
            if -0.15 <= y_val <= 1.15:
                return max(v, 0.5)
            return v
        return 1.0

    missing = []
    if get_vis(11) < min_vis or get_vis(12) < min_vis:
        missing.append("Shoulders out of frame")
    if get_vis(23) < min_vis or get_vis(24) < min_vis:
        missing.append("Hips out of frame")
    if get_vis(25) < min_vis or get_vis(26) < min_vis:
        missing.append("Knees out of frame")

    # Anatomical height sanity check (MediaPipe Y is 0 at top, 1 at bottom)
    nose_y = get_y(0)
    hip_y = (get_y(23) + get_y(24)) / 2.0
    knee_y = (get_y(25) + get_y(26)) / 2.0

    if hip_y <= nose_y + 0.03:
        missing.append("Hips hallucinated on upper body/face")
    if knee_y <= hip_y + 0.02:
        missing.append("Knees collapsed on torso/face")

    return len(missing) == 0, missing


def normalize_landmarks(landmarks):
    """
    Normalizes 33 MediaPipe pose landmarks relative to hip center, torso scale,
    and projects onto the dancer's anatomical coronal plane (Perspective Invariance).
    """
    pts = _to_xyz_array(landmarks)
    if pts is None or len(pts) < 25:
        return None

    # 1. Hips center origin (joints 23 & 24)
    hip_center = (pts[23] + pts[24]) / 2.0
    centered = pts - hip_center

    # 2. Torso scale normalization
    shoulder_center = (pts[11] + pts[12]) / 2.0
    torso_vec = shoulder_center - hip_center
    torso_length = float(np.linalg.norm(torso_vec))

    if torso_length > 1e-6:
        scaled = centered / torso_length
    else:
        scaled = centered

    # 3. 3D Coronal Plane Rotation Matrix (Camera Tilt & Perspective Normalization)
    v_spine = torso_vec / (np.linalg.norm(torso_vec) + 1e-8)
    shoulder_lat = scaled[12] - scaled[11]
    u_lat = shoulder_lat / (np.linalg.norm(shoulder_lat) + 1e-8)
    w_depth = np.cross(u_lat, v_spine)
    w_depth = w_depth / (np.linalg.norm(w_depth) + 1e-8)
    u_lat_ortho = np.cross(v_spine, w_depth)

    # 3D Orthogonal Rotation Matrix [u, v, w]
    R = np.vstack([u_lat_ortho, -v_spine, w_depth])
    projected = np.dot(scaled, R.T)

    return projected


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


def classify_bharatanatyam_adavu(norm_coords, angles):
    """
    Classifies real-time dynamic Bharatanatyam Adavu move category for Freestyle Mode.
    Categories:
      - Tatta Adavu (Rhythmic Foot Strike in Araimandi)
      - Natta Adavu (Heel Touch Leg Extension)
      - Mandi Adavu (Full Squat Movement & Knee Strike)
      - Kuditta Nattadavu (Jump Elevation & Landing Strike)
      - Basic Stance / Transition
    """
    if norm_coords is None or not angles:
        return "Basic Stance / Transition", 0.50

    nc = np.array(norm_coords)
    stance = angles.get("detected_stance", "Unknown")
    lk = angles.get("left_knee", 180.0)
    rk = angles.get("right_knee", 180.0)
    le = angles.get("left_elbow", 180.0)
    re = angles.get("right_elbow", 180.0)

    ankle_dist = float(np.linalg.norm(nc[27] - nc[28]))
    ankle_y_diff = abs(nc[27][1] - nc[28][1])

    # 1. Mandi Adavu (Full Squat Movement)
    if stance == "Muzhumandi Stance" or (lk <= 95 and rk <= 95):
        return "Mandi Adavu (Full Squat Movement)", 0.90

    # 2. Natta Adavu / Prenkhana (Heel Extension to Side)
    if stance == "Prenkhana Stance" or ankle_dist > 0.85 or (abs(lk - rk) > 30 and (le < 155 or re < 155)):
        return "Natta Adavu (Heel Stretch Extension)", 0.88

    # 3. Tatta Adavu (Rhythmic Foot Strike in Araimandi)
    if stance == "Araimandi Stance" and (ankle_y_diff > 0.04 or (110 <= lk <= 140 and 110 <= rk <= 140)):
        return "Tatta Adavu (Rhythmic Foot Strike)", 0.92

    # 4. Kuditta Nattadavu / Jump Stance
    hip_height = float((nc[23][1] + nc[24][1]) / 2.0)
    if hip_height < -0.15: # Elevated hip origin relative to normalized torso
        return "Kuditta Nattadavu (Jump & Strike)", 0.85

    return "Basic Stance / Transition", 0.60


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

    # Foot Turnout Angle (Outward Feet Alignment in Parshva position)
    # Left foot vector (ankle 27 -> foot index 31), Right foot vector (ankle 28 -> foot index 32)
    left_foot_turnout = 180.0
    right_foot_turnout = 180.0
    if len(nc) >= 33:
        vec_lf = nc[31][:2] - nc[27][:2]
        vec_rf = nc[32][:2] - nc[28][:2]
        norm_lf = np.linalg.norm(vec_lf)
        norm_rf = np.linalg.norm(vec_rf)
        if norm_lf > 1e-4:
            left_foot_turnout = round(float(math.degrees(math.atan2(abs(vec_lf[1]), abs(vec_lf[0])))), 1)
        if norm_rf > 1e-4:
            right_foot_turnout = round(float(math.degrees(math.atan2(abs(vec_rf[1]), abs(vec_rf[0])))), 1)
    foot_turnout = round((left_foot_turnout + right_foot_turnout) / 2.0, 1)

    # Attami (Neck-Head side isolation relative to hip center)
    nose_x = nc[0][0] if len(nc) > 0 else 0.0
    attami_neck_offset = round(float(abs(nose_x - hip_center[0])), 3)

    # Natyarambham Elbow-Shoulder Drop Levelness
    left_elbow_drop = round(float(nc[13][1] - nc[11][1]), 3)
    right_elbow_drop = round(float(nc[14][1] - nc[12][1]), 3)

    # Geometric base distances
    ankle_distance = round(float(np.linalg.norm(nc[27] - nc[28])), 3)
    knee_distance = round(float(np.linalg.norm(nc[25] - nc[26])), 3)
    hip_distance = round(float(np.linalg.norm(nc[23] - nc[24])), 3)
    wrist_span = round(float(np.linalg.norm(nc[15] - nc[16])), 3)

    angles = {
        "left_knee": k_left,
        "right_knee": k_right,
        "left_elbow": e_left,
        "right_elbow": e_right,
        "torso_tilt": torso_tilt,
        "shoulder_tilt": shoulder_tilt,
        "foot_turnout": foot_turnout,
        "attami_neck_offset": attami_neck_offset,
        "left_elbow_drop": left_elbow_drop,
        "right_elbow_drop": right_elbow_drop,
        "ankle_distance": ankle_distance,
        "knee_distance": knee_distance,
        "hip_distance": hip_distance,
        "wrist_span": wrist_span
    }

    stance_name, stance_conf = classify_bharatanatyam_stance(angles, nc)
    angles["detected_stance"] = stance_name
    angles["stance_confidence"] = stance_conf

    # Feature vector for dynamic matching
    angles["feature_vector"] = [k_left, k_right, e_left, e_right, torso_tilt, ankle_distance * 100.0]

    return angles


PREV_SMOOTHED_ANGLES = {}

def apply_adaptive_ema_smoothing(angles):
    """
    Applies adaptive Exponential Moving Average (EMA) smoothing over joint angles.
    alpha = 0.70 when dancer is moving rapidly.
    alpha = 0.25 when holding stance to produce steady, jitter-free score output.
    """
    global PREV_SMOOTHED_ANGLES

    if not angles:
        return angles

    if not PREV_SMOOTHED_ANGLES:
        PREV_SMOOTHED_ANGLES = angles.copy()
        return angles

    delta = sum(abs(angles.get(k, 0) - PREV_SMOOTHED_ANGLES.get(k, 0)) for k in ["left_knee", "right_knee", "left_elbow", "right_elbow"]) / 4.0
    alpha = 0.70 if delta > 5.0 else 0.25

    smoothed = {}
    for key, val in angles.items():
        if isinstance(val, (int, float)):
            prev_val = PREV_SMOOTHED_ANGLES.get(key, val)
            smoothed[key] = round(float(alpha * val + (1.0 - alpha) * prev_val), 1)
        else:
            smoothed[key] = val

    PREV_SMOOTHED_ANGLES = smoothed.copy()
    return smoothed


def evaluate_body_posture_normalized(landmarks_33):
    """
    Scale-invariant and perspective-normalized posture analysis with Biomechanical Fault Matrix.
    """
    if not landmarks_33 or len(landmarks_33) < 27:
        return {"posture_score": 0.0, "corrections": ["Full body not detected."], "is_in_araimandi": False}

    # 1. Visibility Guard
    is_visible, missing = check_full_body_visibility(landmarks_33)
    if not is_visible:
        return {
            "posture_score": 0.0,
            "corrections": [f"⚠️ Step back: {', '.join(missing)}"],
            "is_in_araimandi": False,
            "partial_body": True,
            "detected_stance": "Incomplete Frame"
        }

    # 2. Extract 3D Scale & Perspective-Normalized Geometry
    norm = normalize_landmarks(landmarks_33)
    raw_angles = extract_body_angles(norm)
    if not raw_angles:
        return {"posture_score": 0.0, "corrections": ["Unable to compute 3D posture geometry."], "is_in_araimandi": False}

    # Apply adaptive EMA smoothing to eliminate score jitter
    angles = apply_adaptive_ema_smoothing(raw_angles)

    corrections = []

    # 3. Biomechanical Fault Matrix
    # Fault A: Knee Inward Sag (Valgus Collapse)
    knee_dist = angles.get("knee_distance", 1.0)
    hip_dist = angles.get("hip_distance", 0.5)
    if hip_dist > 1e-4 and knee_dist < 0.85 * hip_dist:
        corrections.append("Push your knees outward over your toes.")

    # Fault B: Asymmetrical Araimandi Knee Depth
    lk, rk = angles["left_knee"], angles["right_knee"]
    if abs(lk - rk) > 15.0:
        corrections.append("Distribute weight equally between both legs.")

    # Fault C: Lumbar Arching (Depth offset check)
    if angles["shoulder_tilt"] > 0.08:
        corrections.append("Keep your shoulders square and level.")

    if angles["torso_tilt"] > 14.0:
        corrections.append(f"Straighten your spine ({int(angles['torso_tilt'])}° tilt detected).")

    # Fault D: Drooping Elbows in Natyarambham Line
    l_drop = angles.get("left_elbow_drop", 0.0)
    r_drop = angles.get("right_elbow_drop", 0.0)
    if l_drop > 0.12 or r_drop > 0.12:
        corrections.append("Raise your elbows level with your shoulders in Natyarambham line.")

    # Fault E: Foot Turnout Alignment (Parshva Feet Position)
    foot_turnout = angles.get("foot_turnout", 180.0)
    if angles["detected_stance"] == "Araimandi Stance" and foot_turnout < 110.0:
        corrections.append("Turn your feet outward into Parshva position (180° turnout line).")

    # Stance & Araimandi Depth Evaluation
    is_in_araimandi = (100.0 <= lk <= 145.0 and 100.0 <= rk <= 145.0)

    if lk > 148.0 or rk > 148.0:
        corrections.append(f"Sit lower into Araimandi (Current: {int((lk+rk)/2)}°, Target: 115°-130°).")
    elif lk < 95.0 and rk < 95.0:
        corrections.append("You are in Muzhumandi (Full Squat). Rise slightly for Araimandi.")

    # Calculate weighted penalties
    penalties = 0.0
    if angles["shoulder_tilt"] > 0.08: penalties += 15.0
    if angles["torso_tilt"] > 14.0: penalties += min(25.0, (angles["torso_tilt"] - 14.0) * 2.0)
    if abs(lk - rk) > 15.0: penalties += 15.0
    if hip_dist > 1e-4 and knee_dist < 0.85 * hip_dist: penalties += 20.0
    if l_drop > 0.12 or r_drop > 0.12: penalties += 10.0
    if angles["detected_stance"] == "Araimandi Stance" and foot_turnout < 110.0: penalties += 10.0
    if not is_in_araimandi: penalties += min(35.0, abs(((lk + rk) / 2.0) - 120.0) * 0.7)

    posture_score = max(0.0, round(100.0 - penalties, 1))

    return {
        "posture_score": posture_score,
        "corrections": corrections if corrections else ["Excellent posture alignment!"],
        "is_in_araimandi": is_in_araimandi,
        "detected_stance": angles["detected_stance"],
        "angles": angles,
        "partial_body": False
    }


def align_and_score_choreography(student_timeline, reference_timeline):
    """
    FastDTW non-linear dynamic time-warping sequence resynchronization.
    student_timeline: List of feature vectors across time
    reference_timeline: Master benchmark sequence feature vectors
    """
    if not student_timeline or not reference_timeline:
        return {"choreography_score": 75.0, "tempo_accuracy": 100.0}

    try:
        from fastdtw import fastdtw
        from scipy.spatial.distance import euclidean
        distance, path = fastdtw(student_timeline, reference_timeline, dist=euclidean)
        alignment_scores = []
        for s_idx, r_idx in path:
            s_feat = student_timeline[s_idx]
            r_feat = reference_timeline[r_idx]
            error = sum(abs(s - r) for s, r in zip(s_feat, r_feat)) / len(s_feat)
            alignment_scores.append(max(0.0, 100.0 - (error * 1.5)))

        return {
            "choreography_score": round(sum(alignment_scores) / max(1, len(alignment_scores)), 1),
            "tempo_accuracy": round((len(student_timeline) / max(1, len(reference_timeline))) * 100.0, 1)
        }
    except Exception:
        errs = []
        min_len = min(len(student_timeline), len(reference_timeline))
        for i in range(min_len):
            e = sum(abs(s - r) for s, r in zip(student_timeline[i], reference_timeline[i])) / len(student_timeline[i])
            errs.append(max(0.0, 100.0 - (e * 1.5)))
        avg_score = round(sum(errs) / max(1, len(errs)), 1) if errs else 75.0
        return {"choreography_score": avg_score, "tempo_accuracy": 100.0}


from collections import deque
POSE_LANDMARK_BUFFER = deque(maxlen=5)

def get_smoothed_or_fallback_landmarks(current_landmarks):
    """
    Returns smoothed landmarks if tracking is good.
    If landmarks drop temporarily (grace period of 5 frames),
    returns the last valid frame instead of failing.
    """
    global POSE_LANDMARK_BUFFER

    is_valid = current_landmarks is not None and len(current_landmarks) >= 27

    if is_valid:
        POSE_LANDMARK_BUFFER.append(current_landmarks)
        return current_landmarks, False  # (landmarks, is_fallback_used)

    if len(POSE_LANDMARK_BUFFER) > 0:
        # Fall back to the most recent valid frame
        return POSE_LANDMARK_BUFFER[-1], True

    return None, False


class OneEuroFilter:
    def __init__(self, t0, x0, min_cutoff=1.0, beta=0.007, d_cutoff=1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = np.array(x0, dtype=float)
        self.dx_prev = np.zeros_like(self.x_prev)
        self.t_prev = float(t0)

    def smoothing_factor(self, t_e, cutoff):
        r = 2 * math.pi * cutoff * t_e
        return r / (r + 1)

    def exponential_smoothing(self, a, x, x_prev):
        return a * x + (1 - a) * x_prev

    def filter(self, t, x):
        t_e = max(t - self.t_prev, 1e-4)
        x = np.array(x, dtype=float)

        # Estimate velocity
        a_d = self.smoothing_factor(t_e, self.d_cutoff)
        dx = (x - self.x_prev) / t_e
        dx_hat = self.exponential_smoothing(a_d, dx, self.dx_prev)

        # Adaptive cutoff frequency
        cutoff = self.min_cutoff + self.beta * np.abs(dx_hat)
        a = self.smoothing_factor(t_e, cutoff)
        x_hat = self.exponential_smoothing(a, x, self.x_prev)

        self.x_prev = x_hat
        self.dx_prev = dx_hat
        self.t_prev = float(t)
        return x_hat


_ONE_EURO_ANGLE_FILTER = None

def apply_perspective_normalization(coords_33):
    """
    Rotates 3D landmarks onto the dancer's coronal anatomical plane.
    Removes upward laptop tilt and lateral camera skew.
    """
    if coords_33 is None or len(coords_33) < 25:
        return coords_33

    coords = np.array(coords_33, dtype=float)
    hip_center = (coords[23] + coords[24]) / 2.0
    shoulder_center = (coords[11] + coords[12]) / 2.0

    # 1. Vertical Spine Vector (Y-basis)
    v_spine = shoulder_center - hip_center
    v_spine_norm = np.linalg.norm(v_spine)
    if v_spine_norm < 1e-6:
        return coords
    ey = v_spine / v_spine_norm

    # 2. Horizontal Shoulder Vector (X-basis)
    v_sh = coords[12] - coords[11]
    v_sh_norm = np.linalg.norm(v_sh)
    if v_sh_norm < 1e-6:
        return coords
    ex = v_sh / v_sh_norm

    # 3. Depth Vector (Z-basis orthogonal to body plane)
    ez = np.cross(ex, ey)
    ez_norm = np.linalg.norm(ez)
    if ez_norm < 1e-6:
        return coords
    ez = ez / ez_norm

    # Re-orthogonalize X-basis
    ex = np.cross(ey, ez)

    # 3x3 Coronal Rotation Matrix
    R = np.vstack([ex, ey, ez])

    # Rotate origin-centered landmarks
    centered = coords - hip_center
    rotated = np.dot(centered, R.T)

    # 4. Camera Upward Pitch Calibration (Laptop Desk Mode)
    # Cancels vertical Z-depth offset caused by low upward-pointing camera
    pitch = math.atan2(v_spine[2], max(1e-4, abs(v_spine[1])))
    if abs(pitch) > 0.05: # > ~3 degrees
        cos_p = math.cos(-pitch)
        sin_p = math.sin(-pitch)
        R_pitch = np.array([
            [1.0, 0.0, 0.0],
            [0.0, cos_p, -sin_p],
            [0.0, sin_p, cos_p]
        ])
        rotated = np.dot(rotated, R_pitch.T)

    return rotated


def smooth_joint_angles(raw_angles_dict, timestamp_sec):
    """
    Applies adaptive One-Euro filtering across angular outputs.
    """
    global _ONE_EURO_ANGLE_FILTER
    if not raw_angles_dict:
        return raw_angles_dict

    keys = ["left_knee", "right_knee", "left_elbow", "right_elbow", "torso_tilt", "shoulder_tilt"]
    raw_vec = [raw_angles_dict.get(k, 180.0) for k in keys]

    if _ONE_EURO_ANGLE_FILTER is None:
        _ONE_EURO_ANGLE_FILTER = OneEuroFilter(timestamp_sec, raw_vec)
        return raw_angles_dict

    smoothed_vec = _ONE_EURO_ANGLE_FILTER.filter(timestamp_sec, raw_vec)
    for i, k in enumerate(keys):
        raw_angles_dict[k] = round(float(smoothed_vec[i]), 1)
    return raw_angles_dict


def extract_pose_features(landmarks):
    """
    Extract a compact, normalised feature vector from 33 MediaPipe pose landmarks.
    """
    pts = _to_xyz_array(landmarks)
    if pts.shape[0] < 29:
        return np.zeros(132, dtype=np.float64)

    norm_pts = normalize_landmarks(pts)
    coord_feats = norm_pts.flatten() if norm_pts is not None else np.zeros(99)

    def _safe_norm(v):
        n = np.linalg.norm(v)
        return n if n > 1e-8 else 1e-8

    def angle(a, b, c):
        va = pts[a] - pts[b]
        vc = pts[c] - pts[b]
        cos_t = np.dot(va, vc) / (_safe_norm(va) * _safe_norm(vc))
        return float(np.degrees(np.arccos(np.clip(cos_t, -1.0, 1.0))))

    angles = np.array([
        angle(11, 13, 15), angle(12, 14, 16), angle(13, 11, 23),
        angle(14, 12, 24), angle(23, 25, 27), angle(24, 26, 28),
        angle(11, 23, 25), angle(12, 24, 26), angle(23, 0, 24),
    ], dtype=np.float64)

    key_pairs = [
        (15, 16), (15, 23), (16, 24), (15, 11), (16, 12), (15, 12), (16, 11),
        (13, 14), (25, 26), (27, 28), (15, 25), (16, 26), (11, 24), (12, 23),
        (0, 23), (0, 24)
    ]
    spine_len = _safe_norm(((pts[11] + pts[12]) / 2) - ((pts[23] + pts[24]) / 2))
    dists = np.array([np.linalg.norm(pts[a] - pts[b]) / spine_len for a, b in key_pairs], dtype=np.float64)
    velocity = np.zeros(8, dtype=np.float64)

    return np.concatenate([coord_feats, angles, dists, velocity])


def compute_frame_similarity(ref_landmarks, user_landmarks):
    """
    Return a similarity score in [0, 1] between two sets of pose landmarks.
    """
    ref_pts = _to_xyz_array(ref_landmarks)
    user_pts = _to_xyz_array(user_landmarks)

    n = min(ref_pts.shape[0], user_pts.shape[0])
    if n == 0:
        return 0.0

    ref_pts = ref_pts[:n]
    user_pts = user_pts[:n]

    ref_vis = np.array([_get_visibility(lm) for lm in list(ref_landmarks)[:n]], dtype=np.float64) if isinstance(ref_landmarks, (list, tuple)) else np.ones(n)
    weights = np.clip(ref_vis, 0.0, 1.0)
    total_w = weights.sum()
    if total_w < 1e-8:
        weights = np.ones(n, dtype=np.float64)
        total_w = float(n)

    ref_norm = normalize_landmarks(ref_pts)
    user_norm = normalize_landmarks(user_pts)

    if ref_norm is None or user_norm is None:
        return 0.0

    dists = np.linalg.norm(ref_norm - user_norm, axis=1)
    mean_dist = float(np.dot(dists, weights) / total_w)
    similarity = float(np.exp(-mean_dist * 1.2))
    return float(np.clip(similarity, 0.0, 1.0))


def dtw_sequence_similarity(ref_sequence, user_sequence):
    """
    Dynamic Time Warping similarity between two pose sequences.
    """
    n = len(ref_sequence)
    m = len(user_sequence)

    if n == 0 or m == 0:
        return 0.0

    cost = np.full((n, m), np.inf, dtype=np.float64)

    def frame_dist(r_lms, u_lms):
        sim = compute_frame_similarity(r_lms, u_lms)
        return 1.0 - sim

    cost[0, 0] = frame_dist(ref_sequence[0], user_sequence[0])

    for i in range(1, n):
        cost[i, 0] = cost[i-1, 0] + frame_dist(ref_sequence[i], user_sequence[0])

    for j in range(1, m):
        cost[0, j] = cost[0, j-1] + frame_dist(ref_sequence[0], user_sequence[j])

    for i in range(1, n):
        for j in range(1, m):
            d = frame_dist(ref_sequence[i], user_sequence[j])
            cost[i, j] = d + min(cost[i-1, j], cost[i, j-1], cost[i-1, j-1])

    dtw_dist = float(cost[n-1, m-1]) / (n + m)
    similarity = float(np.exp(-dtw_dist * 2.0))
    return float(np.clip(similarity, 0.0, 1.0))