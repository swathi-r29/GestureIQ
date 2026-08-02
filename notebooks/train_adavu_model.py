import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

DATASET_FILE = os.path.join(os.path.dirname(__file__), 'pose_landmarks.csv')
MODEL_FILE = os.path.join(os.path.dirname(__file__), '..', 'models', 'adavu_model.pkl')

def train_adavu_classifier():
    print("=========================================================")
    print("      GestureIQ - Adavu Stance Model Trainer             ")
    print("=========================================================")

    if not os.path.exists(DATASET_FILE):
        print(f"Error: Dataset file '{DATASET_FILE}' not found.")
        print("Please run 'python collect_pose_data.py' first to record training samples.")
        return

    df = pd.read_csv(DATASET_FILE)
    if len(df) == 0:
        print("Dataset is empty. Exiting.")
        return

    X = df.drop(columns=['label']).values
    y = df['label'].values

    print(f"Total samples: {len(X)}")
    print(f"Stances found: {np.unique(y)}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    # Save trained model
    os.makedirs(os.path.dirname(MODEL_FILE), exist_ok=True)
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump(clf, f)

    print(f"Model saved successfully to '{MODEL_FILE}'")

if __name__ == '__main__':
    train_adavu_classifier()
