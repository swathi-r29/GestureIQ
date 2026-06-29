import time
import pickle
import os
import numpy as np

print("Loading mudra_model.pkl (400MB)...")
start = time.time()
with open("D:/GestureIQ/models/mudra_model.pkl", "rb") as f:
    model = pickle.load(f)
print(f"Loaded in {time.time() - start:.2f} seconds")

# Create a random feature vector of size 82
feats = np.random.rand(82).tolist()

print("Running 100 predictions to benchmark...")
times = []
for _ in range(100):
    t0 = time.time()
    probs = model.predict_proba([feats])[0]
    times.append(time.time() - t0)

print(f"Average prediction time: {np.mean(times)*1000:.2f} ms")
print(f"Max prediction time: {np.max(times)*1000:.2f} ms")
print(f"Min prediction time: {np.min(times)*1000:.2f} ms")
