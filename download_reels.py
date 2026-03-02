import json
import os
import instaloader
import time
from urllib.parse import urlparse

# Initialize Instaloader
L = instaloader.Instaloader()

# Optional: Login to avoid rate limits
# usage: IG_USER=your_username IG_PASSWORD=your_password python download_reels.py
if 'IG_USER' in os.environ and 'IG_PASSWORD' in os.environ:
    try:
        print(f"Logging in as {os.environ['IG_USER']}...")
        L.login(os.environ['IG_USER'], os.environ['IG_PASSWORD'])
        print("Login successful!")
    except Exception as e:
        print(f"Login failed: {e}")
        print("Continuing without login (rate limits may apply, and some reels might not be downloadable)...")

# Paths
DATA_FILE = 'public/all_results.json'
REELS_DIR = 'public/reels'

# Ensure reels directory exists
if not os.path.exists(REELS_DIR):
    os.makedirs(REELS_DIR)

def get_shortcode_from_url(url):
    path = urlparse(url).path
    parts = path.strip('/').split('/')
    # Reel URLs often look like /reel/ShortCode/ or /p/ShortCode/
    if 'reel' in parts:
        return parts[parts.index('reel') + 1]
    if 'p' in parts:
        return parts[parts.index('p') + 1]
    return parts[-1] 

def download_reels():
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return

    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    updated_data = []

    for i, item in enumerate(data):
        post_url = item.get('post_url')
        if not post_url:
            updated_data.append(item)
            continue

        shortcode = get_shortcode_from_url(post_url)
        # We will save as mp4
        video_filename = f"{shortcode}.mp4"
        video_path = os.path.join(REELS_DIR, video_filename)
        
        # Check if file exists locally BEFORE calling Instagram API
        if os.path.exists(video_path):
            print(f"Reel for {shortcode} already exists. Skipping download.")
            item['local_path'] = f"/reels/{video_filename}"
            updated_data.append(item)
            continue

        print(f"Processing shortcode: {shortcode}")

        try:
            # Polite delay
            print("Waiting 5 seconds...")
            time.sleep(5)

            post = instaloader.Post.from_shortcode(L.context, shortcode)
            
            if not post.is_video:
                print(f"Skipping {shortcode}: Not a video.")
            else:
                print(f"Downloading reel for {shortcode}...")
                
                # L.download_post downloads multiple files (json, txt, jpg, mp4) into a folder.
                # We want specifically the video file.
                # L.download_pic is for images. 
                # For videos, we can access post.video_url
                
                # We will manually download the video content to our specific path
                import requests
                response = requests.get(post.video_url, stream=True)
                if response.status_code == 200:
                    with open(video_path, 'wb') as v_file:
                        for chunk in response.iter_content(chunk_size=1024):
                            if chunk:
                                v_file.write(chunk)
                    
                    # Update the item with the local path
                    item['local_path'] = f"/reels/{video_filename}"
                    print(f"Successfully downloaded {video_filename}")
                else:
                    print(f"Failed to fetch video URL for {shortcode}: Status {response.status_code}")

        except Exception as e:
            print(f"Failed to download {shortcode}: {e}")
        
        updated_data.append(item)

        # Save periodically (every 5 items)
        if (i + 1) % 5 == 0:
            print(f"Saving progress... ({i + 1}/{len(data)})")
            # Combine processed items with remaining unprocessed items
            temp_full_data = updated_data + data[i+1:]
            with open(DATA_FILE, 'w') as f:
                json.dump(temp_full_data, f, indent=2)

    # Write back the final updated json
    with open(DATA_FILE, 'w') as f:
        json.dump(updated_data, f, indent=2)

    print("Done updating all_results.json with local reel paths.")

if __name__ == "__main__":
    download_reels()