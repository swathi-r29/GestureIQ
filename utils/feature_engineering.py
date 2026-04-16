# utils/feature_engineering.py
# Standard feature extraction for single-hand mudras (83-dimensional vector).

import math
import numpy as np

def get_distance(p1, p2):
    """Calculates the Euclidean distance between two 3D points."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))

def get_angle(p1, p2, p3):
    """Calculates the angle at p2 given points p1, p2, and p3."""
    v1 = [p1[i] - p2[i] for i in range(3)]
    v2 = [p3[i] - p2[i] for i in range(3)]
    dot  = sum(v1[i] * v2[i] for i in range(3))
    mag1 = math.sqrt(sum(x**2 for x in v1)) + 1e-8
    mag2 = math.sqrt(sum(x**2 for x in v2)) + 1e-8
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / (mag1 * mag2)))))

def extract_features(landmarks, label="Right"):
    """
    Extract 82 features from one hand's 21 landmarks.
    Used by the single-hand mudra model.
    Mirrors X coords if label == "Left" so model always sees Right-hand geometry.
    """
    # 1. Convert to list of [x, y, z]
    if hasattr(landmarks[0], 'x'):
        pts = [[lm.x, lm.y, lm.z] for lm in landmarks]
    else:
        pts = [[lm[0], lm[1], lm[2]] for lm in landmarks]

    # 2. Mirror if Left hand (to normalize to Right hand model)
    if label == "Left":
        for p in pts:
            p[0] = 1.0 - p[0]

    # 3. Translate to wrist origin
    wrist = pts[0]
    pts   = [[p[0]-wrist[0], p[1]-wrist[1], p[2]-wrist[2]] for p in pts]

    # 4. Scale by palm size
    palm_size = get_distance(pts[0], pts[9]) # Wrist to Middle MCP
    if palm_size < 1e-6:
        palm_size = 1.0
    pts = [[p[0]/palm_size, p[1]/palm_size, p[2]/palm_size] for p in pts]

    features = []
    
    # - 63 Normalized Coordinates
    for p in pts:
        features.extend(p)

    # - 5 Finger Joint Angles (MCP-PIP-DIP)
    finger_joints = [
        [1, 2, 3],    # Thumb
        [5, 6, 7],    # Index
        [9, 10, 11],   # Middle
        [13, 14, 15],  # Ring
        [17, 18, 19]   # Pinky
    ]
    for j in finger_joints:
        features.append(get_angle(pts[j[0]], pts[j[1]], pts[j[2]]))

    # - 5 Tip-to-Wrist distances
    tips = [4, 8, 12, 16, 20]
    for t in tips:
        features.append(get_distance(pts[0], pts[t]))

    # - 3 Finger Gaps (Distance between adjacent fingertips)
    features.append(get_distance(pts[8],  pts[12]))  # index-middle gap
    features.append(get_distance(pts[12], pts[16]))  # middle-ring gap
    features.append(get_distance(pts[16], pts[20]))  # ring-pinky gap

    # - 5 Tip-Curl ratios (Y-diff between Tip and MCP)
    mcp = [2, 5, 9, 13, 17]
    for i, t in enumerate(tips):
        features.append(pts[t][1] - pts[mcp[i]][1])

    # - 1 Thumb-Spread ratio (Distance between thumb tip and pinky tip)
    spread = get_distance(pts[4], pts[20])
    features.append(spread)

    # Total: 63 (coords) + 5 (angles) + 5 (distances) + 3 (gaps) + 5 (curls) + 1 (spread) = 82
    return features
