import json
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='dist')
CORS(app)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
PINNED_FILE = os.path.join(PUBLIC_DIR, 'pinned.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')

# Ensure public dir exists
if not os.path.exists(PUBLIC_DIR):
    os.makedirs(PUBLIC_DIR)

if not os.path.exists(DIST_DIR):
    print(f"Warning: {DIST_DIR} not found. Please run 'npm run build' to generate the frontend.")

def load_pinned():
    if not os.path.exists(PINNED_FILE):
        return []
    try:
        with open(PINNED_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_pinned(pinned_list):
    with open(PINNED_FILE, 'w') as f:
        json.dump(pinned_list, f)

@app.route('/api/pinned', methods=['GET'])
def get_pinned():
    return jsonify(load_pinned())

@app.route('/api/pin', methods=['POST'])
def toggle_pin():
    data = request.json
    post_id = data.get('post_id')
    if not post_id:
        return jsonify({"error": "No post_id provided"}), 400
    
    pinned = load_pinned()
    # pinned is a list
    if post_id in pinned:
        pinned.remove(post_id)
        action = "unpinned"
    else:
        pinned.append(post_id)
        action = "pinned"
    
    save_pinned(pinned)
    return jsonify({"status": "success", "action": action, "pinned": pinned})

# Serve static data files from public to ensure they are fresh (vs dist which is built once)
@app.route('/data.json')
def serve_data():
    return send_from_directory(PUBLIC_DIR, 'data.json')

@app.route('/all_results.json')
def serve_reels_data():
    return send_from_directory(PUBLIC_DIR, 'all_results.json')

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(PUBLIC_DIR, 'images'), filename)

@app.route('/reels/<path:filename>')
def serve_reels(filename):
    return send_from_directory(os.path.join(PUBLIC_DIR, 'reels'), filename)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    print("Starting Flask server at http://0.0.0.0:8003")
    app.run(host='0.0.0.0', port=8003, debug=True)