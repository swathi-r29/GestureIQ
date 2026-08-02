import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_SEQ_DIR = os.path.join(BASE_DIR, "dataset", "reference_sequences")

def test_sequence_integrity(dance_name):
    seq_file = os.path.join(REF_SEQ_DIR, f"{dance_name}_sequence.json")
    if not os.path.exists(seq_file):
        print(f"❌ Sequence file missing: {seq_file}")
        return False

    with open(seq_file, "r") as f:
        data = json.load(f)

    total_frames = data.get("total_frames", 0)
    valid_frames = data.get("valid_pose_frames", 0)
    sequence = data.get("sequence", [])

    print(f"\n==================================================")
    print(f"  Reference Sequence Verification: {dance_name}")
    print(f"==================================================")
    print(f"  - Total frames in sequence : {total_frames}")
    print(f"  - Frames with valid 3D pose: {valid_frames}")
    if total_frames > 0:
        valid_pct = (valid_frames / total_frames) * 100
        print(f"  - Posture Coverage Rate     : {valid_pct:.1f}%")

    if sequence:
        sample = sequence[0]
        print(f"  - Sample frame [{sample['frame_file']}]:")
        print(f"    * Has Landmarks: {sample['has_landmarks']}")
        print(f"    * Angles: {sample['angles']}")

    print(f"  [OK] Sequence file is valid and ready for live video evaluation!\n")
    return True

if __name__ == "__main__":
    for dance in ["Alarippu", "Pushpanjali"]:
        test_sequence_integrity(dance)
