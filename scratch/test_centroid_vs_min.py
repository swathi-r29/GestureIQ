import sys
sys.path.insert(0, '.')
from notebooks.flask_app import BENCHMARKS_CACHE

print("Testing Centroid vs Min-Frame Error on Natta_Adavu...")

natta_seq = BENCHMARKS_CACHE.get("Natta_Adavu", [])
natta_valid = [item for item in natta_seq if item.get("angles")]
if not natta_valid:
    print("No valid angles in Natta_Adavu!")
else:
    sample = natta_valid[5]
    student_angles = sample["angles"]
    print(f"Sample pose stance: {student_angles.get('detected_stance')}, Wrist span: {student_angles.get('wrist_span')}")

    s_lk      = student_angles.get("left_knee", 180)
    s_rk      = student_angles.get("right_knee", 180)
    s_le      = student_angles.get("left_elbow", 180)
    s_re      = student_angles.get("right_elbow", 180)
    s_tilt    = student_angles.get("torso_tilt", 0)
    s_ws      = student_angles.get("wrist_span", 0)
    s_ank     = student_angles.get("ankle_distance", 0)
    s_led     = student_angles.get("left_elbow_drop", 0)
    s_red     = student_angles.get("right_elbow_drop", 0)
    s_ft      = student_angles.get("foot_turnout", 90)
    s_sh_tilt = student_angles.get("shoulder_tilt", 0)

    def _weighted_err(r_lk, r_rk, r_le, r_re, r_tilt, r_ws, r_ank, r_led, r_red, r_ft, r_sh_tilt):
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

    # Method A: Min Frame Error (Best matching frame)
    min_scores = []
    for d_key, seq_frames in BENCHMARKS_CACHE.items():
        best_err = float('inf')
        for item in seq_frames:
            ra = item.get("angles")
            if not ra: continue
            err = _weighted_err(ra.get("left_knee", 180), ra.get("right_knee", 180), ra.get("left_elbow", 180), ra.get("right_elbow", 180), ra.get("torso_tilt", 0), ra.get("wrist_span", 0), ra.get("ankle_distance", 0), ra.get("left_elbow_drop", 0), ra.get("right_elbow_drop", 0), ra.get("foot_turnout", 90), ra.get("shoulder_tilt", 0))
            if err < best_err: best_err = err
        score = max(0.0, round(100.0 - best_err, 1))
        min_scores.append((d_key, score))
    min_scores.sort(key=lambda x: x[1], reverse=True)

    # Method B: Centroid Mean Error
    mean_scores = []
    for d_key, seq_frames in BENCHMARKS_CACHE.items():
        lk_v=[]; rk_v=[]; le_v=[]; re_v=[]; tilt_v=[]
        ws_v=[]; ank_v=[]; led_v=[]; red_v=[]; ft_v=[]; sh_v=[]
        for item in seq_frames:
            ra = item.get("angles")
            if not ra: continue
            lk_v.append(ra.get("left_knee", 180))
            rk_v.append(ra.get("right_knee", 180))
            le_v.append(ra.get("left_elbow", 180))
            re_v.append(ra.get("right_elbow", 180))
            tilt_v.append(ra.get("torso_tilt", 0))
            ws_v.append(ra.get("wrist_span", 0))
            ank_v.append(ra.get("ankle_distance", 0))
            led_v.append(ra.get("left_elbow_drop", 0))
            red_v.append(ra.get("right_elbow_drop", 0))
            ft_v.append(ra.get("foot_turnout", 90))
            sh_v.append(ra.get("shoulder_tilt", 0))
        def _m(v): return sum(v)/len(v) if v else 0
        err = _weighted_err(_m(lk_v), _m(rk_v), _m(le_v), _m(re_v), _m(tilt_v), _m(ws_v), _m(ank_v), _m(led_v), _m(red_v), _m(ft_v), _m(sh_v))
        score = max(0.0, round(100.0 - err, 1))
        mean_scores.append((d_key, score))
    mean_scores.sort(key=lambda x: x[1], reverse=True)

    print("\n--- METHOD A: BEST KEYFRAME MATCH (Min Error) ---")
    for r in min_scores[:5]:
        print(f"Dance: {r[0]:<25} | Score: {r[1]}%")

    print("\n--- METHOD B: AVERAGE CENTROID MATCH (Flawed Mean Error) ---")
    for r in mean_scores[:5]:
        print(f"Dance: {r[0]:<25} | Score: {r[1]}%")
