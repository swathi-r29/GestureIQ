import cv2
import mediapipe as mp
import numpy as np
import csv
import os

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

DATASET_FILE = os.path.join(os.path.dirname(__file__), 'pose_landmarks.csv')

def normalize_landmarks(landmarks):
    # Left shoulder = 11, Right shoulder = 12
    # Left hip = 23, Right hip = 24
    sc_x = (landmarks[11].x + landmarks[12].x) / 2
    sc_y = (landmarks[11].y + landmarks[12].y) / 2
    sc_z = (landmarks[11].z + landmarks[12].z) / 2

    hc_x = (landmarks[23].x + landmarks[24].x) / 2
    hc_y = (landmarks[23].y + landmarks[24].y) / 2
    hc_z = (landmarks[23].z + landmarks[24].z) / 2

    torso_height = np.sqrt((sc_x - hc_x)**2 + (sc_y - hc_y)**2 + (sc_z - hc_z)**2)
    if torso_height == 0:
        torso_height = 1.0

    features = []
    for lm in landmarks:
        norm_x = (lm.x - hc_x) / torso_height
        norm_y = (lm.y - hc_y) / torso_height
        norm_z = (lm.z - hc_z) / torso_height
        features.extend([norm_x, norm_y, norm_z])
    
    return features

def main():
    print("=========================================================")
    print("      GestureIQ - Adavu Stance Dataset Recorder          ")
    print("=========================================================")
    stance_label = input("Enter stance label to record (e.g. araimandi, samapada, natyarambham, muzhumandi): ").strip().lower()
    
    if not stance_label:
        print("Invalid label. Exiting.")
        return

    file_exists = os.path.exists(DATASET_FILE)
    
    cap = cv2.VideoCapture(0)
    count = 0

    with open(DATASET_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            header = ['label'] + [f'lm_{i}_{c}' for i in range(33) for c in ['x', 'y', 'z']]
            writer.writerow(header)

        with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            print("Press 's' to start recording frames, 'q' to stop.")
            recording = False

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb)

                if results.pose_landmarks:
                    mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
                    
                    if recording:
                        features = normalize_landmarks(results.pose_landmarks.landmark)
                        writer.writerow([stance_label] + features)
                        count += 1
                        cv2.putText(frame, f"REC: {count} frames ({stance_label})", (20, 40),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    else:
                        cv2.putText(frame, f"STANDBY: Press 's' to RECORD ({stance_label})", (20, 40),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                cv2.imshow('GestureIQ Pose Dataset Recorder', frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('s'):
                    recording = not recording
                    print(f"Recording status: {recording}")
                elif key == ord('q'):
                    break

    cap.release()
    cv2.destroyAllWindows()
    print(f"Saved {count} samples for stance '{stance_label}' to {DATASET_FILE}")

if __name__ == '__main__':
    main()
