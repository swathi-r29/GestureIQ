import pandas as pd
import numpy as np
import sys
import os

# Add root directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

csv_path = "D:/GestureIQ/dataset/bharatanatyam_mudras/landmarks.csv"

if not os.path.exists(csv_path):
    print(f"ERROR: Dataset not found at {csv_path}")
    sys.exit(1)

df = pd.read_csv(csv_path)

def get_angles(row):
    vals = row.values
    pts = []
    for i in range(0, len(vals), 3):
        pts.append([vals[i], vals[i+1], vals[i+2]])
    features = extract_features(pts)
    # Features 63-67 are the 5 angles
    return features[63:68]

for mudra in ["mushti", "kapittha"]:
    mudra_df = df[df['mudra_name'] == mudra]
    if mudra_df.empty:
        print(f"No samples for {mudra}")
        continue
    
    angles = np.array([get_angles(row) for _, row in mudra_df.iloc[:, 1:].iterrows()])
    avg_angles = np.mean(angles, axis=0)
    print(f"\nAverage angles for {mudra}:")
    print(f"  Thumb:  {avg_angles[0]:.2f}")
    print(f"  Index:  {avg_angles[1]:.2f}")
    print(f"  Middle: {avg_angles[2]:.2f}")
    print(f"  Ring:   {avg_angles[3]:.2f}")
    print(f"  Pinky:  {avg_angles[4]:.2f}")
