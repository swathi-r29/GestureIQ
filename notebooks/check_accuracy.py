import pandas as pd
import numpy as np
import pickle
import sys
import os
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import accuracy_score, classification_report

# Add root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

csv_path = "D:/GestureIQ/dataset/bharatanatyam_mudras/landmarks_fixed.csv"
model_path = "D:/GestureIQ/models/mudra_model.pkl"

if not os.path.exists(csv_path):
    print(f"Error: {csv_path} not found. Run train_mudra_model_fixed.py first.")
    sys.exit(1)

if not os.path.exists(model_path):
    print(f"Error: {model_path} not found. Run train_mudra_model_fixed.py first.")
    sys.exit(1)

print("Loading dataset and model...")
df = pd.read_csv(csv_path)
with open(model_path, "rb") as f:
    model = pickle.load(f)

print("Extracting features and grouping by session/video...")
X, y, groups = [], [], []
for _, row in df.iterrows():
    vals  = row.drop(['mudra_name', 'hand_label', 'group']).values
    label = row['hand_label']
    group = row['group']
    pts   = [[vals[i*3], vals[i*3+1], vals[i*3+2]] for i in range(21)]
    try:
        feats = extract_features(pts, label=label)
        X.append(feats)
        y.append(row['mudra_name'])
        groups.append(group)
    except Exception as e:
        print(f"  [warn] feature error: {e}")

X = np.array(X)
y = np.array(y)
groups = np.array(groups)

print("Splitting with StratifiedGroupKFold (5-fold, first split)...")
sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
train_idx, test_idx = next(sgkf.split(X, y, groups=groups))

X_test = X[test_idx]
y_test = y[test_idx]

print("Evaluating model...")
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nMethodology-aligned Test Accuracy: {acc*100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))
