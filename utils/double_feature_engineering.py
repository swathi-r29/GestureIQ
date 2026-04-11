
# utils/double_feature_engineering.py
# Handles normalization and feature extraction for BOTH hands (42 landmarks total).
# For single-hand mudras the missing hand gets zero-filled so the vector is always 166-dim.

import math
import numpy as np

def get_distance(p1, p2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))

def get_angle(p1, p2, p3):
    v1 = [p1[i] - p2[i] for i in range(3)]
    v2 = [p3[i] - p2[i] for i in range(3)]
    dot  = sum(v1[i] * v2[i] for i in range(3))
    mag1 = math.sqrt(sum(x**2 for x in v1)) + 1e-8
    mag2 = math.sqrt(sum(x**2 for x in v2)) + 1e-8
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / (mag1 * mag2)))))

def _extract_single_hand_features(landmarks, label="Right"):
    """
    Extract 83 features from one hand's 21 landmarks.
    Returns a 83-element list.
    Mirrors X coords if label == "Left" so model always sees Right-hand geometry.
    """
    if hasattr(landmarks[0], 'x'):
        pts = [[lm.x, lm.y, lm.z] for lm in landmarks]
    else:
        pts = [[lm[0], lm[1], lm[2]] for lm in landmarks]

    if label == "Left":
        for p in pts:
            p[0] = 1.0 - p[0]

    wrist = pts[0]
    pts   = [[p[0]-wrist[0], p[1]-wrist[1], p[2]-wrist[2]] for p in pts]

    palm_size = get_distance(pts[0], pts[9])
    if palm_size < 1e-6:
        palm_size = 1.0
    pts = [[p[0]/palm_size, p[1]/palm_size, p[2]/palm_size] for p in pts]

    features = []
    for p in pts:                     # 63 normalized coords
        features.extend(p)

    finger_joints = [                 # 5 MCP-PIP-DIP angles
        [1, 2, 3], [5, 6, 7], [9, 10, 11], [13, 14, 15], [17, 18, 19]
    ]
    for j in finger_joints:
        features.append(get_angle(pts[j[0]], pts[j[1]], pts[j[2]]))

    tips = [4, 8, 12, 16, 20]
    for t in tips:                    # 5 tip-to-wrist distances
        features.append(get_distance(pts[0], pts[t]))

    features.append(get_distance(pts[8],  pts[12]))  # index-middle gap
    features.append(get_distance(pts[12], pts[16]))  # middle-ring gap
    features.append(get_distance(pts[16], pts[20]))  # ring-pinky gap
    features.append(get_distance(pts[4],  pts[8]))   # thumb-index gap

    mcp = [2, 5, 9, 13, 17]
    for i, t in enumerate(tips):     # 5 tip-curl ratios
        features.append(pts[t][1] - pts[mcp[i]][1])

    # Total: 63+5+5+4+5 = 82 features + 1 thumb-spread ratio = 83
    spread = get_distance(pts[4], pts[20])
    features.append(spread)

    assert len(features) == 83, f"Single-hand feature count: {len(features)}"
    return features


def extract_double_features(left_landmarks, right_landmarks,
                             left_label="Left", right_label="Right"):
    """
    Combine features from both hands into a single 166-dim vector.
    Pass None for a missing hand — it gets zero-filled (83 zeros).

    Args:
        left_landmarks:  21-point list or None
        right_landmarks: 21-point list or None
        left_label:      "Left"  (default)
        right_label:     "Right" (default)

    Returns:
        list of 166 floats
    """
    if right_landmarks is not None:
        right_feats = _extract_single_hand_features(right_landmarks, label=right_label)
    else:
        right_feats = [0.0] * 83

    if left_landmarks is not None:
        left_feats = _extract_single_hand_features(left_landmarks, label=left_label)
    else:
        left_feats = [0.0] * 83

    features = right_feats + left_feats   # right hand first, then left
    assert len(features) == 166, f"Double-hand feature count: {len(features)}"
    return features


def extract_double_features_from_csv_row(row_values):
    """
    Reconstruct both hands from a flat CSV row.
    Expected layout: [x0,y0,z0,...x20,y20,z20, hand0_label,
                      x0,y0,z0,...x20,y20,z20, hand1_label]
    or single-hand rows (63 values + label).

    Returns 166-dim feature vector.
    """
    def parse_hand(vals, label):
        pts = []
        for i in range(0, 63, 3):
            pts.append([float(vals[i]), float(vals[i+1]), float(vals[i+2])])
        return pts

    # Detect layout
    if len(row_values) >= 126:      # two hands present
        hand1_pts   = parse_hand(row_values[:63],  "Right")
        hand1_label = str(row_values[63]).strip() if len(row_values) > 63 else "Right"
        hand2_pts   = parse_hand(row_values[64:127], "Left")
        return extract_double_features(hand2_pts, hand1_pts, "Left", hand1_label)
    else:                           # single hand — treat as right, zero-fill left
        hand1_pts   = parse_hand(row_values[:63],  "Right")
        return extract_double_features(None, hand1_pts, "Left", "Right")