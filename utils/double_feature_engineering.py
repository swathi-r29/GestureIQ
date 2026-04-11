"""
Double-Hand Feature Engineering
=================================
Extracts 187 features from 42 landmarks (21 per hand):
  - 63 normalized coords per hand      = 126
  - 5 finger angles per hand           =  10
  - 5 tip distances per hand           =  10
  - 4 inter-finger distances per hand  =   8
  - 5 curl ratios per hand             =  10
  - Inter-hand features                =  23
  Total                                = 187
"""

import math
import numpy as np

def get_distance(p1, p2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))

def get_angle(p1, p2, p3):
    v1  = [p1[i] - p2[i] for i in range(3)]
    v2  = [p3[i] - p2[i] for i in range(3)]
    dot = sum(v1[i] * v2[i] for i in range(3))
    m1  = math.sqrt(sum(x**2 for x in v1)) + 1e-8
    m2  = math.sqrt(sum(x**2 for x in v2)) + 1e-8
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / (m1 * m2)))))

def extract_single_hand_features(pts):
    """Extract 82 features from one hand (21 landmarks)."""
    # Normalize: center at wrist, scale by palm size
    wrist     = pts[0]
    pts       = [[p[0]-wrist[0], p[1]-wrist[1], p[2]-wrist[2]] for p in pts]
    palm_size = get_distance(pts[0], pts[9])
    if palm_size < 1e-6:
        palm_size = 1.0
    pts = [[p[0]/palm_size, p[1]/palm_size, p[2]/palm_size] for p in pts]

    features = []

    # 63 normalized coords
    for p in pts:
        features.extend(p)

    # 5 finger angles
    for j in [[1,2,3],[5,6,7],[9,10,11],[13,14,15],[17,18,19]]:
        features.append(get_angle(pts[j[0]], pts[j[1]], pts[j[2]]))

    # 5 tip-to-wrist distances
    for t in [4, 8, 12, 16, 20]:
        features.append(get_distance(pts[0], pts[t]))

    # 4 inter-fingertip distances
    features.append(get_distance(pts[8],  pts[12]))
    features.append(get_distance(pts[12], pts[16]))
    features.append(get_distance(pts[16], pts[20]))
    features.append(get_distance(pts[4],  pts[8]))

    # 5 curl ratios
    for mcp, tip in zip([2,5,9,13,17], [4,8,12,16,20]):
        features.append(pts[tip][1] - pts[mcp][1])

    return features  # 82 features

def extract_inter_hand_features(right_pts, left_pts):
    """
    Extract 23 features capturing the RELATIONSHIP between both hands.
    This is what makes double-hand detection unique.
    """
    features = []

    # 1. Wrist-to-wrist distance (how close hands are)
    features.append(get_distance(right_pts[0], left_pts[0]))

    # 2. Wrist relative position (x, y, z offset)
    features.append(right_pts[0][0] - left_pts[0][0])  # x offset
    features.append(right_pts[0][1] - left_pts[0][1])  # y offset
    features.append(right_pts[0][2] - left_pts[0][2])  # z offset

    # 3. Fingertip-to-fingertip distances (5 pairs)
    tips = [4, 8, 12, 16, 20]
    for t in tips:
        features.append(get_distance(right_pts[t], left_pts[t]))

    # 4. Palm center distance
    r_center = [sum(right_pts[i][j] for i in [0,5,9,13,17])/5 for j in range(3)]
    l_center = [sum(left_pts[i][j]  for i in [0,5,9,13,17])/5 for j in range(3)]
    features.append(get_distance(r_center, l_center))

    # 5. Symmetry score — how mirror-like the hands are
    sym_score = sum(
        abs(right_pts[i][1] - left_pts[i][1]) for i in range(21)
    ) / 21
    features.append(sym_score)

    # 6. Hand overlap — are palms on top of each other?
    features.append(abs(right_pts[9][0] - left_pts[9][0]))  # middle MCP x diff
    features.append(abs(right_pts[9][1] - left_pts[9][1]))  # middle MCP y diff

    # 7. Finger interlace — index tips close together?
    features.append(get_distance(right_pts[8], left_pts[8]))   # index tips
    features.append(get_distance(right_pts[4], left_pts[4]))   # thumb tips
    features.append(get_distance(right_pts[20], left_pts[20])) # pinky tips

    # 8. Cross distances — right index to left wrist and vice versa
    features.append(get_distance(right_pts[8], left_pts[0]))
    features.append(get_distance(left_pts[8],  right_pts[0]))

    # 9. Relative palm orientation
    r_normal = [right_pts[5][j] - right_pts[0][j] for j in range(3)]
    l_normal = [left_pts[5][j]  - left_pts[0][j]  for j in range(3)]
    dot      = sum(r_normal[j] * l_normal[j] for j in range(3))
    m1       = math.sqrt(sum(x**2 for x in r_normal)) + 1e-8
    m2       = math.sqrt(sum(x**2 for x in l_normal)) + 1e-8
    features.append(dot / (m1 * m2))  # palm facing angle

    return features  # 23 features

def extract_double_features(right_landmarks, left_landmarks):
    """
    Main function: Extract 187 features from both hands.
    right_landmarks, left_landmarks: list of 21 [x,y,z] points each
    """
    right_feats = extract_single_hand_features(right_landmarks)  # 82
    left_feats  = extract_single_hand_features(left_landmarks)   # 82
    inter_feats = extract_inter_hand_features(right_landmarks, left_landmarks)  # 23

    features = right_feats + left_feats + inter_feats  # 187 total

    assert len(features) == 187, f"Feature count mismatch: {len(features)}"
    return features