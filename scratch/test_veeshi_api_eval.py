import json
import requests
import os

REF_SEQ_DIR = os.path.abspath("dataset/reference_sequences")
veeshi_file = os.path.join(REF_SEQ_DIR, "Veeshi_Adavu_Suite_sequence.json")

with open(veeshi_file, "r") as f:
    data = json.load(f)

sequence = data.get("sequence", [])
keyframes = [item for item in sequence if item.get("is_keyframe") and item.get("raw_landmarks")]

print(f"Found {len(keyframes)} keyframes with raw_landmarks in Veeshi_Adavu_Suite.")

results_summary = {}

for idx, kf in enumerate(keyframes[:15]):
    landmarks = kf["raw_landmarks"]
    # Test with dance_name = 'auto'
    resp = requests.post("http://127.0.0.1:5001/api/sequence/evaluate_image", json={
        "dance_name": "auto",
        "landmarks": landmarks
    })
    res = resp.json()
    detected_dance = res.get("dance_name", "UNKNOWN")
    results_summary[detected_dance] = results_summary.get(detected_dance, 0) + 1
    print(f"Keyframe #{idx+1} ({kf.get('frame_file')}): Detected -> {detected_dance} (score: {res.get('match_score')})")

print("\nSummary of auto-detection on first 15 Veeshi keyframes:")
print(results_summary)
