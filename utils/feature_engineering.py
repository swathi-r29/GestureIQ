# utils/feature_engineering.py
# Standard feature extraction for single-hand mudras (83-dimensional vector).
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

def extract_features(landmarks, label="Right"):
    """
    Extract 82 features from one hand's 21 landmarks.
    Used by the single-hand mudra model.
    Fully vectorized with NumPy for maximum performance.
    """
    # 1. Convert to NumPy array [21, 3]
    if hasattr(landmarks[0], 'x'):
        pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])
    else:
        pts = np.array([[lm[0], lm[1], lm[2]] for lm in landmarks])

    # 2. Mirror if Left hand (to normalize to Right hand model)
    if label == "Left":
        pts[:, 0] = 1.0 - pts[:, 0]

    # 3. Translate to wrist origin
    pts = pts - pts[0]

    # 4. Scale by palm size (Wrist to Middle MCP)
    palm_size = np.linalg.norm(pts[9]) 
    if palm_size < 1e-6:
        palm_size = 1.0
    pts = pts / palm_size

    features = []
    
    # - 63 Normalized Coordinates
    features.extend(pts.flatten().tolist())

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
        features.append(float(np.linalg.norm(pts[t])))

    # - 3 Finger Gaps (Distance between adjacent fingertips)
    features.append(float(np.linalg.norm(pts[8] - pts[12])))  # index-middle gap
    features.append(float(np.linalg.norm(pts[12] - pts[16]))) # middle-ring gap
    features.append(float(np.linalg.norm(pts[16] - pts[20]))) # ring-pinky gap

    # - 5 Tip-Curl ratios (Y-diff between Tip and MCP)
    mcp = [2, 5, 9, 13, 17]
    for i, t in enumerate(tips):
        features.append(float(pts[t, 1] - pts[mcp[i], 1]))

    # - 5 Tip-to-Wrist Z-depth differences (helps with "Hooded" vs "Flat" hands)
    for t in tips:
        features.append(float(pts[t, 2])) # Z-coord relative to wrist (pts[0] is 0,0,0)

    # Total: 63 (coords) + 5 (angles) + 5 (distances) + 3 (gaps) + 5 (curls) + 1 (spread) + 5 (depths) = 87
    return features
