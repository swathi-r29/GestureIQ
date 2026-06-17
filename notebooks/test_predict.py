import json, urllib.request, urllib.error
data = json.dumps({"landmarks": [{"x":0.5, "y":0.5, "z":0}] * 21, "handedness": "Right"}).encode()
req = urllib.request.Request("http://127.0.0.1:5001/api/predict", data=data, headers={"Content-Type": "application/json"})
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
