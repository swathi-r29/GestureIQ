import os
import json
import numpy as np
from notebooks.flask_app import BENCHMARKS_CACHE, extract_body_angles

print(f"Loaded {len(BENCHMARKS_CACHE)} benchmarks: {list(BENCHMARKS_CACHE.keys())}")

# Pick a keyframe from Shabdam_Ayar_Sheriyar sequence
shabdam_seq = BENCHMARKS_CACHE.get("Shabdam_Ayar_Sheriyar", [])
if not shabdam_seq:
    print("Shabdam_Ayar_Sheriyar sequence not found!")
else:
    print(f"Shabdam sequence frame count: {len(shabdam_seq)}")
    test_sample = shabdam_seq[10] # 11th frame
    test_angles = test_sample["angles"]
    print(f"Test sample angles: {test_angles}")

    # Now score test_angles against ALL benchmarks in database
    results = []
    for dname, frames in BENCHMARKS_CACHE.items():
        best_score_in_seq = -1.0
        best_frame_file = ""
        for f in frames:
            r_angles = f.get("angles")
            if not r_angles:
                continue
            lk_diff = abs(r_angles.get("left_knee", 180) - test_angles["left_knee"])
            rk_diff = abs(r_angles.get("right_knee", 180) - test_angles["right_knee"])
            le_diff = abs(r_angles.get("left_elbow", 180) - test_angles["left_elbow"])
            re_diff = abs(r_angles.get("right_elbow", 180) - test_angles["right_elbow"])
            tilt_diff = abs(r_angles.get("torso_tilt", 0) - test_angles["torso_tilt"])

            avg_err = (lk_diff * 0.30 + rk_diff * 0.30 + le_diff * 0.15 + re_diff * 0.15 + tilt_diff * 0.10)
            score = max(0.0, round(100.0 - avg_err, 1))
            if score > best_score_in_seq:
                best_score_in_seq = score
                best_frame_file = f.get("frame_file", "")
        results.append((dname, best_score_in_seq, best_frame_file))

    results.sort(key=lambda x: x[1], reverse=True)
    print("\n--- GLOBAL CLASSIFICATION SCORES ---")
    for r in results:
        print(f"Dance: {r[0]:<25} | Score: {r[1]}% | Frame: {r[2]}")
