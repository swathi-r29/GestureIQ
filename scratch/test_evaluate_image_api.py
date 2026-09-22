import requests

url = "http://localhost:5001/api/sequence/evaluate_image"

landmarks = []
for i in range(33):
    if i == 0:
        landmarks.append({'x': 0.5, 'y': 0.15, 'z': 0.0, 'visibility': 0.99})
    elif i in [11, 12]:
        landmarks.append({'x': 0.4 if i==11 else 0.6, 'y': 0.3, 'z': 0.0, 'visibility': 0.8})
    elif i in [23, 24]:
        landmarks.append({'x': 0.45 if i==23 else 0.55, 'y': 0.55, 'z': 0.0, 'visibility': 0.02})
    elif i in [25, 26]:
        landmarks.append({'x': 0.35 if i==25 else 0.65, 'y': 0.75, 'z': 0.0, 'visibility': 0.0})
    elif i in [27, 28]:
        landmarks.append({'x': 0.4 if i==27 else 0.6, 'y': 0.92, 'z': 0.0, 'visibility': 0.0})
    else:
        landmarks.append({'x': 0.5, 'y': 0.5, 'z': 0.0, 'visibility': 0.5})

payload = {
    "dance_name": "Veeshi_Adavu_Suite",
    "landmarks": landmarks
}

r = requests.post(url, json=payload)
print("Status code:", r.status_code)
print("Response JSON:", r.json())
