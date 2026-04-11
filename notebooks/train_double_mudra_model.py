# notebooks/train_double_mudra_model.py
# Trains a Random Forest on the 166-dim double-hand feature vectors.
#
# Usage:
#   cd D:/GestureIQ/notebooks
#   python train_double_mudra_model.py
#
# Output:
#   models/double_mudra_model.pkl

import os, sys, pickle
import numpy as np
import pandas as pd
from collections import Counter
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.double_feature_engineering import extract_double_features

CSV_PATH   = "D:/GestureIQ/dataset/double_handed_mudras/landmarks_double.csv"
MODEL_PATH = "D:/GestureIQ/models/double_mudra_model.pkl"
MIN_SAMPLES = 80    # drop classes below this (too few to learn)
MAX_SAMPLES = 600   # cap per class to reduce imbalance

def load_and_process(csv_path):
    print(f"Loading dataset from {csv_path} ...")
    df = pd.read_csv(csv_path)
    print(f"Raw rows: {len(df)}")
    print(f"Classes: {sorted(df['mudra_name'].unique())}")

    counts = df['mudra_name'].value_counts()
    print("\nRaw samples per class:")
    print(counts.to_string())

    # Drop undersized classes
    valid = counts[counts >= MIN_SAMPLES].index
    dropped = counts[counts < MIN_SAMPLES].index.tolist()
    if dropped:
        print(f"\nDropping classes with <{MIN_SAMPLES} samples: {dropped}")
    df = df[df['mudra_name'].isin(valid)].copy()

    # Balance: sample up to MAX_SAMPLES per class
    sampled_dfs = []
    for _, group in df.groupby('mudra_name'):
        sampled_dfs.append(group.sample(n=min(len(group), MAX_SAMPLES), random_state=42))
    df = pd.concat(sampled_dfs).sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"\nBalanced dataset: {len(df)} rows across {df['mudra_name'].nunique()} classes")

    def row_to_features(row):
        # Right hand columns
        r_vals = [row[f'R_x{i}'] for i in range(21)] + \
                 [row[f'R_y{i}'] for i in range(21)] + \
                 [row[f'R_z{i}'] for i in range(21)]
        # Left hand columns
        l_vals = [row[f'L_x{i}'] for i in range(21)] + \
                 [row[f'L_y{i}'] for i in range(21)] + \
                 [row[f'L_z{i}'] for i in range(21)]

        r_label = str(row.get('R_label', 'Right'))
        l_label = str(row.get('L_label', 'Left'))

        def build_pts(x_list, y_list, z_list):
            return [[x_list[i], y_list[i], z_list[i]] for i in range(21)]

        # Check if hand is present (non-zero)
        def is_present(vals):
            return any(abs(v) > 1e-6 for v in vals)

        r_pts = build_pts(r_vals[:21], r_vals[21:42], r_vals[42:]) if is_present(r_vals) else None
        l_pts = build_pts(l_vals[:21], l_vals[21:42], l_vals[42:]) if is_present(l_vals) else None

        return extract_double_features(l_pts, r_pts, l_label, r_label)

    print("\nExtracting 166-dim feature vectors ...")
    X = []
    y = []
    errors = 0
    for _, row in df.iterrows():
        try:
            feats = row_to_features(row)
            X.append(feats)
            y.append(row['mudra_name'])
        except Exception as e:
            errors += 1
    if errors:
        print(f"  Skipped {errors} rows due to errors")

    return np.array(X), np.array(y)


def train(X, y):
    print(f"\nFeature matrix: {X.shape}")
    print(f"Label count: {Counter(y)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\nTraining RandomForest on {len(X_train)} samples ...")
    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=25,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight='balanced',
        n_jobs=-1,
        random_state=42
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\nTest accuracy: {acc*100:.2f}%")
    print("\nClassification report:")
    print(classification_report(y_test, y_pred))

    # 5-fold cross-validation for reliability estimate
    print("Running 5-fold cross-validation ...")
    cv_scores = cross_val_score(clf, X, y, cv=5, scoring='accuracy', n_jobs=-1)
    print(f"CV scores: {[f'{s:.3f}' for s in cv_scores]}")
    print(f"CV mean:   {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    return clf


def main():
    if not os.path.exists(CSV_PATH):
        print(f"[ERROR] CSV not found: {CSV_PATH}")
        print("Run extract_double_landmarks.py first.")
        sys.exit(1)

    X, y = load_and_process(CSV_PATH)
    clf  = train(X, y)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(clf, f)

    print(f"\nModel saved to: {MODEL_PATH}")
    print(f"Classes in model: {list(clf.classes_)}")
    print("Done.")

if __name__ == "__main__":
    main()