import json
import os

REF_SEQ_DIR = os.path.abspath("dataset/reference_sequences")
BENCHMARKS_CACHE = {}

for fname in os.listdir(REF_SEQ_DIR):
    if fname.endswith("_sequence.json"):
        d_key = fname.replace("_sequence.json", "")
        with open(os.path.join(REF_SEQ_DIR, fname), "r") as fp:
            data = json.load(fp)
            BENCHMARKS_CACHE[d_key] = data.get("sequence", [])

print(f"Loaded {len(BENCHMARKS_CACHE)} benchmarks.")

veeshi_frames = [f for f in BENCHMARKS_CACHE["Veeshi_Adavu_Suite"] if f.get("angles")]

correct_veeshi = 0
misclassified_as_other = {}

def weighted_err(s, r):
    s_lk, s_rk = s.get("left_knee", 180), s.get("right_knee", 180)
    s_le, s_re = s.get("left_elbow", 180), s.get("right_elbow", 180)
    s_tilt    = s.get("torso_tilt", 0)
    s_ws      = s.get("wrist_span", 0)
    s_ank     = s.get("ankle_distance", 0)
    s_led     = s.get("left_elbow_drop", 0)
    s_red     = s.get("right_elbow_drop", 0)
    s_ft      = s.get("foot_turnout", 90)
    s_sh_tilt = s.get("shoulder_tilt", 0)

    r_lk, r_rk = r.get("left_knee", 180), r.get("right_knee", 180)
    r_le, r_re = r.get("left_elbow", 180), r.get("right_elbow", 180)
    r_tilt    = r.get("torso_tilt", 0)
    r_ws      = r.get("wrist_span", 0)
    r_ank     = r.get("ankle_distance", 0)
    r_led     = r.get("left_elbow_drop", 0)
    r_red     = r.get("right_elbow_drop", 0)
    r_ft      = r.get("foot_turnout", 90)
    r_sh_tilt = r.get("shoulder_tilt", 0)

    return (
        abs(r_lk - s_lk)            * 0.15 +
        abs(r_rk - s_rk)            * 0.15 +
        abs(r_le - s_le)            * 0.10 +
        abs(r_re - s_re)            * 0.10 +
        abs(r_ws - s_ws)  * 100     * 0.15 +
        abs(r_ank - s_ank) * 80     * 0.12 +
        abs(r_led - s_led) * 80     * 0.05 +
        abs(r_red - s_red) * 80     * 0.05 +
        abs(r_tilt - s_tilt)        * 0.07 +
        abs(r_ft - s_ft)   * 0.5   * 0.04 +
        abs(r_sh_tilt - s_sh_tilt) * 80 * 0.02
    )

for test_f in veeshi_frames:
    s_angles = test_f["angles"]
    best_dance = None
    best_err = float("inf")

    for d_key, seq_frames in BENCHMARKS_CACHE.items():
        valid_f = [item for item in seq_frames if item.get("angles")]
        for item in valid_f:
            err = weighted_err(s_angles, item["angles"])
            if err < best_err:
                best_err = err
                best_dance = d_key

    if best_dance == "Veeshi_Adavu_Suite":
        correct_veeshi += 1
    else:
        misclassified_as_other[best_dance] = misclassified_as_other.get(best_dance, 0) + 1

print(f"Veeshi test results out of {len(veeshi_frames)} frames:")
print(f"  Correct Veeshi_Adavu_Suite matches: {correct_veeshi}")
print(f"  Misclassifications breakdown: {misclassified_as_other}")
