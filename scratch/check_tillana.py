import json

path = r"d:\GestureIQ\dataset\reference_sequences\Tillana_Paras_sequence.json"
with open(path) as f:
    data = json.load(f)

seq = data.get("sequence", [])
frames_with_angles = [fr for fr in seq if fr.get("angles")]
print(f"Total frames: {len(seq)}")
print(f"With angles: {len(frames_with_angles)}")
print(f"valid_pose_frames in meta: {data.get('valid_pose_frames', 0)}")
if frames_with_angles:
    print(f"Sample angles keys: {list(frames_with_angles[0]['angles'].keys())}")
    print(f"Sample values: {frames_with_angles[0]['angles']}")
else:
    print("NO FRAMES WITH ANGLES — file needs to be repopulated!")
