# utils/double_feature_engineering.py
# Handles normalization and feature extraction for BOTH hands (42 landmarks total).
# Optimized with NumPy vectorization for high-FPS "heavy movement" scenarios.

import numpy as np

def get_distance(p1, p2):
    """Calculates the Euclidean distance using NumPy for speed."""
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))

def get_angle(p1, p2, p3):
    """Calculates the angle at p2 using NumPy vectorization."""
    v1 = np.array(p1) - np.array(p2)
    v2 = np.array(p3) - np.array(p2)
    
    # Unit vectors
    v1_u = v1 / (np.linalg.norm(v1) + 1e-8)
    v2_u = v2 / (np.linalg.norm(v2) + 1e-8)
    
    # Dot product clipped to [-1, 1] for arccos safety
    angle = np.degrees(np.arccos(np.clip(np.dot(v1_u, v2_u), -1.0, 1.0)))
    return float(angle)

def _to_np_coords(landmarks):
    if landmarks is None:
        return None
    if hasattr(landmarks[0], 'x'):
        return np.array([[lm.x, lm.y, lm.z] for lm in landmarks])
    else:
        return np.array([[lm[0], lm[1], lm[2]] for lm in landmarks])

def _extract_single_hand_features(landmarks, label="Right"):
    if hasattr(landmarks[0], 'x'):
        pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])
    else:
        pts = np.array([[lm[0], lm[1], lm[2]] for lm in landmarks])

    if label == "Left":
        pts[:, 0] = 1.0 - pts[:, 0]

    # Translate to wrist origin
    pts = pts - pts[0]

    # Scale by palm size
    palm_size = np.linalg.norm(pts[9])
    if palm_size < 1e-6:
        palm_size = 1.0
    pts = pts / palm_size

    features = []
    features.extend(pts.flatten().tolist()) # 63 normalized coords

    finger_joints = [
        [1, 2, 3], [5, 6, 7], [9, 10, 11], [13, 14, 15], [17, 18, 19]
    ]
    for j in finger_joints:
        features.append(get_angle(pts[j[0]], pts[j[1]], pts[j[2]]))

    tips = [4, 8, 12, 16, 20]
    for t in tips:
        features.append(float(np.linalg.norm(pts[t])))

    features.append(float(np.linalg.norm(pts[8] - pts[12])))
    features.append(float(np.linalg.norm(pts[12] - pts[16])))
    features.append(float(np.linalg.norm(pts[16] - pts[20])))
    
    mcp = [2, 5, 9, 13, 17]
    for i, t in enumerate(tips):
        features.append(float(pts[t, 1] - pts[mcp[i], 1]))

    spread = float(np.linalg.norm(pts[4] - pts[20]))
    features.append(spread)

    assert len(features) == 82, f"Single-hand feature count: {len(features)}"
    return features, pts # Return raw point representations along with arrays


def extract_double_features(left_landmarks, right_landmarks,
                             left_label="Left", right_label="Right"):
    """
    Combine features from both hands into a single interactive feature vector.
    Total length: 82 (Right) + 82 (Left) + 2 (Interaction metrics) = 166-dimensions.
    """
    if right_landmarks is not None:
        right_feats, _ = _extract_single_hand_features(right_landmarks, label=right_label)
    else:
        right_feats = [0.0] * 82

    if left_landmarks is not None:
        left_feats, _ = _extract_single_hand_features(left_landmarks, label=left_label)
    else:
        left_feats = [0.0] * 82

    # Global cross-hand features to separate Kilaka/Kurma/Bherunda
    # Calculated on raw coordinates and scale-normalized by average palm size
    if right_landmarks is not None and left_landmarks is not None:
        r_orig = _to_np_coords(right_landmarks)
        l_orig = _to_np_coords(left_landmarks)
        
        r_palm = np.linalg.norm(r_orig[9] - r_orig[0])
        l_palm = np.linalg.norm(l_orig[9] - l_orig[0])
        avg_palm = (r_palm + l_palm) / 2.0
        if avg_palm < 1e-6:
            avg_palm = 1.0

        # 1. Wrist-to-Wrist Distance ratio
        wrist_interaction = float(np.linalg.norm(r_orig[0] - l_orig[0])) / avg_palm
        # 2. Pinky-Tip to Pinky-Tip Distance ratio
        pinky_interaction = float(np.linalg.norm(r_orig[20] - l_orig[20])) / avg_palm
    else:
        wrist_interaction = 0.0
        pinky_interaction = 0.0

    features = right_feats + left_feats + [wrist_interaction, pinky_interaction]
    assert len(features) == 166, f"Double-hand feature count: {len(features)}"
    return features


def extract_double_features_from_csv_row(row_values):
    def parse_hand(vals):
        pts = []
        for i in range(0, 63, 3):
            pts.append([float(vals[i]), float(vals[i+1]), float(vals[i+2])])
        return pts

    # Secure boundary limits to clear column index displacement leaks
    if len(row_values) >= 128:
        hand1_pts = parse_hand(row_values[0:63])
        hand2_pts = parse_hand(row_values[64:127])
        return extract_double_features(hand2_pts, hand1_pts, "Left", "Right")
    else:
        hand1_pts = parse_hand(row_values[0:63])
        return extract_double_features(None, hand1_pts, "Left", "Right")