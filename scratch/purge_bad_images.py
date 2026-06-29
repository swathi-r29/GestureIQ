import os

BAD_IMAGES_LIST = r"d:\GestureIQ\bad_images.txt"

deleted_count = 0
not_found_count = 0

if not os.path.exists(BAD_IMAGES_LIST):
    print(f"Error: bad_images.txt not found at {BAD_IMAGES_LIST}")
    exit(1)

with open(BAD_IMAGES_LIST, "r") as f:
    paths = [line.strip() for line in f if line.strip()]

print(f"Loaded {len(paths)} target images for deletion.")

for path in paths:
    # Standardize path separators for safety
    clean_path = path.replace("\\", "/").replace("D:/GestureIQ/", "d:/GestureIQ/")
    
    if os.path.exists(clean_path):
        try:
            os.remove(clean_path)
            deleted_count += 1
        except Exception as e:
            print(f"Failed to delete {clean_path}: {e}")
    else:
        not_found_count += 1

print(f"Purging complete.")
print(f"Successfully deleted: {deleted_count} files.")
print(f"Files not found/already deleted: {not_found_count} files.")
