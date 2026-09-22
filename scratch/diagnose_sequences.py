"""
Diagnose: why Thattadavu and Tillana have the same score.
Show all sequence means side by side so we can tune weights.
"""
import json, os

REF_DIR = r"d:\GestureIQ\dataset\reference_sequences"
KEYS = ["left_knee","right_knee","left_elbow","right_elbow","torso_tilt",
        "wrist_span","ankle_distance","left_elbow_drop","right_elbow_drop",
        "foot_turnout","shoulder_tilt"]

def _mean(v):
    return sum(v)/len(v) if v else 0.0

SEQ_MEANS = {}
for fname in sorted(os.listdir(REF_DIR)):
    if not fname.endswith("_sequence.json"):
        continue
    dance_key = fname.replace("_sequence.json","")
    with open(os.path.join(REF_DIR, fname)) as f:
        data = json.load(f)
    frames = [fr for fr in data.get("sequence",[]) if fr.get("angles")]
    if not frames:
        continue
    means = {}
    for k in KEYS:
        vals = [fr["angles"].get(k) for fr in frames if fr["angles"].get(k) is not None]
        means[k] = round(_mean(vals), 3)
    SEQ_MEANS[dance_key] = means

# Compare Tillana vs Thattadavu
for name in ["Tillana_Paras", "Thattadavu_Suite", "Alarippu"]:
    m = SEQ_MEANS.get(name, {})
    print(f"\n=== {name} ===")
    for k in KEYS:
        print(f"  {k:30s}: {m.get(k, 'N/A')}")
