import pandas as pd
import numpy as np
import pickle
import sys
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Add root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

def p(r):
    pts = []
    v = r.values[:63] # first 63 are x,y,z landmarks
    for i in range(0, len(v), 3):
        pts.append([v[i], v[i+1], v[i+2]])
    label = r.values[63] # hand_label is at the end
    return extract_features(pts, label=label)

print("Loading dataset and model...")
df = pd.read_csv("../dataset/bharatanatyam_mudras/landmarks_fixed.csv")
with open("../models/mudra_model.pkl", "rb") as f:
    m = pickle.load(f)
    
print("Preparing data...")
X_raw = df.drop('mudra_name', axis=1)
y = df['mudra_name'].values

# Split exactly like the training script
X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X_raw, y, test_size=0.2, random_state=42, stratify=y
)

print("Extracting features (this may take a moment)...")
X_train = np.array([p(r) for _, r in X_train_raw.iterrows()])
X_test = np.array([p(r) for _, r in X_test_raw.iterrows()])

print("Evaluating...")
train_preds = m.predict(X_train)
test_preds = m.predict(X_test)

train_acc = accuracy_score(y_train, train_preds)
test_acc = accuracy_score(y_test, test_preds)

print(f"\n[SUMMARY]")
print(f"Training Accuracy: {train_acc*100:.2f}%")
print(f"Testing Accuracy:  {test_acc*100:.2f}%")

print("\n[CONFUSION HIGHLIGHTS]")
cm = confusion_matrix(y_test, test_preds)
labels = sorted(list(set(y_test)))
cm_df = pd.DataFrame(cm, index=labels, columns=labels)

# Find top errors
errors = []
for i in range(len(labels)):
    for j in range(len(labels)):
        if i != j and cm[i][j] > 5: # Show if more than 5 misclassifications
            errors.append((labels[i], labels[j], cm[i][j]))

errors.sort(key=lambda x: x[2], reverse=True)
for item in errors[:10]:
    print(f"  - {item[0]} misclassified as {item[1]}: {item[2]} times")

print("\nFull Classification Report (Test):")
print(classification_report(y_test, test_preds))
