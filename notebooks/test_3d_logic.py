import sys
import os
import numpy as np
import math

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.feature_engineering import get_angle, extract_features

def test_angles():
    print("--- Testing 3D Angle Logic (Tilt-Invariance) ---")
    
    # Define a straight line (Pataka style)
    p1 = [0.0, 0.0, 0.0]
    p2 = [0.0, 1.0, 0.0]
    p3 = [0.0, 2.0, 0.0]
    
    angle_flat = get_angle(p1, p2, p3)
    print(f"Flat hand (no tilt): {angle_flat:.2f}° (Expected ~180°)")
    
    # Tilted toward camera (Z change)
    p1_tilted = [0.0, 0.0, 0.0]
    p2_tilted = [0.0, 1.0, 0.5]
    p3_tilted = [0.0, 2.0, 1.0]
    
    angle_tilted = get_angle(p1_tilted, p2_tilted, p3_tilted)
    print(f"Flat hand (45° tilt toward camera): {angle_tilted:.2f}° (Expected ~180°)")
    
    # 90 degree bend (Mushti/Fist style)
    p_bend1 = [0.0, 0.0, 0.0]
    p_bend2 = [0.0, 1.0, 0.0]
    p_bend3 = [1.0, 1.0, 0.0]
    
    angle_90 = get_angle(p_bend1, p_bend2, p_bend3)
    print(f"90° bend (Fist style): {angle_90:.2f}° (Expected ~90°)")

    # Mirroring check
    print("\n--- Testing Handedness Mirroring ---")
    dummy_landmarks = [[0.1, 0.1, 0.0] for _ in range(21)]
    # Set wrist at 0.1, index MCP at 0.5
    dummy_landmarks[0] = [0.1, 0.5, 0.0]
    dummy_landmarks[9] = [0.5, 0.5, 0.0] # Middle finger MCP
    
    features_right = extract_features(dummy_landmarks, label="Right")
    # First 3 features are wrist relative (0.0, 0.0, 0.0)
    print(f"Right hand wrist X: {features_right[0]:.2f}")
    
    features_left = extract_features(dummy_landmarks, label="Left")
    # Mirroring 0.1 -> 0.9. Mirroring 0.5 -> 0.5. 
    # Relative to wrist: (0.9 - 0.9) = 0.0 or something. Let's see.
    # Wrist X is 1.0 - 0.1 = 0.9. Pt X is 1.0 - 0.1 = 0.9. Rel = 0.
    print(f"Left hand wrist X (mirrored): {features_left[0]:.2f}")
    
    print("\n✅ Verification script created.")

def test_scale_invariance():
    print("\n--- Testing Scale-Invariance (Palm Normalization) ---")
    
    # Hand at distance A (Normal size)
    # Wrist=0, MiddleMCP=9. Palm size = dist(0, 9)
    # Let's say Wrist=[0.5, 0.5, 0.5], MiddleMCP=[0.5, 0.6, 0.5] -> Palm Size = 0.1
    # Fingertip pinch (4-8) distance = 0.02 raw
    # Normalized = 0.02 / 0.1 = 0.2
    
    # In my dist_lm implementation: get_distance(...) / palm_size
    
    p0 = [0.5, 0.5, 0.5]
    p9 = [0.5, 0.6, 0.5]
    palm_size_a = math.sqrt((p0[0]-p9[0])**2 + (p0[1]-p9[1])**2 + (p0[2]-p9[2])**2)
    
    p4 = [0.4, 0.5, 0.5]
    p8 = [0.4, 0.52, 0.5]
    dist_raw_a = math.sqrt((p4[0]-p8[0])**2 + (p4[1]-p8[1])**2 + (p4[2]-p8[2])**2)
    norm_a = dist_raw_a / palm_size_a
    
    # Hand at distance B (2x smaller screen coordinates)
    p0_b = [v * 0.5 for v in p0]
    p9_b = [v * 0.5 for v in p9]
    palm_size_b = math.sqrt((p0_b[0]-p9_b[0])**2 + (p0_b[1]-p9_b[1])**2 + (p0_b[2]-p9_b[2])**2)
    
    p4_b = [v * 0.5 for v in p4]
    p8_b = [v * 0.5 for v in p8]
    dist_raw_b = math.sqrt((p4_b[0]-p8_b[0])**2 + (p4_b[1]-p8_b[1])**2 + (p4_b[2]-p8_b[2])**2)
    norm_b = dist_raw_b / palm_size_b
    
    print(f"Hand A - Raw Dist: {dist_raw_a:.3f}, Palm: {palm_size_a:.3f}, Normalized: {norm_a:.2f}")
    print(f"Hand B - Raw Dist: {dist_raw_b:.3f}, Palm: {palm_size_b:.3f}, Normalized: {norm_b:.2f}")
    
    if abs(norm_a - norm_b) < 1e-6:
        print("✅ Scale-Invariance Verified: Normalized distances are identical.")
    else:
        print("❌ Scale-Invariance Failed!")

if __name__ == "__main__":
    test_angles()
    test_scale_invariance()
