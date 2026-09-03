"""
notebooks/check_ingested_sequences.py
Lists all ingested YouTube reference sequences, video sources, frame counts, keyframes, and durations.

Usage:
  python notebooks/check_ingested_sequences.py
"""

import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_SEQ_DIR = os.path.join(BASE_DIR, "dataset", "reference_sequences")
RAW_VIDEO_DIR = os.path.join(BASE_DIR, "dataset", "raw_reference_videos")

def list_ingested_sequences():
    print("==========================================================================================")
    print("                 GESTUREIQ - INGESTED YOUTUBE REFERENCE SEQUENCES                        ")
    print("==========================================================================================")

    if not os.path.exists(REF_SEQ_DIR):
        print("❌ No reference_sequences directory found.")
        return

    files = [f for f in os.listdir(REF_SEQ_DIR) if f.endswith("_sequence.json")]
    if not files:
        print("⚠️ No ingested sequence JSON files found in dataset/reference_sequences/")
        return

    print(f"Total Ingested Sequences: {len(files)}\n")
    print(f"{'Dance Name':<28} | {'Total Frames':<13} | {'Valid Poses':<12} | {'Keyframe Holds':<15} | {'Source Video':<25}")
    print("-" * 105)

    for fname in sorted(files):
        fpath = os.path.join(REF_SEQ_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            dance_name = data.get("dance_name", fname.replace("_sequence.json", ""))
            total_frames = data.get("total_sampled_frames", len(data.get("sequence", [])))
            valid_frames = data.get("valid_pose_frames", sum(1 for item in data.get("sequence", []) if item.get("has_landmarks")))
            keyframes = data.get("keyframe_count", sum(1 for item in data.get("sequence", []) if item.get("is_keyframe")))
            source = data.get("source_url") or ("Local MP4" if os.path.exists(os.path.join(RAW_VIDEO_DIR, f"{dance_name}.mp4")) else "N/A")

            d_name_str = dance_name[:26] + ".." if len(dance_name) > 26 else dance_name
            src_str = str(source)[:24] + ".." if len(str(source)) > 24 else str(source)

            print(f"{d_name_str:<28} | {total_frames:<13} | {valid_frames:<12} | {keyframes:<15} | {src_str:<25}")

        except Exception as e:
            print(f"❌ Error reading {fname}: {e}")

    print("==========================================================================================\n")

if __name__ == "__main__":
    list_ingested_sequences()
