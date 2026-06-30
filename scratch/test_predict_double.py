import requests
import json

url = "http://127.0.0.1:5001/api/predict_double"
# Send a mock request with 21 landmarks for left and right
lm_hand = [{"x": i * 0.01, "y": i * 0.02, "z": i * 0.03} for i in range(21)]

payload = {
    "left_landmarks": lm_hand,
    "right_landmarks": lm_hand
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response Body:")
    print(response.text)
except Exception as e:
    print("Error:", e)
