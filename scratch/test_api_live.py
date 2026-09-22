"""
Live API test: call evaluate_image with sample Tillana pose landmarks
and see what the Flask server actually returns.
"""
import requests
import json

# Sample Tillana Paras pose landmarks (arm raised overhead)
# Using simplified but realistic landmarks for a Tillana pose with right arm overhead
# MediaPipe landmark indices:
# 0=nose, 11=L_shoulder, 12=R_shoulder, 13=L_elbow, 14=R_elbow
# 15=L_wrist, 16=R_wrist, 23=L_hip, 24=R_hip, 25=L_knee, 26=R_knee, 27=L_ankle, 28=R_ankle

# Build 33 landmarks (x,y,z,visibility) for a Tillana-like pose
# Using reasonable positions for a standing dancer with right arm raised overhead
lms = [None] * 33

def lm(x, y, z, v=0.9):
    return {"x": x, "y": y, "z": z, "visibility": v}

# Head/face
lms[0] = lm(0.50, 0.10, 0.0)   # nose
lms[1] = lm(0.52, 0.08, 0.05)  # left eye inner
lms[2] = lm(0.54, 0.08, 0.05)  # left eye
lms[3] = lm(0.56, 0.08, 0.05)  # left eye outer
lms[4] = lm(0.48, 0.08, 0.05)  # right eye inner
lms[5] = lm(0.46, 0.08, 0.05)  # right eye
lms[6] = lm(0.44, 0.08, 0.05)  # right eye outer
lms[7] = lm(0.54, 0.09, 0.05)  # left ear
lms[8] = lm(0.46, 0.09, 0.05)  # right ear
lms[9] = lm(0.51, 0.12, 0.0)   # mouth left
lms[10]= lm(0.49, 0.12, 0.0)   # mouth right

# Shoulders
lms[11]= lm(0.38, 0.25, 0.0)   # left shoulder
lms[12]= lm(0.62, 0.25, 0.0)   # right shoulder

# LEFT ARM — extended to side at shoulder level (Natyarambham-like)
lms[13]= lm(0.25, 0.32, 0.0)   # left elbow (arm extended outward)
lms[14]= lm(0.66, 0.10, 0.0)   # right elbow (arm raised overhead — elbow ABOVE shoulder)
lms[15]= lm(0.15, 0.38, 0.0)   # left wrist (extended far left)
lms[16]= lm(0.68, 0.02, 0.0)   # right wrist (overhead — high Y)

# Right hand fingers
lms[17]= lm(0.69, 0.00, 0.0)   # right pinky
lms[18]= lm(0.70, 0.00, 0.0)   # right index
lms[19]= lm(0.70, 0.01, 0.0)   # right thumb
lms[20]= lm(0.68, 0.00, 0.0)   # left pinky
lms[21]= lm(0.69, 0.00, 0.0)   # left index
lms[22]= lm(0.69, 0.01, 0.0)   # left thumb

# Hips (slightly below shoulders in image, more central)
lms[23]= lm(0.44, 0.55, 0.0)   # left hip
lms[24]= lm(0.56, 0.55, 0.0)   # right hip

# Knees (Araimandi depth — bent ~115-125 degrees)
lms[25]= lm(0.40, 0.72, 0.0)   # left knee (outward)
lms[26]= lm(0.60, 0.72, 0.0)   # right knee (outward)

# Ankles (moderate stance width, typical Tillana)
lms[27]= lm(0.38, 0.88, 0.0)   # left ankle
lms[28]= lm(0.62, 0.88, 0.0)   # right ankle

# Feet
lms[29]= lm(0.36, 0.90, 0.0)   # left heel
lms[30]= lm(0.64, 0.90, 0.0)   # right heel
lms[31]= lm(0.34, 0.93, 0.0)   # left foot index
lms[32]= lm(0.66, 0.93, 0.0)   # right foot index

resp = requests.post("http://127.0.0.1:5001/api/sequence/evaluate_image", json={
    "dance_name": "auto",
    "landmarks": lms
})
data = resp.json()
print(f"Status: {resp.status_code}")
print(f"Detected: {data.get('detected')}")
print(f"Dance: {data.get('dance_name')}")
print(f"Matched keyframe: {data.get('matched_keyframe_label')}")
print(f"Score: {data.get('match_score')}")
print(f"Stance: {data.get('current_stance')}")
print(f"Feedback: {data.get('feedback')}")
print(f"\nStudent angles: {json.dumps(data.get('student_angles',{}), indent=2)}")
