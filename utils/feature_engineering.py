import numpy as np
import math

def get_distance(p1, p2):
    """Compute 3D Euclidean distance between two points."""
    return math.sqrt(
        (p1[0] - p2[0])**2 +
        (p1[1] - p2[1])**2 +
        (p1[2] - p2[2])**2
    )

def get_angle(p1, p2, p3):
    """Compute the 3D angle at p2 formed by p1-p2-p3 using dot product."""
    v1 = np.array([p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]])
    v2 = np.array([p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]])
    
    # Unit vectors
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)
    
    # Dot product clamped to [-1, 1] to avoid nan in arccos
    dot = np.clip(np.dot(v1_u, v2_u), -1.0, 1.0)
    angle = np.arccos(dot)
    return math.degrees(angle)

def extract_features(landmarks):
    """
    Extract 72 features from MediaPipe hand landmarks.
    landmarks: list of (x, y, z) tuples or list of landmark objects with x, y, z attributes.
    Returns: list of 72 float features.
    """
    # 1. Convert to list of lists if needed
    pts = []
    if hasattr(landmarks[0], 'x'):
        for lm in landmarks:
            pts.append([lm.x, lm.y, lm.z])
    else:
        pts = landmarks

    # 2. Normalization
    # Wrist is landmark 0
    wrist = pts[0]
    
    # Palm size (distance between wrist 0 and middle finger MCP 9)
    palm_size = get_distance(wrist, pts[9])
    if palm_size == 0:
        palm_size = 1e-6 # Avoid division by zero
        
    normalized_coords = []
    for p in pts:
        # Translation relative to wrist, scaling by palm size
        normalized_coords.append((p[0] - wrist[0]) / palm_size)
        normalized_coords.append((p[1] - wrist[1]) / palm_size)
        normalized_coords.append((p[2] - wrist[2]) / palm_size)
        
    # 3. Angle Features (5)
    # Specified points: Thumb(1,2,3), Index(5,6,7), Middle(9,10,11), Ring(13,14,15), Pinky(17,18,19)
    angles = [
        get_angle(pts[1], pts[2], pts[3]),   # Thumb
        get_angle(pts[5], pts[6], pts[7]),   # Index
        get_angle(pts[9], pts[10], pts[11]), # Middle
        get_angle(pts[13], pts[14], pts[15]),# Ring
        get_angle(pts[17], pts[18], pts[19]) # Pinky
    ]
    
    # 4. Distance Features (4)
    # Specified pairs: 4-8, 8-12, 12-16, 16-20 (Tips)
    distances = [
        get_distance(pts[4], pts[8]) / palm_size,  # Thumb-Index
        get_distance(pts[8], pts[12]) / palm_size, # Index-Middle
        get_distance(pts[12], pts[16]) / palm_size,# Middle-Ring
        get_distance(pts[16], pts[20]) / palm_size # Ring-Pinky
    ]
    
    # Total = 63 (coords) + 5 (angles) + 4 (distances) = 72 features
    return normalized_coords + angles + distances
