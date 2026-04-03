import math
import numpy as np

def get_distance(p1, p2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))

def get_angle(p1, p2, p3):
    v1 = [p1[i] - p2[i] for i in range(3)]
    v2 = [p3[i] - p2[i] for i in range(3)]
    dot = sum(v1[i] * v2[i] for i in range(3))
    mag1 = math.sqrt(sum(x**2 for x in v1)) + 1e-8
    mag2 = math.sqrt(sum(x**2 for x in v2)) + 1e-8
    cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))

def extract_features(landmarks, label="Right"):
    """
    Extract 82 features from 21 MediaPipe hand landmarks.
    label: "Left" or "Right" — Left hand X coords are mirrored so model always sees Right.
    """
    # Convert to list of [x, y, z]
    if hasattr(landmarks[0], 'x'):
        pts = [[lm.x, lm.y, lm.z] for lm in landmarks]
    else:
        pts = [[lm[0], lm[1], lm[2]] for lm in landmarks]

    # Mirror left hand so model always sees right-hand geometry
    if label == "Left":
        pts = [[1.0 - p[0], p[1], p[2]] for p in pts]

    # Normalize relative to wrist (landmark 0)
    wrist = pts[0]
    pts = [[p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]] for p in pts]

    # Scale by palm size (wrist to middle MCP = landmark 9)
    palm_size = get_distance(pts[0], pts[9])
    if palm_size < 1e-6:
        palm_size = 1.0
    pts = [[p[0]/palm_size, p[1]/palm_size, p[2]/palm_size] for p in pts]

    features = []

    # --- 21 x 3 = 63 normalized coords ---
    for p in pts:
        features.extend(p)

    # --- 5 finger angles (MCP-PIP-DIP) ---
    finger_joints = [
        [1, 2, 3],   # thumb
        [5, 6, 7],   # index
        [9, 10, 11], # middle
        [13, 14, 15],# ring
        [17, 18, 19] # pinky
    ]
    for j in finger_joints:
        features.append(get_angle(pts[j[0]], pts[j[1]], pts[j[2]]))

    # --- 5 tip-to-wrist distances (normalized) ---
    tips = [4, 8, 12, 16, 20]
    for t in tips:
        features.append(get_distance(pts[0], pts[t]))

    # --- 4 inter-fingertip distances ---
    features.append(get_distance(pts[8], pts[12]))   # index-middle
    features.append(get_distance(pts[12], pts[16]))  # middle-ring
    features.append(get_distance(pts[16], pts[20]))  # ring-pinky
    features.append(get_distance(pts[4], pts[8]))    # thumb-index

    # --- 5 tip curl ratios (tip vs MCP y) ---
    mcp = [2, 5, 9, 13, 17]
    for i, t in enumerate(tips):
        mcp_y = pts[mcp[i]][1]
        tip_y = pts[t][1]
        features.append(tip_y - mcp_y)

    # Total: 63 + 5 + 5 + 4 + 5 = 82 features
    assert len(features) == 82, f"Feature count mismatch: {len(features)}"
    return features
