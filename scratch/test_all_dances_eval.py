import json
import os
import requests

REF_SEQ_DIR = os.path.abspath("dataset/reference_sequences")
json_files = [f for f in os.listdir(REF_SEQ_DIR) if f.endswith("_sequence.json")]

print("===============================================================")
print(f"   GestureIQ - Comprehensive Benchmark Detection Test")
print("===============================================================")
print(f"Found {len(json_files)} reference dance sequence files in library:\n")

total_tested = 0
total_correct = 0
results_table = []

for fname in sorted(json_files):
    dance_name = fname.replace("_sequence.json", "")
    fpath = os.path.join(REF_SEQ_DIR, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)

    sequence = data.get("sequence", [])
    # Grab frames with non-None raw_landmarks and non-None angles
    valid_frames = [
        item for item in sequence
        if item.get("raw_landmarks") is not None and item.get("angles") is not None
    ]

    if not valid_frames:
        results_table.append((dance_name, 0, 0, "No valid landmarks in sequence file"))
        continue

    # Pick up to 5 representative keyframes spread across the dance sequence
    sample_indices = [0, len(valid_frames)//4, len(valid_frames)//2, (3*len(valid_frames))//4, len(valid_frames)-1]
    sample_indices = sorted(list(set(sample_indices)))
    test_samples = [valid_frames[i] for i in sample_indices if i < len(valid_frames)]

    correct_for_this_dance = 0

    for sample in test_samples:
        lms = sample.get("raw_landmarks") or sample.get("landmarks") or sample.get("normalized_pose")
        resp = requests.post("http://127.0.0.1:5001/api/sequence/evaluate_image", json={
            "dance_name": "auto",
            "landmarks": lms
        })

        if resp.status_code == 200:
            res_json = resp.json()
            detected_dance = res_json.get("dance_name", "")
            match_score = res_json.get("match_score", 0)

            total_tested += 1
            if detected_dance.lower() == dance_name.lower():
                correct_for_this_dance += 1
                total_correct += 1
            else:
                print(f"  [MISMATCH] [{dance_name}] frame {sample.get('step_index')}: detected as '{detected_dance}' (score: {match_score})")

    acc_pct = round((correct_for_this_dance / len(test_samples)) * 100, 1) if test_samples else 0
    results_table.append((dance_name, len(test_samples), correct_for_this_dance, f"{acc_pct}% Accuracy"))

print("\n" + "="*65)
print(f" {'DANCE ITEM':<28} | {'TESTED':<8} | {'MATCHED':<8} | ACCURACY")
print("="*65)
for dance, tested, matched, acc in results_table:
    print(f" {dance:<28} | {tested:<8} | {matched:<8} | {acc}")
print("="*65)

overall_pct = round((total_correct / max(1, total_tested)) * 100, 1)
print(f"\n[SUMMARY] OVERALL AUTO-DETECTION ACCURACY: {overall_pct}% ({total_correct}/{total_tested} test keyframes)")
