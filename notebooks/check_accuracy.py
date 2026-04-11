import pandas as pd
import numpy as np
import pickle
import sys
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# Add root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.feature_engineering import extract_features

def p(r):
    pts = []
    v = r.values
    for i in range(0, len(v), 3):
        pts.append([v[i], v[i+1], v[i+2]])
    return extract_features(pts)

print("Loading dataset and model...")
#df = pd.read_csv(r'D:\GestureIQ\dataset\bharatanatyam_mudras\landmarks.csv')
#with open(r'D:\GestureIQ\models\mudra_model.pkl', 'rb') as f:
    #m = pickle.load(f)

df = pd.read_csv("../dataset/bharatanatyam_mudras/landmarks.csv")
with open("../models/mudra_model.pkl", "rb") as f:
    m = pickle.load(f)
    
print("Extracting features (80/20 split test set)...")
X_raw = df.drop('mudra_name', axis=1)
y = df['mudra_name'].values
_, XT_raw, _, yT = train_test_split(X_raw, y, test_size=0.2, random_state=42)

XT = np.array([p(r) for _, r in XT_raw.iterrows()])

print("Evaluating model...")
y_pred = m.predict(XT)
acc = accuracy_score(yT, y_pred)
print(f"\nAccuracy: {acc*100:.2f}%")
print("\nClassification Report:")
print(classification_report(yT, y_pred))
