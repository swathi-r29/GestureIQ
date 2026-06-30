import cv2
import os

#videos_folder = "D:/GestureIQ/dataset/bharatanatyam_mudras/raw_videos"
#output_folder = "D:/GestureIQ/dataset/bharatanatyam_mudras/raw_frames"

#os.makedirs(output_folder, exist_ok=True)

videos_folder = "../dataset/bharatanatyam_mudras/raw_videos"
output_folder = "../dataset/bharatanatyam_mudras/raw_frames"

os.makedirs(output_folder, exist_ok=True)


# Loop through all videos
for video_file in os.listdir(videos_folder):
    if video_file.endswith(".mp4"):
        video_path = os.path.join(videos_folder, video_file)
        video_name = video_file.replace(".mp4", "")
        
        # Create folder for each video
        video_output = os.path.join(output_folder, video_name)
        os.makedirs(video_output, exist_ok=True)
        
        # Extract frames
        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        saved_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Save every 5th frame only
            if frame_count % 5 == 0:
                frame_name = f"frame_{saved_count:04d}.jpg"
                cv2.imwrite(os.path.join(video_output, frame_name), frame)
                saved_count += 1
            
            frame_count += 1
        
        cap.release()
        print(f"✅ {video_name} → {saved_count} frames extracted")

print("🎉 All videos processed!")
