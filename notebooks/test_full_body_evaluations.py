"""
notebooks/test_full_body_evaluations.py
Comprehensive Test Suite for GestureIQ Full Body Evaluation Engine:
  - Mode A: Fixed Choreography Sequence Evaluation (FastDTW, Progress %, Velocity Windowing, Keyframes)
  - Mode B: Dynamic Freestyle Posture Evaluation (Araimandi, Foot Turnout, Drooping Elbows, Spine Tilt)

Usage:
  python notebooks/test_full_body_evaluations.py
"""

import sys
import os
import json
import numpy as np

sys.path.append(r'd:\GestureIQ')
sys.path.append(r'd:\GestureIQ\notebooks')

import flask_app

app = flask_app.app

def run_full_body_test_suite():
    print("==========================================================================================")
    print("           GESTUREIQ — FULL BODY COMPREHENSIVE EVALUATION TEST SUITE                     ")
    print("==========================================================================================")

    # -----------------------------------------------------------------------------------------
    # HELPER: Generate 3D Synthetic Pose Landmarks
    # -----------------------------------------------------------------------------------------
    def make_pose_landmarks(knee_angle=125.0, elbow_drop=0.05, foot_turnout=180.0, spine_tilt=0.0, knee_valgus_sag=False):
        lms = [{'x': 0.5, 'y': 0.1 * i, 'z': 0.0, 'visibility': 0.95} for i in range(33)]
        
        # Shoulders (11, 12)
        lms[11] = {'x': 0.40, 'y': 0.30, 'z': 0.0, 'visibility': 0.95}
        lms[12] = {'x': 0.60, 'y': 0.30, 'z': 0.0, 'visibility': 0.95}

        # Elbows (13, 14)
        lms[13] = {'x': 0.20, 'y': 0.30 + elbow_drop, 'z': 0.0, 'visibility': 0.95}
        lms[14] = {'x': 0.80, 'y': 0.30 + elbow_drop, 'z': 0.0, 'visibility': 0.95}

        # Wrists (15, 16)
        lms[15] = {'x': 0.15, 'y': 0.30 + elbow_drop, 'z': 0.0, 'visibility': 0.95}
        lms[16] = {'x': 0.85, 'y': 0.30 + elbow_drop, 'z': 0.0, 'visibility': 0.95}

        # Hips (23, 24)
        lms[23] = {'x': 0.42, 'y': 0.55, 'z': 0.0, 'visibility': 0.95}
        lms[24] = {'x': 0.58, 'y': 0.55, 'z': 0.0, 'visibility': 0.95}

        # Knees (25, 26)
        knee_x_offset = 0.05 if knee_valgus_sag else 0.15
        lms[25] = {'x': 0.42 - knee_x_offset, 'y': 0.70, 'z': 0.0, 'visibility': 0.95}
        lms[26] = {'x': 0.58 + knee_x_offset, 'y': 0.70, 'z': 0.0, 'visibility': 0.95}

        # Ankles (27, 28) - Adjust Y to change 3D knee angle dynamically
        knee_y_shift = (180.0 - knee_angle) * 0.003
        lms[27] = {'x': 0.45, 'y': 0.85 - knee_y_shift, 'z': 0.0, 'visibility': 0.95}
        lms[28] = {'x': 0.55, 'y': 0.85 - knee_y_shift, 'z': 0.0, 'visibility': 0.95}

        # Feet Indices (31, 32)
        turn_rad = np.radians(foot_turnout / 2.0)
        lms[31] = {'x': 0.45 - 0.08 * np.sin(turn_rad), 'y': 0.85 + 0.08 * np.cos(turn_rad), 'z': 0.0, 'visibility': 0.95}
        lms[32] = {'x': 0.55 + 0.08 * np.sin(turn_rad), 'y': 0.85 + 0.08 * np.cos(turn_rad), 'z': 0.0, 'visibility': 0.95}

        return lms

    # =========================================================================================
    # PART 1: MODE A — FIXED CHOREOGRAPHY SEQUENCE EVALUATION
    # =========================================================================================
    print("\n------------------------------------------------------------------------------------------")
    print(" PART 1: TESTING MODE A — FIXED CHOREOGRAPHY SEQUENCE EVALUATION (Alarippu)")
    print("------------------------------------------------------------------------------------------")

    # Test Case A1: Static Pose Hold Mode (Alarippu Keyframe Hit)
    lms_static = make_pose_landmarks(knee_angle=125.0)
    with app.test_request_context('/api/sequence/evaluate_frame', method='POST', data=json.dumps({
        'sequence_name': 'Alarippu', 'landmarks': lms_static, 'frame_index': 57
    }), content_type='application/json'):
        data_a1 = flask_app.evaluate_sequence_frame().get_json()
        print("  [Test A1 - Static Hold & Keyframe Hit]")
        print(f"    - Status               : {data_a1.get('status')}")
        print(f"    - Adaptive Window Size : {data_a1.get('adaptive_window_size')} (Expected: 15)")
        print(f"    - Keyframe Hit         : {data_a1.get('is_keyframe_hit')}")
        print(f"    - Keyframe Label       : {data_a1.get('matched_keyframe_label')}")
        assert data_a1.get('adaptive_window_size') == 15, "Window size failed for static hold"

    # Test Case A2: Fast Movement Velocity Expansion
    lms_fast = make_pose_landmarks(knee_angle=40.0, elbow_drop=0.35, knee_valgus_sag=True)
    lms_fast[13] = {'x': 0.10, 'y': 0.10, 'z': 0.0, 'visibility': 0.95} # Rapid arm movement
    lms_fast[14] = {'x': 0.90, 'y': 0.10, 'z': 0.0, 'visibility': 0.95}
    with app.test_request_context('/api/sequence/evaluate_frame', method='POST', data=json.dumps({
        'sequence_name': 'Alarippu', 'landmarks': lms_fast, 'frame_index': 60
    }), content_type='application/json'):
        data_a2 = flask_app.evaluate_sequence_frame().get_json()
        print("  [Test A2 - Fast Movement Window Expansion]")
        print(f"    - Angular Velocity     : {data_a2.get('live_angular_velocity')} deg/s")
        print(f"    - Adaptive Window Size : {data_a2.get('adaptive_window_size')} (Expected: 60)")
        assert data_a2.get('adaptive_window_size') == 60, "Window expansion failed for fast movement"

    # Test Case A3: End-of-Session FastDTW Choreography Match Scoring
    student_timeline = [make_pose_landmarks(knee_angle=125.0) for _ in range(20)]
    with app.test_request_context('/api/sequence/session_complete', method='POST', data=json.dumps({
        'dance_name': 'Alarippu', 'timeline': [{'score': 85.0, 'stance': 'Araimandi Stance', 'landmarks': lm} for lm in student_timeline]
    }), content_type='application/json'):
        data_a3 = flask_app.complete_sequence_session().get_json()
        print("  [Test A3 - FastDTW Choreography Session Complete]")
        print(f"    - Status               : {data_a3.get('status')}")
        print(f"    - Overall Score        : {data_a3.get('overall_score')}%")
        print(f"    - DTW Match Score      : {data_a3.get('choreography_dtw_score')}%")
        print(f"    - Tempo Accuracy       : {data_a3.get('tempo_accuracy_pct')}%")
        print(f"    - Letter Grade         : {data_a3.get('letter_grade')}")

    # =========================================================================================
    # PART 2: MODE B — DYNAMIC FREESTYLE POSTURE EVALUATION (ANY ARBITRARY MOVES)
    # =========================================================================================
    print("\n------------------------------------------------------------------------------------------")
    print(" PART 2: TESTING MODE B — DYNAMIC FREESTYLE STANDALONE POSTURE EVALUATION")
    print("------------------------------------------------------------------------------------------")

    # Test Case B1: Perfect Araimandi Stance (No Faults)
    lms_perfect = make_pose_landmarks(knee_angle=125.0, elbow_drop=0.02, foot_turnout=180.0)
    with app.test_request_context('/api/sequence/evaluate_frame', method='POST', data=json.dumps({
        'sequence_name': 'Freestyle_Dynamic_No_JSON', 'landmarks': lms_perfect, 'frame_index': 0
    }), content_type='application/json'):
        res_b1 = flask_app.evaluate_sequence_frame()
        data_b1 = res_b1[0].get_json() if isinstance(res_b1, tuple) else res_b1.get_json()
        print("  [Test B1 - Perfect Araimandi Posture]")
        print(f"    - Detected Stance      : {data_b1.get('current_stance')}")
        print(f"    - Detected Move        : {data_b1.get('detected_move')}")
        print(f"    - Move Confidence      : {data_b1.get('move_confidence')}")
        print(f"    - Live Posture Score   : {data_b1.get('match_score')}%")
        print(f"    - Feedback             : {data_b1.get('feedback')}")

    # Test Case B2: Posture Fault Matrix (Inward Knee Sag + Drooping Elbows + Forward Feet)
    lms_faulty = make_pose_landmarks(knee_angle=125.0, elbow_drop=0.20, foot_turnout=45.0, knee_valgus_sag=True)
    with app.test_request_context('/api/sequence/evaluate_frame', method='POST', data=json.dumps({
        'sequence_name': 'Freestyle_Dynamic_No_JSON', 'landmarks': lms_faulty, 'frame_index': 0
    }), content_type='application/json'):
        res_b2 = flask_app.evaluate_sequence_frame()
        data_b2 = res_b2[0].get_json() if isinstance(res_b2, tuple) else res_b2.get_json()
        print("  [Test B2 - Posture Fault Matrix Detection]")
        print(f"    - Detected Stance      : {data_b2.get('current_stance')}")
        print(f"    - Detected Move        : {data_b2.get('detected_move')}")
        print(f"    - Live Posture Score   : {data_b2.get('match_score')}%")
        print("    - Corrective Feedback List:")
        for fb in data_b2.get('feedback', []):
            print(f"       * {fb}")

    print("\n==========================================================================================")
    print(" ALL FULL BODY EVALUATION TESTS COMPLETED SUCCESSFULLY! ")
    print("==========================================================================================\n")

if __name__ == '__main__':
    run_full_body_test_suite()
