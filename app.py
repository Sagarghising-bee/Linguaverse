"""
app.py — LinguaVerse
Flask app for PythonAnywhere
"""

import json
import urllib.request
import urllib.error
from flask import Flask, send_from_directory, request, jsonify

app = Flask(__name__)

# PUT YOUR GEMINI API KEY HERE ──
# This file lives only on PythonAnywhere — never commit to GitHub
GEMINI_API_KEY = 'YOUR_API_HERE'


# ── SERVE ALL STATIC FILES ─

@app.route('/')
@app.route('/index.html')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/pages/setup.html')
def setup():
    return send_from_directory('pages', 'setup.html')

@app.route('/pages/chat.html')
def chat():
    return send_from_directory('pages', 'chat.html')

@app.route('/css/<filename>')
def css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<filename>')
def js(filename):
    return send_from_directory('js', filename)

@app.route('/sw.js')
def sw():
    return send_from_directory('.', 'sw.js')

@app.route('/manifest.json')
def manifest():
    return send_from_directory('.', 'manifest.json')

@app.route('/icon-192.png')
def icon192():
    return send_from_directory('.', 'icon-192.png')

@app.route('/icon-512.png')
def icon512():
    return send_from_directory('.', 'icon-512.png')


# ── GEMINI PROXY ─

@app.route('/api/gemini', methods=['POST'])
def gemini_proxy():
    if not GEMINI_API_KEY or GEMINI_API_KEY == 'YOUR_GEMINI_API_KEY_HERE':
        return jsonify({'error': 'API key not set in app.py'}), 500
    try:
        body    = request.get_json()
        model   = body.get('model', 'gemini-2.5-flash-lite')
        payload = body.get('payload', {})
        url     = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + GEMINI_API_KEY
        data    = json.dumps(payload).encode('utf-8')
        req     = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req) as resp:
            return jsonify(json.loads(resp.read().decode('utf-8')))
    except urllib.error.HTTPError as e:
        return jsonify(json.loads(e.read().decode('utf-8'))), e.code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=False)
  
