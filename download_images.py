import json
import os
import instaloader
import time
from urllib.parse import urlparse

# Initialize Instaloader
L = instaloader.Instaloader()

# Optional: Login to avoid rate limits
# usage: IG_USER=your_username IG_PASSWORD=your_password python download_images.py
if 'IG_USER' in os.environ and 'IG_PASSWORD' in os.environ:
    try:
        print(f"Logging in as {os.environ['IG_USER']}...")
        L.login(os.environ['IG_USER'], os.environ['IG_PASSWORD'])
        print("Login successful!")
    except Exception as e:
        print(f"Login failed: {e}")
        print("Continuing without login (rate limits may apply)...")

# Paths
DATA_FILE = 'public/data.json'
IMAGES_DIR = 'public/images'

# Ensure images directory exists
if not os.path.exists(IMAGES_DIR):
    os.makedirs(IMAGES_DIR)

def get_shortcode_from_url(url):
    path = urlparse(url).path
    parts = path.strip('/').split('/')
    if 'p' in parts:
        return parts[parts.index('p') + 1]
    return parts[-1] 

def download_images():
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    updated_data = []

    for item in data:
        post_url = item.get('post_url')
        if not post_url:
            updated_data.append(item)
            continue

        shortcode = get_shortcode_from_url(post_url)
        image_filename = f"{shortcode}.jpg"
        image_path = os.path.join(IMAGES_DIR, image_filename)
        
        # Check if file exists locally BEFORE calling Instagram API
        if os.path.exists(image_path):
            print(f"Image for {shortcode} already exists. Skipping download.")
            item['local_path'] = f"/images/{image_filename}"
            updated_data.append(item)
            continue

        print(f"Processing shortcode: {shortcode}")

        try:
            post = instaloader.Post.from_shortcode(L.context, shortcode)
            
            print(f"Downloading image for {shortcode}...")
            L.download_pic(filename=os.path.join(IMAGES_DIR, shortcode), url=post.url, mtime=post.date_utc)

            # Update the item with the local path
            item['local_path'] = f"/images/{image_filename}"
            
        except Exception as e:
            print(f"Failed to download {shortcode}: {e}")
        
        updated_data.append(item)

    # Write back the updated json
    with open(DATA_FILE, 'w') as f:
        json.dump(updated_data, f, indent=2)

    print("Done updating data.json with local image paths.")

if __name__ == "__main__":
    download_images()