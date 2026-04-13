import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle
import sys
import os

# Add root directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

csv_path = "D:/GestureIQ/dataset/bharatanatyam_mudras/landmarks.csv"
model_path = "D:/GestureIQ/models/mudra_model.pkl"

#csv_path = "../dataset/bharatanatyam_mudras/landmarks.csv"
#model_path = "../models/mudra_model.pkl"

if not os.path.exists(csv_path):
    print(f"ERROR: Dataset not found at {csv_path}")
    sys.exit(1)

print(f"Loading dataset from {csv_path}...")
df = pd.read_csv(csv_path)

def process_row(row):
    # Extract x, y, z triplets
    vals = row.values
    pts = []
    for i in range(0, len(vals), 3):
        pts.append([vals[i], vals[i+1], vals[i+2]])
    return extract_features(pts)

X_raw = df.drop('mudra_name', axis=1)
y = df['mudra_name'].values

print("Extracting features (Normalization, Angles, Distances)...")
X = np.array([process_row(row) for _, row in X_raw.iterrows()])

print(f"Feature vector size: {X.shape[1]}")
if X.shape[1] != 82:
    print(f"WARNING: Expected 82 features, got {X.shape[1]}")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training RandomForestClassifier on {len(X_train)} samples...")
model = RandomForestClassifier(n_estimators=200, max_depth=20, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Save model
os.makedirs(os.path.dirname(model_path), exist_ok=True)
with open(model_path, "wb") as f:
    pickle.dump(model, f)

print(f"\n✅ Model saved to {model_path}!")