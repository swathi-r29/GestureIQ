import os
import json
import numpy as np
import glob
from utils.pose_feature_engineering import normalize_landmarks, extract_body_angles

REF_IMAGES_DIR = "dataset/reference_images"
os.makedirs(REF_IMAGES_DIR, exist_ok=True)

# Build feature dictionary for all reference folders
def load_reference_folder_dataset():
    ref_db = {}
    subdirs = [d for d in os.listdir(REF_IMAGES_DIR) if os.path.isdir(os.path.join(REF_IMAGES_DIR, d))]
    print(f"[REF FOLDER] Found {len(subdirs)} reference dance subfolders: {subdirs}")
    return subdirs

if __name__ == "__main__":
    load_reference_folder_dataset()
