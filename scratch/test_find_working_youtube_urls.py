import subprocess
import json

candidate_urls = [
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Rick_Astley_Test"),
    ("https://www.youtube.com/watch?v=BaW_jenozKc", "Bharatanatyam_Dance_1"),
    ("https://www.youtube.com/watch?v=L1v_e4-q9uQ", "Bharatanatyam_Dance_2"),
    ("https://www.youtube.com/watch?v=2v94-279uQ0", "Bharatanatyam_Dance_3"),
    ("https://www.youtube.com/watch?v=07279uQ09uQ", "Bharatanatyam_Dance_4"),
    ("https://www.youtube.com/watch?v=w7oK2qP44S0", "Shinjan_Dance_Basic"),
]

print("Testing yt-dlp on candidate URLs...")
for url, name in candidate_urls:
    try:
        res = subprocess.run(["yt-dlp", "-g", url], capture_output=True, text=True, timeout=15)
        if res.returncode == 0 and "googlevideo.com" in res.stdout:
            print(f"[WORKING] URL: {url} ({name})")
        else:
            print(f"[FAILED] URL: {url} ({name})")
    except Exception as e:
        print(f"[EXCEPTION] on {url}: {e}")
