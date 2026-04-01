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
    return features[63:68]

results = {}
for mudra in df['mudra_name'].unique():
    mudra_df = df[df['mudra_name'] == mudra]
    angles = np.array([get_angles(row) for _, row in mudra_df.iloc[:, 1:].iterrows()])
    avg_angles = np.mean(angles, axis=0)
    results[mudra] = {
        "thumb": round(float(avg_angles[0]), 1),
        "index": round(float(avg_angles[1]), 1),
        "middle": round(float(avg_angles[2]), 1),
        "ring": round(float(avg_angles[3]), 1),
        "pinky": round(float(avg_angles[4]), 1)
    }

print("MUDRA_REFERENCE_ANGLES = {")
for mudra, angles in sorted(results.items()):
    print(f'    "{mudra}": {angles},')
print("}")
