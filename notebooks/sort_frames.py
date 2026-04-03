import os
import shutil
import pytesseract
from PIL import Image

# Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Paths
raw_frames_folder = "D:/GestureIQ/dataset/bharatanatyam_mudras/raw_frames"
sorted_folder = "D:/GestureIQ/dataset/bharatanatyam_mudras/sorted_mudras"

# All 28 Asamyuta mudra names
mudra_names = [
    "pataka", "tripataka", "ardhapataka", "kartarimukha",
    "mayura", "ardhachandra", "arala", "shukatunda",
    "mushti", "shikhara", "kapittha", "katakamukha",
    "suchi", "chandrakala", "padmakosha", "sarpashira",
    "mrigashira", "simhamukha", "kangula", "alapadma",
    "chatura", "bhramara", "hamsasya", "hamsapaksha",
    "sandamsha", "mukula", "tamrachuda", "trishula"
]

# Create sorted folders
for mudra in mudra_names:
    os.makedirs(os.path.join(sorted_folder, mudra), exist_ok=True)
os.makedirs(os.path.join(sorted_folder, "unknown"), exist_ok=True)

total = 0
sorted_count = 0
unknown_count = 0

for video_folder in os.listdir(raw_frames_folder):
    video_path = os.path.join(raw_frames_folder, video_folder)
    if not os.path.isdir(video_path):
        continue

    frames = [f for f in os.listdir(video_path) if f.endswith(".jpg")]
    
    # Process every 10th frame only — much faster!
    frames = frames[::10]
    
    print(f"Processing {video_folder} — {len(frames)} frames...")

    for frame_file in frames:
        frame_path = os.path.join(video_path, frame_file)
        total += 1

        try:
            # Resize image for faster OCR
            img = Image.open(frame_path)
            img = img.resize((640, 360))
            
            # Only read top portion where text usually appears
            width, height = img.size
            img_crop = img.crop((0, 0, width, height//3))
            
            text = pytesseract.image_to_string(img_crop).lower().strip()

            matched = False
            for mudra in mudra_names:
                if mudra in text:
                    dest = os.path.join(sorted_folder, mudra,
                           f"{video_folder}_{frame_file}")
                    shutil.copy(frame_path, dest)
                    sorted_count += 1
                    matched = True
                    print(f"  ✅ {mudra} → {frame_file}")
                    break

            if not matched:
                dest = os.path.join(sorted_folder, "unknown",
                       f"{video_folder}_{frame_file}")
                shutil.copy(frame_path, dest)
                unknown_count += 1

        except Exception as e:
            unknown_count += 1

print(f"\nTotal processed: {total}")
print(f"Successfully sorted: {sorted_count}")
print(f"Unknown: {unknown_count}")
print("🎉 Done!")

