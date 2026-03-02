import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os

df = pd.read_csv("D:/GestureIQ/dataset/bharatanatyam_mudras/landmarks.csv")

# Normalize landmarks relative to wrist
def normalize(row):
    vals = row.values
    wrist_x, wrist_y, wrist_z = vals[0], vals[1], vals[2]
    normalized = []
    for i in range(0, len(vals), 3):
        normalized += [vals[i]-wrist_x, vals[i+1]-wrist_y, vals[i+2]-wrist_z]
    
    # Scale normalization
    max_val = max(abs(v) for v in normalized)
    if max_val > 0:
        normalized = [v / max_val for v in normalized]
        
    # Feature Engineering: Distance from Thumb tip (point 4) to other tips (8, 12, 16, 20)
    # Point N starts at index N*3: 4->12, 8->24, 12->36, 16->48, 20->60
    import math
    def get_dist(p1_idx, p2_idx):
        return math.sqrt(
            (normalized[p1_idx] - normalized[p2_idx])**2 +
            (normalized[p1_idx+1] - normalized[p2_idx+1])**2 +
            (normalized[p1_idx+2] - normalized[p2_idx+2])**2
        )
    
    distances = [
        get_dist(12, 24), # Thumb to Index
        get_dist(12, 36), # Thumb to Middle
        get_dist(12, 48), # Thumb to Ring
        get_dist(12, 60)  # Thumb to Pinky
    ]
    
    # Feature 2: Finger Straightness (Distance from Tip to PIP Joint)
    # Index: Tip (8)->24, PIP (6)->18
    # Middle: Tip (12)->36, PIP (10)->30
    # Ring: Tip (16)->48, PIP (14)->42
    # Pinky: Tip (20)->60, PIP (18)->54
    straightness = [
        get_dist(24, 15), # Index curl (using MCP joint 5->15 for better arc measurement)
        get_dist(36, 27), # Middle curl
        get_dist(48, 39), # Ring curl
        get_dist(60, 51)  # Pinky curl
    ]
    
    return normalized + distances + straightness

X_raw = df.drop('mudra_name', axis=1)
X = np.array([normalize(row) for _, row in X_raw.iterrows()])
y = df['mudra_name'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training...")
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

accuracy = accuracy_score(y_test, model.predict(X_test))
print(f"Accuracy: {accuracy * 100:.2f}%")

with open("D:/GestureIQ/models/mudra_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("✅ Model saved!")