import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.pose_feature_engineering import check_full_body_visibility, evaluate_body_posture_normalized

def test_visibility():
    # Synthetic landmark set resembling a full body static image photo (where MediaPipe visibility is 0.0 or 0.05)
    landmarks = []
    for i in range(33):
        # nose at top, shoulders at mid-upper, hips at lower torso, knees below, ankles at bottom
        if i == 0: # Nose
            landmarks.append({'x': 0.5, 'y': 0.15, 'z': 0.0, 'visibility': 0.99})
        elif i in [11, 12]: # Shoulders
            landmarks.append({'x': 0.4 if i==11 else 0.6, 'y': 0.3, 'z': 0.0, 'visibility': 0.8})
        elif i in [23, 24]: # Hips
            landmarks.append({'x': 0.45 if i==23 else 0.55, 'y': 0.55, 'z': 0.0, 'visibility': 0.02}) # Low vis float from static photo
        elif i in [25, 26]: # Knees
            landmarks.append({'x': 0.35 if i==25 else 0.65, 'y': 0.75, 'z': 0.0, 'visibility': 0.0}) # 0.0 vis float
        elif i in [27, 28]: # Ankles
            landmarks.append({'x': 0.4 if i==27 else 0.6, 'y': 0.92, 'z': 0.0, 'visibility': 0.0})
        else:
            landmarks.append({'x': 0.5, 'y': 0.5, 'z': 0.0, 'visibility': 0.5})

    is_vis, missing = check_full_body_visibility(landmarks)
    print(f"check_full_body_visibility result: is_vis={is_vis}, missing={missing}")
    assert is_vis == True, f"Expected is_vis True but got {is_vis}, missing={missing}"

    eval_res = evaluate_body_posture_normalized(landmarks)
    print(f"evaluate_body_posture_normalized result: {eval_res}")
    assert eval_res.get("partial_body") != True, f"Failed: partial_body returned True!"

    print("ALL VISIBILITY FIX TESTS PASSED!")

if __name__ == '__main__':
    test_visibility()
