"""
Step 2: Train Double-Hand Mudra Model
=======================================
- Loads double_landmarks.csv
- Extracts 187 features per sample
- Balances dataset (max 700 per mudra)
- Trains Random Forest
- Saves to models/double_mudra_model.pkl
"""

import pandas as pd
import numpy as np
import pickle
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.double_feature_engineering import extract_double_features

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

CSV_PATH   = "../dataset/double_handed_mudras/double_landmarks.csv"
MODEL_PATH = "../models/double_mudra_model.pkl"
MIN_SAMPLES = 50
MAX_SAMPLES = 700

if not os.path.exists(CSV_PATH):
    print(f"ERROR: {CSV_PATH} not found. Run extract_double_landmarks.py first.")
    sys.exit(1)

print(f"Loading {CSV_PATH}...")
df = pd.read_csv(CSV_PATH)
print(f"Total rows: {len(df)}")
print("\nSamples per mudra:")
print(df['mudra_name'].value_counts())

def process_row(row):
    vals = row.values
    # Right hand: cols 0-62 (21 landmarks x 3)
    right = [[vals[i*3], vals[i*3+1], vals[i*3+2]] for i in range(21)]
    # Left hand: cols 63-125
    left  = [[vals[63+i*3], vals[63+i*3+1], vals[63+i*3+2]] for i in range(21)]
    return extract_double_features(right, left)

print("\nExtracting 187 features per sample...")
X_raw = df.drop('mudra_name', axis=1)
y_raw = df['mudra_name'].values

X_list, y_list = [], []
for i, (_, row) in enumerate(X_raw.iterrows()):
    try:
        feats = process_row(row)
        X_list.append(feats)
        y_list.append(y_raw[i])
    except Exception as e:
        pass
    if i % 500 == 0:
        print(f"  {i}/{len(X_raw)} processed...")

X_all = np.array(X_list)
y_all = np.array(y_list)
print(f"Feature vector size: {X_all.shape[1]}")

# ── Balance dataset ────────────────────────────────────────────
print("\nBalancing dataset...")
X_bal, y_bal = [], []
from collections import Counter
counts = Counter(y_all)

for mudra in sorted(counts.keys()):
    idxs = np.where(y_all == mudra)[0]
    n    = len(idxs)

    if n < MIN_SAMPLES:
        print(f"  SKIP {mudra}: {n} samples (below minimum {MIN_SAMPLES})")
        continue

    if n > MAX_SAMPLES:
        idxs = np.random.choice(idxs, MAX_SAMPLES, replace=False)
        print(f"  CAP  {mudra}: {n} -> {MAX_SAMPLES} samples")
    else:
        print(f"  OK   {mudra}: {n} samples")

    X_bal.append(X_all[idxs])
    y_bal.extend([mudra] * len(idxs))

X = np.vstack(X_bal)
y = np.array(y_bal)
print(f"\nFinal dataset: {len(X)} samples, {len(set(y))} mudras")

# ── Train ──────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTraining RandomForest on {len(X_train)} samples...")
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=25,
    min_samples_split=4,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

y_pred   = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ── Save ───────────────────────────────────────────────────────
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)
print(f"\nModel saved to {MODEL_PATH}")
print("Next -> add /api/predict_double to flask_app.py")