# SONIQ v2 — AI Music PWA 🎵

A production-grade, AI-powered music player PWA built with Flask, YouTube Data API, and Google Gemini. Fully installable on mobile and desktop.

## What's New in v2

| Feature | Detail |
|---|---|
| 🔧 **Fixed player** | Rock-solid play/pause using `getPlayerState()` — no more temperamental button |
| ⏭ **Smart skip on error** | Auto-skips unavailable/restricted videos instead of getting stuck |
| ⏮ **Smart prev** | Restarts track if >3 seconds in, else goes to previous |
| 🎵 **Better search** | Appends "official audio" + filters by `videoDuration=medium` to avoid Shorts and random clips |
| 🌍 **Region selector** | Switch trending charts: 🇬🇧 UK, 🇺🇸 US, 🇳🇬 NG, 🇯🇵 JP, 🇰🇷 KR, and more |
| ♩ **Lyrics** | AI-generated lyrics with styled sections, rendered beautifully in-app |
| 📥 **Lyrics export** | Download as `.txt` or `.md`, or copy to clipboard |
| ♪ **Chord sheet** | Guitar/piano chords per song section with key, capo, tempo, difficulty, tips |
| 🎸 **BPM & genre** | Vibe Check now returns genre and estimated BPM range |
| 🎨 **Premium UI** | New design system: Syne + Space Mono, SVG player icons, noise grain overlay |
| 📱 **Keyboard shortcut M** | Mute/unmute toggle |

---

## Features

- 🎵 **YouTube Music Search** — official audio focused, filters out shorts
- 📈 **Regional Trending** — live charts for UK, US, NG, JP, KR, IN, DE, FR, BR
- ✦ **Mood Mix** — describe your mood, Gemini returns 6 perfect song searches
- ◈ **AI Playlist** — describe a theme, get an 8-track curated playlist
- ◉ **Vibe Check** — energy score, mood tags, genre, BPM estimate
- ♩ **Lyrics** — AI lyrics with section labels, export to .txt/.md, copy
- ♪ **Chord Sheet** — full chord analysis by song section, fingering tips
- ⬡ **Queue** — manage playback queue, drag-free
- 📱 **PWA** — installable on mobile/desktop, offline shell

---

## Project Structure

```
soniq_v2/
├── app.py               # Flask backend — all API routes including lyrics & chords
├── wsgi.py              # PythonAnywhere WSGI entry point
├── requirements.txt     # Python dependencies
├── generate_icons.py    # Run once to create PWA icons
├── templates/
│   └── index.html       # Full frontend (HTML/CSS/JS — single file)
└── static/
    ├── manifest.json
    ├── sw.js
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

---

## API Keys

### YouTube Data API v3
1. [Google Cloud Console](https://console.cloud.google.com/) → Enable **YouTube Data API v3**
2. Credentials → Create API Key

### Google Gemini API
1. [Google AI Studio](https://aistudio.google.com/) → Get API key

---

## Deploy to PythonAnywhere

### 1. Upload files
Upload the `soniq_v2/` folder to your PythonAnywhere home directory.

### 2. Install dependencies
```bash
cd ~/soniq_v2
pip install --user -r requirements.txt
```

### 3. Generate icons
```bash
python3 generate_icons.py
```

### 4. Configure WSGI
In the **Web** tab, open the WSGI file and replace with:
```python
import sys, os

project_home = '/home/yourusername/soniq_v2'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ['YOUTUBE_API_KEY'] = 'YOUR_KEY'
os.environ['GEMINI_API_KEY']  = 'YOUR_KEY'

from app import app as application
```

### 5. Static files
In Web tab → Static files:
- URL: `/static/`
- Directory: `/home/yourusername/soniq_v2/static/`

### 6. Reload & visit 🎉
`https://yourusername.pythonanywhere.com`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=query` | Search YouTube (official audio focused) |
| GET | `/api/trending?region=GB` | Trending music by region |
| GET | `/api/video/<id>` | Video details |
| POST | `/api/gemini/recommend` | Mood-based recommendations |
| POST | `/api/gemini/vibe` | Vibe/energy/genre analysis |
| POST | `/api/gemini/playlist` | Themed 8-track playlist |
| POST | `/api/gemini/lyrics` | AI lyrics generation |
| POST | `/api/gemini/chords` | Guitar/piano chord sheet |
| POST | `/api/export/lyrics` | Download lyrics as .txt or .md |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` | Next track |
| `←` | Previous track (or restart if >3s) |
| `M` | Mute / Unmute |

---

## Notes

- The YouTube IFrame player is hidden — only audio plays
- Gemini model: `gemini-2.0-flash`
- YouTube API free quota: ~100 searches/day (10,000 units, search = 100 units)
- Lyrics are AI-reconstructed — for reference/learning only
