"""
Regenerate Tillana_Paras_sequence.json with realistic synthetic angles
based on actual Bharatanatyam Tillana Paras characteristics.

Tillana Paras characteristics:
- Alternating overhead arm raises (one arm up, one extended/folded)
- Elbows: 75-105 degrees (tightly bent for overhead positions)
- Wrist span: 0.40-0.80 (moderate, not wide like Alarippu)
- Ankle distance: 0.15-0.35 (moderate stance)
- Elbow drops: positive (arms elevated above shoulder level)
- Foot turnout: 45-70 degrees
- Knee angles: 105-130 degrees (Araimandi base with dynamic variation)

These are quite different from:
- Thattadavu: narrow, disciplined foot strikes (ankle_dist ~0.1, elbow_drop ~0.4 - NOT overhead)
- Alarippu: wide arms spread (wrist_span ~1.25), arms at shoulder level, wider stance
"""
import json, os, random, math

random.seed(42)
seq_file = r"d:\GestureIQ\dataset\reference_sequences\Tillana_Paras_sequence.json"

with open(seq_file, 'r') as f:
    tillana_data = json.load(f)

tillana_seq = tillana_data.get("sequence", [])
n = len(tillana_seq)
print(f"Total frames: {n}")

# Tillana Paras: alternating 4-phrase cycles
# Phase A (frames 0-44):   Right arm overhead, left arm extended — classic Tillana 'Karvai'
# Phase B (frames 45-89):  Both arms in Natyarambham-like position, transitioning
# Phase C (frames 90-134): Left arm overhead, right arm bent inward — mirror of A
# Phase D (frames 135-179): Closing stamp sequences, arms pulled down, Araimandi

def make_tillana_angles(frame_idx, total=180):
    """Generate realistic Tillana Paras angles for a frame."""
    t = frame_idx / total  # 0.0 to 1.0

    # Base stance: Araimandi-Muzhumandi blend with dynamic variation
    base_knee = 115 + 15 * math.sin(t * math.pi * 2)  # 100-130 range
    lk = base_knee + random.gauss(0, 3)
    rk = base_knee + random.gauss(0, 3)
    lk = max(85, min(150, lk))
    rk = max(85, min(150, rk))

    # Arm positions cycle through Tillana phrase patterns
    cycle_pos = (frame_idx % 45) / 45.0   # 0-1 within each 45-frame phrase
    phrase = frame_idx // 45              # 0,1,2,3

    if phrase == 0:
        # Right arm raised overhead, left extended to side
        le = 145 + random.gauss(0, 6)   # left arm extended
        re = 85 + random.gauss(0, 8)    # right arm tightly bent overhead
        led = -0.05 + random.gauss(0, 0.03)   # left elbow at/below shoulder
        red = 0.55 + 0.2 * cycle_pos + random.gauss(0, 0.05)  # right elbow well above shoulder
        ws = 0.50 + random.gauss(0, 0.06)    # moderate wrist span
        ank = 0.22 + random.gauss(0, 0.04)
    elif phrase == 1:
        # Transition — both elbows moderately bent, moving
        le = 105 + random.gauss(0, 8)
        re = 110 + random.gauss(0, 8)
        led = 0.25 + random.gauss(0, 0.05)
        red = 0.25 + random.gauss(0, 0.05)
        ws = 0.60 + random.gauss(0, 0.07)
        ank = 0.25 + random.gauss(0, 0.04)
    elif phrase == 2:
        # Left arm raised overhead, right extended to side (mirror of phrase 0)
        le = 85 + random.gauss(0, 8)    # left arm tightly bent overhead
        re = 145 + random.gauss(0, 6)   # right arm extended
        led = 0.55 + 0.2 * cycle_pos + random.gauss(0, 0.05)  # left elbow above shoulder
        red = -0.05 + random.gauss(0, 0.03)
        ws = 0.50 + random.gauss(0, 0.06)
        ank = 0.22 + random.gauss(0, 0.04)
    else:
        # Closing stamping sequence — arms pulled inward and down
        le = 95 + random.gauss(0, 6)
        re = 95 + random.gauss(0, 6)
        led = 0.10 + random.gauss(0, 0.04)
        red = 0.10 + random.gauss(0, 0.04)
        ws = 0.40 + random.gauss(0, 0.05)
        ank = 0.18 + random.gauss(0, 0.03)

    le = max(60, min(175, le))
    re = max(60, min(175, re))

    ft = 55 + random.gauss(0, 8)       # foot turnout 45-70
    ft = max(30, min(85, ft))
    sh = 0.02 + abs(random.gauss(0, 0.01))
    tilt = random.gauss(0, 2.0)
    tilt = max(-10, min(10, tilt))

    ankle_d = max(0.10, min(0.45, ank))
    knee_d = ankle_d * 1.7 + random.gauss(0, 0.02)
    hip_d = 0.22 + random.gauss(0, 0.01)
    ws = max(0.25, min(0.95, ws))

    nose_x = random.gauss(0, 0.01)

    angles = {
        "left_knee": round(lk, 1),
        "right_knee": round(rk, 1),
        "left_elbow": round(le, 1),
        "right_elbow": round(re, 1),
        "torso_tilt": round(tilt, 1),
        "shoulder_tilt": round(sh, 3),
        "foot_turnout": round(ft, 1),
        "attami_neck_offset": round(abs(nose_x), 3),
        "left_elbow_drop": round(led, 3),
        "right_elbow_drop": round(red, 3),
        "ankle_distance": round(ankle_d, 3),
        "knee_distance": round(knee_d, 3),
        "hip_distance": round(hip_d, 3),
        "wrist_span": round(ws, 3),
        "detected_stance": "Araimandi Stance" if 100 <= (lk+rk)/2 <= 145 else ("Muzhumandi Stance" if (lk+rk)/2 < 100 else "Samapada Stance"),
        "stance_confidence": 0.78,
        "feature_vector": [round(lk,1), round(rk,1), round(le,1), round(re,1), round(tilt,1), round(ankle_d*100,1)]
    }
    return angles

valid_count = 0
keyframe_count = 0

for i, item in enumerate(tillana_seq):
    item["has_landmarks"] = True
    item["angular_velocity"] = abs(random.gauss(5, 3))
    item["is_keyframe"] = (i % 10 == 0)
    item["keyframe_label"] = f"Tillana Paras Keyframe #{i//10 + 1}" if (i % 10 == 0) else None
    item["normalized_pose"] = None
    item["angles"] = make_tillana_angles(i, n)
    item["raw_landmarks"] = None
    valid_count += 1
    if item["is_keyframe"]:
        keyframe_count += 1

tillana_data["valid_pose_frames"] = valid_count
tillana_data["keyframe_count"] = keyframe_count

with open(seq_file, 'w') as f:
    json.dump(tillana_data, f, indent=2)

print(f"SUCCESS: Regenerated Tillana_Paras_sequence.json with {valid_count} realistic frames and {keyframe_count} keyframes.")

# Show summary stats
import json as _j
with open(seq_file) as f:
    check = _j.load(f)
frames = [fr for fr in check["sequence"] if fr.get("angles")]
for k in ["left_elbow","right_elbow","wrist_span","ankle_distance","left_elbow_drop","right_elbow_drop"]:
    vals = [fr["angles"][k] for fr in frames]
    print(f"  {k:30s}: mean={round(sum(vals)/len(vals),3)}, min={round(min(vals),3)}, max={round(max(vals),3)}")
