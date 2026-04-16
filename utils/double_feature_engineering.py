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

def _extract_single_hand_features(landmarks, label="Right"):
    """
    Extract 82 features from one hand's 21 landmarks.
    Fully vectorized with NumPy for maximum performance.
    """
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

    finger_joints = [                 # 5 MCP-PIP-DIP angles
        [1, 2, 3], [5, 6, 7], [9, 10, 11], [13, 14, 15], [17, 18, 19]
    ]
    for j in finger_joints:
        features.append(get_angle(pts[j[0]], pts[j[1]], pts[j[2]]))

    tips = [4, 8, 12, 16, 20]
    for t in tips:                    # 5 tip-to-wrist distances
        features.append(float(np.linalg.norm(pts[t])))

    features.append(float(np.linalg.norm(pts[8] - pts[12])))  # index-middle gap
    features.append(float(np.linalg.norm(pts[12] - pts[16]))) # middle-ring gap
    features.append(float(np.linalg.norm(pts[16] - pts[20]))) # ring-pinky gap
    
    mcp = [2, 5, 9, 13, 17]
    for i, t in enumerate(tips):     # 5 tip-curl ratios
        features.append(float(pts[t, 1] - pts[mcp[i], 1]))

    spread = float(np.linalg.norm(pts[4] - pts[20]))
    features.append(spread)

    assert len(features) == 82, f"Single-hand feature count: {len(features)}"
    return features


def extract_double_features(left_landmarks, right_landmarks,
                             left_label="Left", right_label="Right"):
    """
    Combine features from both hands into a single 164-dim vector.
    """
    if right_landmarks is not None:
        right_feats = _extract_single_hand_features(right_landmarks, label=right_label)
    else:
        right_feats = [0.0] * 82

    if left_landmarks is not None:
        left_feats = _extract_single_hand_features(left_landmarks, label=left_label)
    else:
        left_feats = [0.0] * 82

    features = right_feats + left_feats   # right hand first, then left
    assert len(features) == 164, f"Double-hand feature count: {len(features)}"
    return features


def extract_double_features_from_csv_row(row_values):
    """
    Reconstruct both hands from a flat CSV row.
    """
    def parse_hand(vals):
        pts = []
        for i in range(0, 63, 3):
            pts.append([float(vals[i]), float(vals[i+1]), float(vals[i+2])])
        return pts

    # Detect layout
    if len(row_values) >= 126:      # two hands present
        hand1_pts   = parse_hand(row_values[:63])
        # hand1_label = str(row_values[63]).strip() if len(row_values) > 63 else "Right"
        hand2_pts   = parse_hand(row_values[64:127])
        return extract_double_features(hand2_pts, hand1_pts, "Left", "Right")
    else:                           # single hand
        hand1_pts   = parse_hand(row_values[:63])
        return extract_double_features(None, hand1_pts, "Left", "Right")