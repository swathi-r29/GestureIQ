"""
process_video_postures.py — Video Frame Extraction & Multi-Posture Analysis Engine

This script:
1. Opens an input video (.mp4, .mov, etc.)
2. Extracts image frames at a configurable FPS / frame interval.
3. Runs MediaPipe Pose on each frame to obtain 3D joint landmarks.
4. Evaluates classical Bharatanatyam posture geometric rules for each frame:
   - Araimandi (Half-squat ~110-130° knee angle)
   - Muzhumandi (Full squat <80° knee angle)
   - Samapada (Upright standing >155° knee angle)
   - Nattadavu (Extended leg stance)
5. Draws the skeleton landmarks and posture status overlay onto the saved frame images.
6. Saves annotated frames to an output folder and exports JSON report.
"""

import cv2
import mediapipe as mp
import math
import json
import os
import sys

def calculate_3d_angle(a, b, c):
    """Calculates 3D angle at joint 'b' given points a, b, c."""
    if not (a and b and c):
        return None
    ba = [a.x - b.x, a.y - b.y, a.z - b.z]
    bc = [c.x - b.x, c.y - b.y, c.z - b.z]
    
    dot = ba[0]*bc[0] + ba[1]*bc[1] + ba[2]*bc[2]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2 + ba[2]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2 + bc[2]**2)
    
    if mag_ba * mag_bc == 0:
        return None
    
    cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))

def evaluate_frame_posture(landmarks):
    """Evaluates posture for a single frame of landmarks."""
    if not landmarks or len(landmarks.landmark) < 33:
        return "Unknown Stance", 0, "No pose detected"
    
    lm = landmarks.landmark
    hip_l, hip_r = lm[23], lm[24]
    knee_l, knee_r = lm[25], lm[26]
    ankle_l, ankle_r = lm[27], lm[28]
    
    left_knee_angle = calculate_3d_angle(hip_l, knee_l, ankle_l)
    right_knee_angle = calculate_3d_angle(hip_r, knee_r, ankle_r)
    
    if left_knee_angle is None or right_knee_angle is None:
        return "Unknown Stance", 0, "Joints occluded"
    
    avg_knee_angle = (left_knee_angle + right_knee_angle) / 2.0
    knee_diff = abs(left_knee_angle - right_knee_angle)
    
    if knee_diff > 35:
        return "Nattadavu Stance", 88, f"Leg extended ({int(knee_diff)}° diff)"
    elif avg_knee_angle < 85:
        return "Muzhumandi Stance", 92, f"Deep squat ({int(avg_knee_angle)}°)"
    elif 95 <= avg_knee_angle <= 145:
        return "Araimandi Stance", 95, f"Half-seated ({int(avg_knee_angle)}°)"
    elif avg_knee_angle > 155:
        return "Samapada Stance", 90, f"Upright standing ({int(avg_knee_angle)}°)"
    else:
        return "Transition Posture", 75, f"Knee angle: {int(avg_knee_angle)}°"

def process_video(video_path, sample_fps=2, output_json=None, save_frames_dir=None):
    """Splits video into frames, analyzes postures frame-by-frame, and optionally saves annotated frames."""
    if not os.path.exists(video_path):
        print(f"Error: Video file '{video_path}' not found.")
        return None

    if save_frames_dir:
        os.makedirs(save_frames_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_interval = max(1, int(video_fps / sample_fps))
    
    print(f"Processing video: {video_path}")
    print(f"Video FPS: {video_fps:.1f} | Total Frames: {total_frames} | Sampling ~{sample_fps} FPS")

    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)

    frame_index = 0
    saved_count = 0
    analyzed_frames = []
    current_stance_segment = None
    timeline_segments = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_index % frame_interval == 0:
            timestamp_sec = round(frame_index / video_fps, 2)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)
            
            stance_name, score, notes = evaluate_frame_posture(results.pose_landmarks)
            
            frame_data = {
                "frame": frame_index,
                "timestamp": f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}",
                "timestamp_sec": timestamp_sec,
                "stance": stance_name,
                "score": score,
                "notes": notes
            }
            analyzed_frames.append(frame_data)
            
            # Save annotated frame image if requested
            if save_frames_dir:
                annotated = frame.copy()
                if results.pose_landmarks:
                    mp_drawing.draw_landmarks(
                        annotated,
                        results.pose_landmarks,
                        mp_pose.POSE_CONNECTIONS,
                        landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
                    )
                
                # Draw top overlay banner
                h, w, _ = annotated.shape
                cv2.rectangle(annotated, (0, 0), (w, 55), (20, 20, 20), -1)
                text = f"[{frame_data['timestamp']}] {stance_name} ({score}%) - {notes}"
                color = (0, 255, 120) if score > 80 else (0, 215, 255)
                cv2.putText(annotated, text, (15, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                
                frame_filename = f"frame_{saved_count:04d}_{stance_name.replace(' ', '_')}.jpg"
                cv2.imwrite(os.path.join(save_frames_dir, frame_filename), annotated)
                saved_count += 1

            # Timeline aggregation
            if current_stance_segment is None or current_stance_segment["stance"] != stance_name:
                if current_stance_segment:
                    timeline_segments.append(current_stance_segment)
                current_stance_segment = {
                    "stance": stance_name,
                    "start_time": frame_data["timestamp"],
                    "end_time": frame_data["timestamp"],
                    "start_sec": timestamp_sec,
                    "end_sec": timestamp_sec,
                    "avg_score": score,
                    "frame_count": 1
                }
            else:
                current_stance_segment["end_time"] = frame_data["timestamp"]
                current_stance_segment["end_sec"] = timestamp_sec
                current_stance_segment["frame_count"] += 1
                current_stance_segment["avg_score"] = round(
                    (current_stance_segment["avg_score"] * (current_stance_segment["frame_count"] - 1) + score) / current_stance_segment["frame_count"], 1
                )

        frame_index += 1

    if current_stance_segment:
        timeline_segments.append(current_stance_segment)

    cap.release()
    pose.close()

    results_summary = {
        "video": os.path.basename(video_path),
        "total_analyzed_frames": len(analyzed_frames),
        "saved_annotated_frames": saved_count,
        "frames_directory": save_frames_dir,
        "posture_timeline": timeline_segments,
        "detailed_frames": analyzed_frames
    }

    if output_json:
        with open(output_json, "w") as f:
            json.dump(results_summary, f, indent=2)
        print(f"Results saved to: {output_json}")

    if save_frames_dir:
        print(f"[OK] {saved_count} annotated frame images saved to: {save_frames_dir}")

    return results_summary

if __name__ == "__main__":
    if len(sys.argv) > 1:
        v_path = sys.argv[1]
        out_path = sys.argv[2] if len(sys.argv) > 2 else "video_posture_report.json"
        out_dir = sys.argv[3] if len(sys.argv) > 3 else "extracted_posture_frames"
        process_video(v_path, sample_fps=2, output_json=out_path, save_frames_dir=out_dir)
    else:
        print("Usage: python process_video_postures.py <video_path> [output.json] [frames_dir]")
