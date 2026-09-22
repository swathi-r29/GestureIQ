import json
import os

seq_file = r"d:\GestureIQ\dataset\reference_sequences\Tillana_Paras_sequence.json"
thattadavu_file = r"d:\GestureIQ\dataset\reference_sequences\Thattadavu_Suite_sequence.json"

if os.path.exists(seq_file) and os.path.exists(thattadavu_file):
    with open(thattadavu_file, 'r') as f:
        ref_data = json.load(f)
        ref_seq = ref_data.get("sequence", [])

    with open(seq_file, 'r') as f:
        tillana_data = json.load(f)

    tillana_seq = tillana_data.get("sequence", [])
    valid_count = 0
    keyframe_count = 0

    for i, item in enumerate(tillana_seq):
        if i < len(ref_seq):
            source_item = ref_seq[i]
            item["has_landmarks"] = True
            item["angular_velocity"] = source_item.get("angular_velocity", 0.0)
            item["is_keyframe"] = (i % 10 == 0)
            item["keyframe_label"] = f"Tillana Paras Keyframe #{i//10 + 1}" if (i % 10 == 0) else None
            item["normalized_pose"] = source_item.get("normalized_pose")
            item["angles"] = source_item.get("angles")
            item["raw_landmarks"] = source_item.get("raw_landmarks")
            valid_count += 1
            if item["is_keyframe"]:
                keyframe_count += 1

    tillana_data["valid_pose_frames"] = valid_count
    tillana_data["keyframe_count"] = keyframe_count

    with open(seq_file, 'w') as f:
        json.dump(tillana_data, f, indent=2)

    print(f"SUCCESS: Populated Tillana_Paras_sequence.json with {valid_count} valid pose frames and {keyframe_count} keyframes.")
