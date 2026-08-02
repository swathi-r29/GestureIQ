import os
import sys
import json
import math
import cv2
import numpy as np
import mediapipe as mp

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_SEQ_DIR = os.path.join(BASE_DIR, "dataset", "reference_sequences")

def normalize_landmarks(landmarks):
    if not landmarks:
        return None
    coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark])
    hip_center = (coords[23] + coords[24]) / 2.0
    centered = coords - hip_center
    shoulder_center = (coords[11] + coords[12]) / 2.0
    torso_length = np.linalg.norm(shoulder_center - hip_center)
    if torso_length > 0:
        normalized = centered / torso_length
    else:
        normalized = centered
    return normalized

def calculate_angle_3d(a, b, c):
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba * norm_bc == 0:
        return 0.0
    dot = np.dot(ba, bc)
    cosine = np.clip(dot / (norm_ba * norm_bc), -1.0, 1.0)
    return round(math.degrees(math.acos(cosine)), 1)

def extract_body_angles(norm_coords):
    if norm_coords is None:
        return None
    k_left = calculate_angle_3d(norm_coords[23], norm_coords[25], norm_coords[27])
    k_right = calculate_angle_3d(norm_coords[24], norm_coords[26], norm_coords[28])
    e_left = calculate_angle_3d(norm_coords[11], norm_coords[13], norm_coords[15])
    e_right = calculate_angle_3d(norm_coords[12], norm_coords[14], norm_coords[16])
    spine_vec = (norm_coords[11] + norm_coords[12]) / 2.0 - (norm_coords[23] + norm_coords[24]) / 2.0
    torso_tilt = round(math.degrees(math.atan2(abs(spine_vec[0]), abs(spine_vec[1]))), 1)
    return {
        "left_knee": k_left,
        "right_knee": k_right,
        "left_elbow": e_left,
        "right_elbow": e_right,
        "torso_tilt": torso_tilt
    }

def evaluate_image_posture(image_path, dance_name="Alarippu"):
    if not os.path.exists(image_path):
        print(f"❌ Image file not found: {image_path}")
        return

    ref_seq_path = os.path.join(REF_SEQ_DIR, f"{dance_name}_sequence.json")
    if not os.path.exists(ref_seq_path):
        print(f"❌ Reference sequence file not found: {ref_seq_path}")
        return

    with open(ref_seq_path, "r") as f:
        ref_data = json.load(f)

    ref_sequence = ref_data.get("sequence", [])
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Could not load image: {image_path}")
        return

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = pose.process(rgb)
    pose.close()

    if not res.pose_landmarks:
        print(f"⚠️ No dancer posture detected in image: {image_path}")
        return

    student_norm = normalize_landmarks(res.pose_world_landmarks)
    student_angles = extract_body_angles(student_norm)

    # Compare student angles against reference sequence to find closest matching posture step
    best_score = -1.0
    best_ref_frame = None
    best_ref_angles = None

    for item in ref_sequence:
        ref_angles = item.get("angles")
        if not ref_angles:
            continue
        lk_diff = abs(ref_angles["left_knee"] - student_angles["left_knee"])
        rk_diff = abs(ref_angles["right_knee"] - student_angles["right_knee"])
        le_diff = abs(ref_angles["left_elbow"] - student_angles["left_elbow"])
        re_diff = abs(ref_angles["right_elbow"] - student_angles["right_elbow"])
        tilt_diff = abs(ref_angles["torso_tilt"] - student_angles["torso_tilt"])

        avg_err = (lk_diff * 0.3 + rk_diff * 0.3 + le_diff * 0.15 + re_diff * 0.15 + tilt_diff * 0.10)
        match_score = max(0.0, round(100.0 - avg_err, 1))

        if match_score > best_score:
            best_score = match_score
            best_ref_frame = item["frame_file"]
            best_ref_angles = ref_angles

    feedback = []
    if best_ref_angles:
        lk_diff = abs(best_ref_angles["left_knee"] - student_angles["left_knee"])
        rk_diff = abs(best_ref_angles["right_knee"] - student_angles["right_knee"])
        le_diff = abs(best_ref_angles["left_elbow"] - student_angles["left_elbow"])
        re_diff = abs(best_ref_angles["right_elbow"] - student_angles["right_elbow"])
        tilt_diff = abs(best_ref_angles["torso_tilt"] - student_angles["torso_tilt"])

        if max(lk_diff, rk_diff) > 18:
            feedback.append("Knee bend discrepancy (check Araimandi stance depth)")
        if max(le_diff, re_diff) > 20:
            feedback.append("Arm / elbow height level discrepancy")
        if tilt_diff > 10:
            feedback.append("Spine vertical alignment imbalance")

    print(f"\n==================================================")
    print(f"  SINGLE IMAGE POSTURE EVALUATION RESULT")
    print(f"==================================================")
    print(f"  - Dance Item Match       : {dance_name}")
    print(f"  - Matched Reference Frame: {best_ref_frame}")
    print(f"  - Posture Accuracy Score : {best_score}%")
    print(f"  - Student Angles         : {student_angles}")
    print(f"  - Reference Angles       : {best_ref_angles}")
    if feedback:
        print(f"  - Posture Corrections    :")
        for fb in feedback:
            print(f"    * {fb}")
    else:
        print(f"  - Feedback               : Excellent posture alignment!")
    print(f"==================================================\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python notebooks/evaluate_user_image.py <image_path> [dance_name]")
        print("Example: python notebooks/evaluate_user_image.py dataset/Alarippu/frame_0050.jpg Alarippu")
    else:
        img_p = sys.argv[1]
        d_name = sys.argv[2] if len(sys.argv) > 2 else "Alarippu"
        evaluate_image_posture(img_p, d_name)
