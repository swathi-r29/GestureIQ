"""
train_mudra_model_fixed.py
──────────────────────────
Fixes two root causes of bad detection:
1. No handedness during landmark extraction — now tries BOTH hands, picks best
2. Imbalanced classes — caps majority classes + removes tiny classes (<100 samples)

Run from notebooks/ folder:
    python train_mudra_model_fixed.py
"""

import os, sys, csv, cv2, pickle
import numpy as np
import pandas as pd
import mediapipe as mp
from multiprocessing import Pool, cpu_count
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import accuracy_score, classification_report
from sklearn.utils import resample

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

# ── Paths ─────────────────────────────────────────────────────────────────
DATA_FOLDER = "../dataset/bharatanatyam_mudras/sorted_mudras"
OUTPUT_CSV  = "../dataset/bharatanatyam_mudras/landmarks_fixed.csv"
MODEL_PATH  = "../models/mudra_model.pkl"

# ── Balance settings ──────────────────────────────────────────────────────
MIN_SAMPLES = 50 # drop mudras with fewer samples (vyaghra=30, palli=25 → removed)
MAX_SAMPLES = 700   # cap overrepresented mudras (katakamukha 1572 → 700)

# ─────────────────────────────────────────────────────────────────────────
# STEP 1: Re-extract landmarks with BOTH-HAND normalization
# ─────────────────────────────────────────────────────────────────────────

def get_augmented_versions(img):
    """Return 4 image variants to increase detection robustness."""
    versions = [img]
    # Brighter
    versions.append(cv2.convertScaleAbs(img, alpha=1.4, beta=25))
    # Darker
    versions.append(cv2.convertScaleAbs(img, alpha=0.7, beta=-10))
    # Gamma
    table = np.array([((i / 255.0) ** 1.3) * 255 for i in range(256)]).astype("uint8")
    versions.append(cv2.LUT(img, table))
    return versions


def process_image_both_hands(args):
    """
    For each image, try detecting a hand.
    Save TWO rows per image: one treated as Right hand, one as Left hand.
    This ensures the model sees both mirror variants during training,
    matching how /api/predict works at inference time.
    """
    img_path, mudra_name = args
    img = cv2.imread(img_path)
    if img is None:
        return []

    mp_hands = mp.solutions.hands
    rows = []

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.1,
    ) as hands:
        for version in get_augmented_versions(img):
            img_rgb = cv2.cvtColor(version, cv2.COLOR_BGR2RGB)
            result  = hands.process(img_rgb)
            if not result.multi_hand_landmarks:
                continue

            lms = result.multi_hand_landmarks[0].landmark
            # Raw points
            pts = [[lm.x, lm.y, lm.z] for lm in lms]

            # Save as Right
            row_r = [mudra_name] + [v for p in pts for v in p] + ['Right']
            rows.append(row_r)

            # Save as Left (mirror X so training sees both orientations)
            pts_l = [[1.0 - p[0], p[1], p[2]] for p in pts]
            row_l = [mudra_name] + [v for p in pts_l for v in p] + ['Left']
            rows.append(row_l)

            break  # one good detection per image is enough

    return rows


def extract_all_landmarks():
    tasks = []
    for mudra_name in sorted(os.listdir(DATA_FOLDER)):
        mudra_path = os.path.join(DATA_FOLDER, mudra_name)
        if not os.path.isdir(mudra_path):
            continue
        if mudra_name in ('unknown',):
            continue
        for f in os.listdir(mudra_path):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                tasks.append((os.path.join(mudra_path, f), mudra_name))

    print(f"[extract] {len(tasks)} images → multiprocessing with {cpu_count()} cores")
    all_rows = []
    with Pool(processes=cpu_count()) as pool:
        for i, rows in enumerate(pool.imap_unordered(process_image_both_hands, tasks)):
            all_rows.extend(rows)
            if i % 200 == 0:
                print(f"  {i}/{len(tasks)} images … {len(all_rows)} rows so far")

    header = ['mudra_name'] + [f'{c}{i}' for i in range(21) for c in ('x','y','z')] + ['hand_label']
    print(f"[extract] Saving {len(all_rows)} rows → {OUTPUT_CSV}")
    with open(OUTPUT_CSV, 'w', newline='') as f:
        csv.writer(f).writerow(header)
        csv.writer(f).writerows(all_rows)
    print("[extract] Done.")


# ─────────────────────────────────────────────────────────────────────────
# STEP 2: Build feature matrix with proper handedness
# ─────────────────────────────────────────────────────────────────────────

def build_features(csv_path):
    df = pd.read_csv(csv_path)
    print("\n[features] Raw counts per mudra:")
    print(df['mudra_name'].value_counts().to_string())

    # Drop classes with too few samples
    counts  = df['mudra_name'].value_counts()
    keep    = counts[counts >= MIN_SAMPLES].index
    dropped = counts[counts < MIN_SAMPLES].index.tolist()
    if dropped:
        print(f"\n[features] Dropping mudras with <{MIN_SAMPLES} samples: {dropped}")
    df = df[df['mudra_name'].isin(keep)]

    # Balance: cap overrepresented classes
    balanced_parts = []
    for mudra, group in df.groupby('mudra_name'):
        if len(group) > MAX_SAMPLES:
            group = resample(group, n_samples=MAX_SAMPLES, random_state=42)
        balanced_parts.append(group)
    df = pd.concat(balanced_parts).sample(frac=1, random_state=42).reset_index(drop=True)

    print("\n[features] Balanced counts:")
    print(df['mudra_name'].value_counts().to_string())
    print(f"[features] Total rows: {len(df)}")

    X, y = [], []
    for _, row in df.iterrows():
        vals  = row.drop(['mudra_name', 'hand_label']).values
        label = row['hand_label']
        pts   = [[vals[i*3], vals[i*3+1], vals[i*3+2]] for i in range(21)]
        try:
            feats = extract_features(pts, label=label)
            X.append(feats)
            y.append(row['mudra_name'])
        except Exception as e:
            print(f"  [warn] feature error: {e}")

    return np.array(X), np.array(y)


# ─────────────────────────────────────────────────────────────────────────
# STEP 3: Train
# ─────────────────────────────────────────────────────────────────────────

def train(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n[train] Training on {len(X_train)} samples, testing on {len(X_test)} …")

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=25,
        min_samples_leaf=2,
        class_weight='balanced',   # handles any remaining imbalance
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    print(f"\n[train] Test accuracy: {acc * 100:.2f}%")
    print("\n[train] Classification report:")
    print(classification_report(y_test, y_pred))
    return model


# ─────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Step 1 — re-extract if CSV doesn't exist yet
    if not os.path.exists(OUTPUT_CSV):
        print("=" * 60)
        print("STEP 1: Extracting landmarks with both-hand normalization")
        print("=" * 60)
        extract_all_landmarks()
    else:
        print(f"[skip] {OUTPUT_CSV} already exists — skipping extraction.")
        print("       Delete it to force re-extraction.")

    # Step 2 — features
    print("\n" + "=" * 60)
    print("STEP 2: Building feature matrix")
    print("=" * 60)
    X, y = build_features(OUTPUT_CSV)
    print(f"[features] Feature matrix: {X.shape}")

    # Step 3 — train
    print("\n" + "=" * 60)
    print("STEP 3: Training model")
    print("=" * 60)
    model = train(X, y)

    # Save
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n✅ Model saved → {MODEL_PATH}")
    print("Restart Flask to load the new model.")