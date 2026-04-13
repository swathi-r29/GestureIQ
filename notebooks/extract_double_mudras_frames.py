import cv2
import os
import shutil

#VIDEO_ROOT  = "../dataset/double_handed_mudras/raw_videos"
#FRAME_ROOT  = "../dataset/double_handed_mudras/sorted_frames"

VIDEO_ROOT  = r"D:\GestureIQ\dataset\double_handed_mudras\raw_videos"
FRAME_ROOT  = r"D:\GestureIQ\dataset\double_handed_mudras\sorted_frames"
FRAME_EVERY = 3

os.makedirs(FRAME_ROOT, exist_ok=True)

def process_video(video_path):
    video_name   = os.path.basename(video_path)
    cap          = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)

    print(f"\n{'='*50}")
    print(f"Video : {video_name}")
    print(f"Frames: {total_frames}  |  FPS: {fps:.1f}")
    print(f"{'='*50}")
    print("CONTROLS:")
    print("  SPACE = Pause / Resume")
    print("  Q     = Stop current mudra, type next mudra name")
    print("  S     = Skip this section (don't save)")
    print("  ESC   = Finish this video")
    print(f"{'='*50}\n")

    # Ask first mudra name before starting
    current_mudra = input("Type first mudra name and press Enter to start: ").strip().lower()
    if not current_mudra:
        current_mudra = None

    frame_idx    = 0
    saved_counts = {}
    paused       = False
    saving       = current_mudra is not None

    while True:
        if not paused:
            ret, frame = cap.read()
            if not ret:
                break

        # Show frame
        display = frame.copy()
        h, w    = display.shape[:2]

        status = f"SAVING: {current_mudra}" if (saving and current_mudra) else "SKIPPING"
        color  = (0, 255, 0) if (saving and current_mudra) else (0, 0, 255)

        cv2.putText(display, status,
                    (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        cv2.putText(display, f"Saved: {saved_counts.get(current_mudra, 0)} frames",
                    (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
        cv2.putText(display, "SPACE=Pause  Q=Next Mudra  S=Skip  ESC=Done",
                    (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1)
        cv2.putText(display, f"Frame: {frame_idx}/{total_frames}",
                    (w - 220, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

        cv2.imshow("GestureIQ - Double Hand Data Collection", display)

        # Save frame
        if saving and current_mudra and not paused and frame_idx % FRAME_EVERY == 0:
            folder   = os.path.join(FRAME_ROOT, current_mudra)
            os.makedirs(folder, exist_ok=True)
            img_name = f"{current_mudra}_{video_name.split('.')[0]}_{frame_idx:05d}.jpg"
            cv2.imwrite(os.path.join(folder, img_name), frame)
            saved_counts[current_mudra] = saved_counts.get(current_mudra, 0) + 1

        key = cv2.waitKey(25) & 0xFF

        # SPACE — pause/resume
        if key == ord(' '):
            paused = not paused
            print("PAUSED" if paused else "RESUMED")

        # Q — next mudra
        elif key == ord('q') or key == ord('Q'):
            if current_mudra:
                print(f"\n✅ '{current_mudra}' done → {saved_counts.get(current_mudra, 0)} frames saved")
            cv2.destroyAllWindows()
            new_name = input("Type next mudra name (or press Enter to skip section): ").strip().lower()
            if new_name:
                current_mudra = new_name
                saving        = True
                print(f"▶  Now saving: '{current_mudra}'")
            else:
                current_mudra = None
                saving        = False
                print("⏭  Skipping section...")
            # Reopen window
            cv2.namedWindow("GestureIQ - Double Hand Data Collection")

        # S — skip section
        elif key == ord('s') or key == ord('S'):
            saving = False
            current_mudra = None
            print("⏭  Skipping...")

        # ESC — finish video
        elif key == 27:
            print(f"\n✅ Finished: {video_name}")
            break

        if not paused:
            frame_idx += 1

    cap.release()
    cv2.destroyAllWindows()

    print(f"\n📊 Summary for {video_name}:")
    for m, c in saved_counts.items():
        print(f"   {m}: {c} frames")

    return saved_counts


# ── MAIN ───────────────────────────────────────────────────────
if __name__ == "__main__":
    all_videos = [
        f for f in os.listdir(VIDEO_ROOT)
        if f.endswith(('.mp4', '.avi', '.mov', '.mkv'))
    ]

    if not all_videos:
        print(f"No videos found in {VIDEO_ROOT}")
        exit()

    print(f"Found {len(all_videos)} video(s): {all_videos}")

    grand_total = {}
    for vfile in sorted(all_videos):
        counts = process_video(os.path.join(VIDEO_ROOT, vfile))
        for m, c in counts.items():
            grand_total[m] = grand_total.get(m, 0) + c

    print(f"\n{'='*45}")
    print("GRAND TOTAL")
    print(f"{'='*45}")
    for mudra, count in sorted(grand_total.items()):
        print(f"  {mudra}: {count} frames")

    print(f"\nDone! Frames saved to: {FRAME_ROOT}")
    print("Next step -> run extract_double_landmarks.py")