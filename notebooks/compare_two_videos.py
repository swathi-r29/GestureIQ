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

# Add root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.pose_feature_engineering import normalize_landmarks, calculate_angle_3d, extract_body_angles

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
