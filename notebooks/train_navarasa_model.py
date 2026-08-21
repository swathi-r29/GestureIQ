import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import pickle

import os

BASE_DIR = os.path.dirname(__file__)
CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "dataset", "navarasa", "navarasa_landmarks.csv"))
df   = pd.read_csv(CSV)
print("Shape:", df.shape)
print("\nSamples per rasa:")
print(df['label'].value_counts())

#CSV  = "../dataset/navarasa/navarasa_landmarks.csv"
#df   = pd.read_csv(CSV)
#print("Shape:", df.shape)
#print("\nSamples per rasa:")
#print(df['label'].value_counts())

# ── Prepare ────────────────────────────────────────────────────────────────
X = df.drop(['label', 'group'], axis=1).values
y = df['label'].values
groups = df['group'].values

from sklearn.model_selection import StratifiedGroupKFold
from sklearn.calibration import CalibratedClassifierCV

sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
train_idx, test_idx = next(sgkf.split(X, y, groups=groups))

X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]
print(f"\nTrain: {X_train.shape[0]} | Test: {X_test.shape[0]}")

# ── Train ──────────────────────────────────────────────────────────────────
print("\nTraining Random Forest...")
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    n_jobs=-1,
    verbose=1
)
model = CalibratedClassifierCV(estimator=rf, method='sigmoid', cv=5)
model.fit(X_train, y_train)

# ── Evaluate ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)
acc    = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {acc*100:.2f}%")
print("\nPer-class results:")
print(classification_report(y_test, y_pred))

# ── Save ───────────────────────────────────────────────────────────────────
models_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "models"))
os.makedirs(models_dir, exist_ok=True)
model_save_path = os.path.join(models_dir, "navarasa_model.pkl")

with open(model_save_path, "wb") as f:
    pickle.dump(model, f)

print(f"[OK] Saved: {model_save_path}")
print("Training complete!")