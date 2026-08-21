"""
notebooks/verify_multi_stance_pipeline.py
Automated benchmark and multi-stance verification script for GestureIQ.
"""
import os
import sys
import json
import cv2
import mediapipe as mp

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.pose_feature_engineering import normalize_landmarks, extract_body_angles, check_full_body_visibility

mp_pose = mp.solutions.pose
pose_engine = mp_pose.Pose(static_image_mode=True, model_complexity=2, min_detection_confidence=0.5)

TEST_DATASETS = [
    {"name": "Alarippu", "path": "dataset/Alarippu"},
    {"name": "Thattadavu_Suite", "path": "dataset/Thattadavu_Suite"},
]

def run_tests():
    print("=" * 60)
    print("🚀 GESTUREIQ MULTI-STANCE AUTOMATED VERIFICATION")
    print("=" * 60)

    for item in TEST_DATASETS:
        folder = item["path"]
        if not os.path.exists(folder):
            print(f"⚠️ Skipping {item['name']}: directory {folder} not found.")
            continue

        images = [f for f in sorted(os.listdir(folder)) if f.endswith(('.jpg', '.png'))][:5]
        print(f"\n📂 Testing Sequence: {item['name']} ({len(images)} sample frames)")

        for img_name in images:
            img_path = os.path.join(folder, img_name)
            img = cv2.imread(img_path)
            if img is None: continue

            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            res = pose_engine.process(rgb)

            if not res.pose_landmarks:
                print(f"  ❌ {img_name}: No pose detected")
                continue

            visible, missing = check_full_body_visibility(res.pose_landmarks)
            if not visible:
                print(f"  ⚠️ {img_name}: Guard triggered ({', '.join(missing)})")
                continue

            norm = normalize_landmarks(res.pose_landmarks)
            angles = extract_body_angles(norm)

            print(f"  ✅ {img_name}:")
            print(f"     • Classified Stance : {angles['detected_stance']} (Conf: {angles['stance_confidence']})")
            print(f"     • Knee Angles       : L={angles['left_knee']}°, R={angles['right_knee']}°")
            print(f"     • Torso / Tilt      : {angles['torso_tilt']}° (Spine Alignment)")

    print("\n" + "=" * 60)
    print("🎉 Verification Complete!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
