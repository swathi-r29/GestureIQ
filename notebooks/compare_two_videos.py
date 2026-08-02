"""
compare_two_videos.py — Full Body Video vs Video Posture Comparison Engine

Compares a student's full-body dance performance video against a master reference video:
1. Extracts normalized 3D pose landmarks for both videos frame-by-frame.
2. Normalizes coordinates for dancer scale & camera distance.
3. Computes joint-by-joint angular distance & similarity score.
4. Identifies exact timestamps where posture deviates significantly from master.
5. Generates a comparison report (JSON).
"""

import cv2
import mediapipe as mp
import math
import numpy as np
import json
import sys
import os

def normalize_landmarks(landmarks):
    """Normalizes 33 pose landmarks relative to hip center and torso length."""
    if not landmarks:
        return None
    
    coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark])
    
    # Hips center (joints 23 & 24)
    hip_center = (coords[23] + coords[24]) / 2.0
    centered = coords - hip_center
    
    # Torso length (distance between hip center and shoulder center 11 & 12)
    shoulder_center = (coords[11] + coords[12]) / 2.0
    torso_length = np.linalg.norm(shoulder_center - hip_center)
    
    if torso_length > 0:
        normalized = centered / torso_length
    else:
        normalized = centered
        
    return normalized

def calculate_angle_np(a, b, c):
    """Calculates 3D angle at joint b in degrees."""
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba * norm_bc == 0:
        return 0.0
    dot = np.dot(ba, bc)
    cosine = np.clip(dot / (norm_ba * norm_bc), -1.0, 1.0)
    return math.degrees(math.acos(cosine))

def extract_body_angles(norm_coords):
    """Extracts key anatomical angles (Left Knee, Right Knee, Left Elbow, Right Elbow, Torso Tilt)."""
    if norm_coords is None:
        return None
    
    k_left = calculate_angle_np(norm_coords[23], norm_coords[25], norm_coords[27])
    k_right = calculate_angle_np(norm_coords[24], norm_coords[26], norm_coords[28])
    e_left = calculate_angle_np(norm_coords[11], norm_coords[13], norm_coords[15])
    e_right = calculate_angle_np(norm_coords[12], norm_coords[14], norm_coords[16])
    
    # Torso vertical tilt relative to Y axis
    spine_vec = (norm_coords[11] + norm_coords[12]) / 2.0 - (norm_coords[23] + norm_coords[24]) / 2.0
    torso_tilt = math.degrees(math.atan2(abs(spine_vec[0]), abs(spine_vec[1])))
    
    return {
        "left_knee": round(k_left, 1),
        "right_knee": round(k_right, 1),
        "left_elbow": round(e_left, 1),
        "right_elbow": round(e_right, 1),
        "torso_tilt": round(torso_tilt, 1)
    }

def get_video_angles_sequence(video_path, fps_sample=5):
    """Processes video file and returns frame-by-frame angle sequence."""
    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_interval = max(1, int(video_fps / fps_sample))
    
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
    
    sequence = []
    frame_idx = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            ts = round(frame_idx / video_fps, 2)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)
            if res.pose_world_landmarks:
                norm = normalize_landmarks(res.pose_world_landmarks)
                angles = extract_body_angles(norm)
            else:
                angles = None
            sequence.append({"frame": frame_idx, "sec": ts, "angles": angles})
        frame_idx += 1
        
    cap.release()
    pose.close()
    return sequence

def compare_full_body_videos(master_video, student_video, output_json="comparison_report.json"):
    """Compares student video against master reference video frame-by-frame."""
    print(f"Analyzing Master Video: {master_video}")
    master_seq = get_video_angles_sequence(master_video)
    
    print(f"Analyzing Student Video: {student_video}")
    student_seq = get_video_angles_sequence(student_video)
    
    n_frames = min(len(master_seq), len(student_seq))
    diffs = []
    frame_scores = []
    
    for i in range(n_frames):
        m_data = master_seq[i]["angles"]
        s_data = student_seq[i]["angles"]
        sec = student_seq[i]["sec"]
        
        if not m_data or not s_data:
            frame_scores.append(0)
            continue
            
        lk_diff = abs(m_data["left_knee"] - s_data["left_knee"])
        rk_diff = abs(m_data["right_knee"] - s_data["right_knee"])
        le_diff = abs(m_data["left_elbow"] - s_data["left_elbow"])
        re_diff = abs(m_data["right_elbow"] - s_data["right_elbow"])
        tilt_diff = abs(m_data["torso_tilt"] - s_data["torso_tilt"])
        
        avg_err = (lk_diff * 0.3 + rk_diff * 0.3 + le_diff * 0.15 + re_diff * 0.15 + tilt_diff * 0.10)
        match_score = max(0.0, round(100.0 - avg_err, 1))
        frame_scores.append(match_score)
        
        if match_score < 75:
            diff_notes = []
            if max(lk_diff, rk_diff) > 18:
                diff_notes.append("Knee bend discrepancy (check Araimandi depth)")
            if max(le_diff, re_diff) > 20:
                diff_notes.append("Arm / elbow level discrepancy")
            if tilt_diff > 10:
                diff_notes.append("Spine tilt imbalance")
                
            diffs.append({
                "timestamp": f"{int(sec // 60):02d}:{sec % 60:05.2f}",
                "timestamp_sec": sec,
                "similarity_score": match_score,
                "issues": diff_notes,
                "master_knee_angle": round((m_data["left_knee"] + m_data["right_knee"]) / 2, 1),
                "student_knee_angle": round((s_data["left_knee"] + s_data["right_knee"]) / 2, 1)
            })
            
    overall_match = round(float(np.mean([s for s in frame_scores if s > 0])), 1) if frame_scores else 0
    
    report = {
        "master_video": os.path.basename(master_video),
        "student_video": os.path.basename(student_video),
        "overall_posture_match": overall_match,
        "analyzed_frames": n_frames,
        "significant_deviations_count": len(diffs),
        "deviations_timeline": diffs
    }
    
    with open(output_json, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"[OK] Comparison complete! Overall Posture Match: {overall_match}%")
    print(f"Report saved to: {output_json}")
    return report

if __name__ == "__main__":
    if len(sys.argv) > 2:
        compare_full_body_videos(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "posture_comparison_report.json")
    else:
        print("Usage: python compare_two_videos.py <master_video.mp4> <student_video.mp4> [output.json]")
