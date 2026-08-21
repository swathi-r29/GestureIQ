"""
notebooks/test_realtime_posture.py
Real-Time Webcam Posture Detection & Evaluation Engine for GestureIQ

Usage:
  python notebooks/test_realtime_posture.py [--dance Alarippu] [--cam 0]
Press 'q' in the webcam window to exit.
"""

import os
import sys
import json
import time
import argparse
import cv2
import numpy as np
import mediapipe as mp

# Add parent directory for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.pose_feature_engineering import normalize_landmarks, extract_body_angles, check_full_body_visibility

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_SEQ_DIR = os.path.join(BASE_DIR, "dataset", "reference_sequences")


def run_realtime_posture_test(dance_name="Alarippu", cam_index=0):
    print("=========================================================")
    print(f"  GestureIQ - Real-Time Webcam Posture Evaluator: {dance_name}")
    print("=========================================================")

    # Load reference benchmark sequence
    ref_file = os.path.join(REF_SEQ_DIR, f"{dance_name}_sequence.json")
    if not os.path.exists(ref_file):
        print(f"❌ Error: Reference sequence file '{ref_file}' not found.")
        print(f"Run 'python notebooks/ingest_youtube_reference.py --name {dance_name}' first.")
        return

    with open(ref_file, "r") as f:
        ref_data = json.load(f)

    ref_sequence = [frame for frame in ref_data.get("sequence", []) if frame.get("angles")]
    if not ref_sequence:
        print("❌ Error: No valid posture angle frames found in benchmark sequence.")
        return

    print(f"✅ Loaded {len(ref_sequence)} benchmark frames for '{dance_name}'")
    print(f"🎥 Starting Webcam (Device Index: {cam_index})... Press 'q' to quit.\n")

    cap = cv2.VideoCapture(cam_index)
    if not cap.isOpened():
        print(f"❌ Error: Could not open camera (index {cam_index}).")
        return

    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    start_time = time.time()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to read webcam frame.")
            break

        # Mirror video for natural UX
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        elapsed_sec = round(time.time() - start_time, 2)

        # Convert to RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        score_text = "N/A"
        feedback_msgs = ["Step back so full body (hips to ankles) is visible."]
        hud_color = (0, 165, 255) # Orange

        if res.pose_landmarks:
            is_visible, missing_parts = check_full_body_visibility(res.pose_landmarks)
            if not is_visible:
                score_text = "N/A"
                hud_color = (0, 165, 255) # Orange
                feedback_msgs = [f"STEP BACK: {part}" for part in missing_parts]
            else:
                # Draw MediaPipe skeleton on webcam feed
                mp_drawing.draw_landmarks(frame, res.pose_landmarks, mp_pose.POSE_CONNECTIONS)

                norm_coords = normalize_landmarks(res.pose_landmarks)
                live_angles = extract_body_angles(norm_coords)

                if live_angles:
                    # Find closest benchmark frame based on elapsed time
                    target_frame = ref_sequence[int((elapsed_sec * 5) % len(ref_sequence))]
                    ref_angles = target_frame.get("angles", {})

                    # Compute posture score based on angle errors
                    err_l_knee = abs(live_angles["left_knee"] - ref_angles.get("left_knee", live_angles["left_knee"]))
                    err_r_knee = abs(live_angles["right_knee"] - ref_angles.get("right_knee", live_angles["right_knee"]))
                    err_l_elbow = abs(live_angles["left_elbow"] - ref_angles.get("left_elbow", live_angles["left_elbow"]))
                    err_r_elbow = abs(live_angles["right_elbow"] - ref_angles.get("right_elbow", live_angles["right_elbow"]))
                    err_torso = abs(live_angles["torso_tilt"] - ref_angles.get("torso_tilt", live_angles["torso_tilt"]))

                    total_error = (err_l_knee * 0.25) + (err_r_knee * 0.25) + (err_l_elbow * 0.2) + (err_r_elbow * 0.2) + (err_torso * 0.1)
                    posture_score = max(0.0, round(100.0 - total_error, 1))
                    score_text = f"{posture_score}%"

                    feedback_msgs = []
                    if err_l_knee > 15 or err_r_knee > 15:
                        feedback_msgs.append("Sit lower in Araimandi!")
                    if err_torso > 10:
                        feedback_msgs.append("Keep your spine straight!")
                    if err_l_elbow > 18 or err_r_elbow > 18:
                        feedback_msgs.append("Adjust arm / elbow level!")

                    if not feedback_msgs:
                        feedback_msgs.append("Great posture! Holding stance.")
                        hud_color = (0, 255, 0) # Green
                    else:
                        hud_color = (0, 0, 255) # Red

                    # Draw angle readouts on screen
                    cv2.putText(frame, f"L-Knee: {live_angles['left_knee']}deg | R-Knee: {live_angles['right_knee']}deg", 
                                (20, h - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    cv2.putText(frame, f"Torso Tilt: {live_angles['torso_tilt']}deg", 
                                (20, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Draw HUD Panel Header
        cv2.rectangle(frame, (10, 10), (w - 10, 90), (0, 0, 0), -1)
        cv2.putText(frame, f"GestureIQ Real-Time Posture [{dance_name}]", (20, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"Score: {score_text}", (w - 180, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, hud_color, 2)

        # Draw Feedback Messages
        y_offset = 65
        for msg in feedback_msgs:
            cv2.putText(frame, f"ALERT: {msg}", (20, y_offset), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, hud_color, 2)
            y_offset += 25

        cv2.imshow("GestureIQ - Real-Time Camera Posture Evaluator", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\nExiting real-time posture test...")
            break

    cap.release()
    cv2.destroyAllWindows()
    pose.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Real-Time Webcam Posture Detection & Evaluation")
    parser.add_argument("--dance", type=str, default="Alarippu", help="Dance item name (default: Alarippu)")
    parser.add_argument("--cam", type=int, default=0, help="Webcam device index (default: 0)")
    args = parser.parse_args()

    run_realtime_posture_test(args.dance, args.cam)
