import os
import pandas as pd
import numpy as np
import pickle
import sys

# Add root to sys.path to import utils
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

def main():
    csv_path = "../dataset/bharatanatyam_mudras/landmarks.csv"
    output_path = "../models/mudra_library.pkl"
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)
    
    mudra_groups = df.groupby('mudra_name')
    library = {}

    print("Generating library...")
    for name, group in mudra_groups:
        # Extract all landmark columns (x0, y0, z0, ..., x20, y20, z20)
        landmark_cols = [col for col in df.columns if col != 'mudra_name']
        data = group[landmark_cols].values
        
        # Compute mean landmarks (21 * 3 = 63 values)
        mean_landmarks_flat = np.mean(data, axis=0)
        
        # Reshape to 21 x 3
        mean_landmarks = []
        for i in range(21):
            mean_landmarks.append([
                mean_landmarks_flat[i*3],
                mean_landmarks_flat[i*3 + 1],
                mean_landmarks_flat[i*3 + 2]
            ])
            
        # --- Normalize Landmarks for Ghost Hand ---
        # 1. Center at wrist (landmark 0)
        wrist = mean_landmarks[0]
        pts = [[p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]] for p in mean_landmarks]
        
        # 2. Scale by palm size (wrist to middle MCP = landmark 9)
        palm_dist = np.linalg.norm(np.array(pts[9]) - np.array(pts[0]))
        if palm_dist < 1e-6: palm_dist = 1.0
        pts = [[p[0]/palm_dist, p[1]/palm_dist, p[2]/palm_dist] for p in pts]
        
        # Extract features (82 features)
        try:
            features = extract_features(mean_landmarks)
            
            library[name] = {
                "features": features,
                "landmarks": pts # Use normalized landmarks
            }
            print(f"  [+] {name} processed.")
        except Exception as e:
            print(f"  [!] Error processing {name}: {e}")

    print(f"Saving library to {output_path}...")
    with open(output_path, "wb") as f:
        pickle.dump(library, f)
    
    print("🎉 Done!")

if __name__ == "__main__":
    main()
