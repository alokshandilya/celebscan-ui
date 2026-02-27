import json
import os
from urllib.parse import urlparse

# Paths
DATA_FILE = 'public/data.json'
IMAGES_DIR = 'public/images'

def get_shortcode_from_url(url):
    try:
        path = urlparse(url).path
        parts = path.strip('/').split('/')
        if 'p' in parts:
            return parts[parts.index('p') + 1]
        return parts[-1] 
    except Exception:
        return None

def map_existing_images():
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return

    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    updated_count = 0
    total_records = len(data)
    
    print(f"Scanning {total_records} records for existing images...")

    for item in data:
        post_url = item.get('post_url')
        if not post_url:
            continue

        shortcode = get_shortcode_from_url(post_url)
        if not shortcode:
            continue

        image_filename = f"{shortcode}.jpg"
        image_path = os.path.join(IMAGES_DIR, image_filename)
        
        # Check if file exists locally
        if os.path.exists(image_path):
            # Only update if it's missing or different (though usually we just overwrite to be safe)
            current_path = item.get('local_path')
            new_path = f"/images/{image_filename}"
            
            if current_path != new_path:
                item['local_path'] = new_path
                updated_count += 1

    # Write back the updated json
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Done! Updated {updated_count} records with local image paths.")

if __name__ == "__main__":
    map_existing_images()