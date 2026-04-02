import numpy as np
import math

def get_distance(p1, p2):
    """Compute 3D Euclidean distance between two points."""
    return math.sqrt(
        (p1[0] - p2[0])**2 +
        (p1[1] - p2[1])**2 +
        (p1[2] - p2[2])**2
    )

def get_3d_distance(lm1, lm2):
    """Compute 3D Euclidean distance between two MediaPipe landmarks (x, y, z)."""
    # Handle object-style or dict-style landmarks
    x1 = getattr(lm1, 'x', lm1.get('x') if isinstance(lm1, dict) else lm1[0])
    y1 = getattr(lm1, 'y', lm1.get('y') if isinstance(lm1, dict) else lm1[1])
    z1 = getattr(lm1, 'z', lm1.get('z') if isinstance(lm1, dict) else lm1[2])
    
    x2 = getattr(lm2, 'x', lm2.get('x') if isinstance(lm2, dict) else lm2[0])
    y2 = getattr(lm2, 'y', lm2.get('y') if isinstance(lm2, dict) else lm2[1])
    z2 = getattr(lm2, 'z', lm2.get('z') if isinstance(lm2, dict) else lm2[2])
    
    return math.sqrt((x1 - x2)**2 + (y1 - y2)**2 + (z1 - z2)**2)

def get_angle(p1, p2, p3):
    """Compute the 3D angle at p2 formed by p1-p2-p3 using dot product."""
    v1 = np.array([p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]])
    v2 = np.array([p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]])
    
    # Unit vectors
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0 # Should not happen with valid landmarks
    
    v1_u = v1 / norm1
    v2_u = v2 / norm2
    
    # Dot product clamped to [-1, 1] to avoid nan in arccos
    dot = np.clip(np.dot(v1_u, v2_u), -1.0, 1.0)
    angle = np.arccos(dot)
    return math.degrees(angle)

def extract_features(landmarks, label="Right"):
    """
    Extract 82 features from MediaPipe hand landmarks.
    landmarks: list of (x, y, z) tuples or landmark objects.
    label: "Left" or "Right" (detected handedness).
    Returns: list of 82 float features.
    """
    # 1. Convert to list of lists if needed
    pts = []
    if hasattr(landmarks[0], 'x'):
        for lm in landmarks:
            # MIRROR LOGIC: If hand is Left, we mirror x to treat as Right for the model
            x = 1.0 - lm.x if label == "Left" else lm.x
            pts.append([x, lm.y, lm.z])
    else:
        for lm in landmarks:
            x = 1.0 - lm[0] if label == "Left" else lm[0]
            pts.append([x, lm[1], lm[2]])

    # 2. Normalization
    # Wrist is landmark 0
    wrist = pts[0]
    
    # Palm size (distance between wrist 0 and middle finger MCP 9)
    palm_size = get_distance(wrist, pts[9])
    if palm_size <= 0:
        palm_size = 1e-6 # Avoid division by zero
        
    normalized_coords = []
    for p in pts:
        # Translation relative to wrist, scaling by palm size
        normalized_coords.append((p[0] - wrist[0]) / palm_size)
        normalized_coords.append((p[1] - wrist[1]) / palm_size)
        normalized_coords.append((p[2] - wrist[2]) / palm_size)
        
    # 3. Angle Features (15) - 3 joints per all 5 fingers
    # Standard MediaPipe indices:
    # Thumb: 0-1-2 (CMC), 1-2-3 (MCP), 2-3-4 (IP)
    # Fingers: 0-X-Y (MCP), X-Y-Z (PIP), Y-Z-W (DIP)
    angles = [
        # Thumb (CMC, MCP, IP)
        get_angle(pts[0], pts[1], pts[2]), 
        get_angle(pts[1], pts[2], pts[3]),
        get_angle(pts[2], pts[3], pts[4]),
        
        # Index (MCP, PIP, DIP)
        get_angle(pts[0], pts[5], pts[6]),
        get_angle(pts[5], pts[6], pts[7]),
        get_angle(pts[6], pts[7], pts[8]),
        
        # Middle (MCP, PIP, DIP)
        get_angle(pts[0], pts[9], pts[10]),
        get_angle(pts[9], pts[10], pts[11]),
        get_angle(pts[10], pts[11], pts[12]),
        
        # Ring (MCP, PIP, DIP)
        get_angle(pts[0], pts[13], pts[14]),
        get_angle(pts[13], pts[14], pts[15]),
        get_angle(pts[14], pts[15], pts[16]),
        
        # Pinky (MCP, PIP, DIP)
        get_angle(pts[0], pts[17], pts[18]),
        get_angle(pts[17], pts[18], pts[19]),
        get_angle(pts[18], pts[19], pts[20])
    ]
    
    # 4. Distance Features (4)
    # Specified pairs: 4-8, 8-12, 12-16, 16-20 (Tips)
    distances = [
        get_distance(pts[4], pts[8]) / palm_size,  # Thumb-Index
        get_distance(pts[8], pts[12]) / palm_size, # Index-Middle
        get_distance(pts[12], pts[16]) / palm_size,# Middle-Ring
        get_distance(pts[16], pts[20]) / palm_size # Ring-Pinky
    ]
    
    # Total = 63 (coords) + 15 (angles) + 4 (distances) = 82 features
    return normalized_coords + angles + distances
