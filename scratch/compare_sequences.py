import json, numpy as np

files = {
    "Tillana_Paras": r"d:\GestureIQ\dataset\reference_sequences\Tillana_Paras_sequence.json",
    "Alarippu": r"d:\GestureIQ\dataset\reference_sequences\Alarippu_sequence.json",
}

for name, path in files.items():
    with open(path) as f:
        data = json.load(f)
    frames = [fr for fr in data["sequence"] if fr.get("angles")][:200]
    if not frames:
        print(f"{name}: NO angle frames!")
        continue
    keys = ["left_knee","right_knee","left_elbow","right_elbow","wrist_span","ankle_distance","foot_turnout"]
    avgs = {}
    for k in keys:
        vals = [fr["angles"].get(k, None) for fr in frames if fr["angles"].get(k) is not None]
        avgs[k] = round(np.mean(vals), 2) if vals else "N/A"
    print(f"\n=== {name} (n={len(frames)} frames) ===")
    for k, v in avgs.items():
        print(f"  {k}: {v}")
