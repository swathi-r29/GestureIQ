import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import pickle

# ── Load CSV ───────────────────────────────────────────────────────────────
#CSV  = "D:/GestureIQ/dataset/navarasa/navarasa_landmarks.csv"
#df   = pd.read_csv(CSV)
#print("Shape:", df.shape)
#print("\nSamples per rasa:")
#print(df['label'].value_counts())

CSV  = "D:/GestureIQ/dataset/navarasa/navarasa_landmarks.csv"
df   = pd.read_csv(CSV)
print("Shape:", df.shape)
print("\nSamples per rasa:")
print(df['label'].value_counts())

# ── Prepare ────────────────────────────────────────────────────────────────
X = df.drop('label', axis=1).values
y = df['label'].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"\nTrain: {X_train.shape[0]} | Test: {X_test.shape[0]}")

# ── Train ──────────────────────────────────────────────────────────────────
print("\nTraining Random Forest...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    n_jobs=-1,
    verbose=1
)
model.fit(X_train, y_train)

# ── Evaluate ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)
acc    = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {acc*100:.2f}%")
print("\nPer-class results:")
print(classification_report(y_test, y_pred))

# ── Save ───────────────────────────────────────────────────────────────────
import os
os.makedirs("D:/GestureIQ/models", exist_ok=True)

with open("D:/GestureIQ/models/navarasa_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("✅ Saved: D:/GestureIQ/models/navarasa_model.pkl")
#import os
#os.makedirs("../models", exist_ok=True)

#with open("../models/navarasa_model.pkl", "wb") as f:
 #   pickle.dump(model, f)

#print("✅ Saved: ../models/navarasa_model.pkl")

#print("Training complete!")