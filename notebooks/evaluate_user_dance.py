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
    """Normalizes 33 pose landmarks relative to hip center and torso length."""
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

def evaluate_student_performance(student_video_path, dance_name="Alarippu", output_report="performance_report.json"):
    ref_seq_path = os.path.join(REF_SEQ_DIR, f"{dance_name}_sequence.json")
    if not os.path.exists(ref_seq_path):
        print(f"❌ Reference sequence file not found: {ref_seq_path}")
        return

    with open(ref_seq_path, "r") as f:
        ref_data = json.load(f)

    ref_sequence = ref_data.get("sequence", [])
    print(f"\n==================================================")
    print(f"  Evaluating Student Dance against: {dance_name}")
    print(f"  Student Video: {student_video_path}")
    print(f"  Reference Sequence: {ref_seq_path} ({len(ref_sequence)} reference frames)")
    print(f"==================================================")

    cap = cv2.VideoCapture(student_video_path)
    if not cap.isOpened():
        print(f"❌ Failed to open video: {student_video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

    frame_scores = []
    discrepancies = []
    frame_idx = 0
    ref_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        # Sample frame every 5 frames
        if frame_idx % 5 != 0:
            continue

        if ref_idx >= len(ref_sequence):
            break

        ref_frame_data = ref_sequence[ref_idx]
        ref_idx += 1

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        if not res.pose_landmarks or not ref_frame_data.get("angles"):
            continue

        student_norm = normalize_landmarks(res.pose_world_landmarks)
        student_angles = extract_body_angles(student_norm)
        ref_angles = ref_frame_data["angles"]

        if not student_angles:
            continue

        lk_diff = abs(ref_angles["left_knee"] - student_angles["left_knee"])
        rk_diff = abs(ref_angles["right_knee"] - student_angles["right_knee"])
        le_diff = abs(ref_angles["left_elbow"] - student_angles["left_elbow"])
        re_diff = abs(ref_angles["right_elbow"] - student_angles["right_elbow"])
        tilt_diff = abs(ref_angles["torso_tilt"] - student_angles["torso_tilt"])

        avg_err = (lk_diff * 0.3 + rk_diff * 0.3 + le_diff * 0.15 + re_diff * 0.15 + tilt_diff * 0.10)
        match_score = max(0.0, round(100.0 - avg_err, 1))
        frame_scores.append(match_score)

        ts_sec = round(frame_idx / fps, 2)
        timestamp_str = f"{int(ts_sec // 60):02d}:{ts_sec % 60:05.2f}"

        if match_score < 75:
            notes = []
            if max(lk_diff, rk_diff) > 18:
                notes.append("Knee bend discrepancy (check Araimandi depth)")
            if max(le_diff, re_diff) > 20:
                notes.append("Arm / elbow level balance discrepancy")
            if tilt_diff > 10:
                notes.append("Spine vertical tilt imbalance")

            discrepancies.append({
                "timestamp": timestamp_str,
                "score": match_score,
                "student_angles": student_angles,
                "reference_angles": ref_angles,
                "feedback": notes
            })

    cap.release()
    pose.close()

    overall_score = round(float(np.mean(frame_scores)), 1) if frame_scores else 0.0

    report = {
        "dance_item": dance_name,
        "overall_accuracy_score": overall_score,
        "grade": "A+" if overall_score >= 90 else ("A" if overall_score >= 80 else ("B" if overall_score >= 70 else "Needs Practice")),
        "evaluated_frames": len(frame_scores),
        "discrepancies_count": len(discrepancies),
        "discrepancies_detail": discrepancies[:15]
    }

    with open(output_report, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n==================================================")
    print(f"  PERFORMANCE EVALUATION RESULT")
    print(f"==================================================")
    print(f"  - Dance Item             : {dance_name}")
    print(f"  - Overall Posture Score  : {overall_score}% ({report['grade']})")
    print(f"  - Posture Discrepancies  : {len(discrepancies)} timestamps flagged")
    print(f"  - Full JSON Report Saved : {output_report}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python notebooks/evaluate_user_dance.py <student_video_path> [dance_name]")
        print("Example: python notebooks/evaluate_user_dance.py dataset/raw_reference_videos/Alarippu.mp4 Alarippu")
    else:
        v_path = sys.argv[1]
        d_name = sys.argv[2] if len(sys.argv) > 2 else "Alarippu"
        evaluate_student_performance(v_path, d_name)
