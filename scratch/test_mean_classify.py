"""
Simulate the new per-sequence MEAN classifier against a Tillana Paras sample pose.
This confirms the volume-bias fix works before restarting Flask.
"""
import json, os, math

REF_DIR = r"d:\GestureIQ\dataset\reference_sequences"

# Load all sequences and compute their mean angles
def _mean(v):
    return sum(v) / len(v) if v else 0.0

KEYS = ["left_knee","right_knee","left_elbow","right_elbow","torso_tilt",
        "wrist_span","ankle_distance","left_elbow_drop","right_elbow_drop",
        "foot_turnout","shoulder_tilt"]

SEQ_MEANS = {}
for fname in os.listdir(REF_DIR):
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
        means[k] = _mean(vals)
    SEQ_MEANS[dance_key] = means

print(f"Loaded {len(SEQ_MEANS)} sequences\n")

# Print mean angles for Tillana vs Alarippu (key distinguishers)
for name in ["Tillana_Paras","Alarippu"]:
    m = SEQ_MEANS.get(name)
    if m:
        print(f"{name}:")
        for k in ["left_elbow","right_elbow","wrist_span","ankle_distance","left_elbow_drop","right_elbow_drop"]:
            print(f"  {k}: {round(m[k],3)}")

print()

# Simulated student pose: Tillana arm-raised position
# Right arm overhead: right_elbow ~90, right_elbow_drop high positive
# Left arm extended to side: left_elbow ~140, wrist_span moderate
# Narrow stance typical of Tillana
student = {
    "left_knee": 115.0,
    "right_knee": 118.0,
    "left_elbow": 140.0,   # extended arm
    "right_elbow": 88.0,   # overhead bent arm
    "torso_tilt": 3.0,
    "wrist_span": 0.55,    # narrow (overhead hand close to body)
    "ankle_distance": 0.12, # narrow stance
    "left_elbow_drop": 0.1,
    "right_elbow_drop": 0.45,  # right arm raised above shoulder
    "foot_turnout": 55.0,
    "shoulder_tilt": 0.02,
}

def weighted_err(ref, stu):
    return (
        abs(ref["left_knee"] - stu["left_knee"])      * 0.15 +
        abs(ref["right_knee"] - stu["right_knee"])     * 0.15 +
        abs(ref["left_elbow"] - stu["left_elbow"])     * 0.10 +
        abs(ref["right_elbow"] - stu["right_elbow"])   * 0.10 +
        abs(ref["wrist_span"] - stu["wrist_span"])     * 100 * 0.15 +
        abs(ref["ankle_distance"] - stu["ankle_distance"]) * 80 * 0.12 +
        abs(ref["left_elbow_drop"] - stu["left_elbow_drop"]) * 80 * 0.05 +
        abs(ref["right_elbow_drop"] - stu["right_elbow_drop"]) * 80 * 0.05 +
        abs(ref["torso_tilt"] - stu["torso_tilt"])    * 0.07 +
        abs(ref["foot_turnout"] - stu["foot_turnout"]) * 0.5 * 0.04 +
        abs(ref["shoulder_tilt"] - stu["shoulder_tilt"]) * 80 * 0.02
    )

scores = {}
for dance_key, means in SEQ_MEANS.items():
    err = weighted_err(means, student)
    scores[dance_key] = round(max(0.0, 100.0 - err), 1)

ranked = sorted(scores.items(), key=lambda x: -x[1])
print("=== Classification ranking (mean-angle method) ===")
for name, score in ranked[:8]:
    marker = " ** WINNER **" if name == ranked[0][0] else ("  <- Tillana" if name == "Tillana_Paras" else "")
    print(f"  {name:40s}: {score:5.1f}{marker}")
