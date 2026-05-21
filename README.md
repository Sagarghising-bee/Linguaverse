# ✦ LinguaVerse

**AI-Powered Multilingual Language Learning Companion**

> An immersive language tutor powered by Google Gemini AI — supporting 20 languages, voice conversation, cultural insights, and installable as a PWA.

🌐 **Live Demo:** [https://ghisingsagar.pythonanywhere.com](https://ghisingsagar.pythonanywhere.com)

---

## ✨ Features

- 🧠 **Adaptive AI Tutor** — powered by Google Gemini 2.5 Flash-Lite, adjusts to your level automatically
- 🌍 **20 Languages** — Japanese, French, Spanish, Mandarin, Arabic, German, Korean, Portuguese, Italian, Hindi, Russian, Turkish, Dutch, Swedish, Polish, Greek, Hebrew, Thai, Vietnamese, Indonesian
- 🔊 **Sound Mode** — fully hands-free voice conversation in your target language
- 🗺️ **Story Mode** — learn through immersive first-person narratives
- 🌏 **Cultural DNA** — every lesson includes cultural context and insights
- 💬 **Word Chip Tooltips** — tap any highlighted word for instant translation and romanisation
- 📅 **Daily Snapshot** — AI-generated word, phrase, grammar tip and cultural fact every day
- 📱 **PWA** — installable on Android and iOS, works offline

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Voice | Web Speech API |
| Animations | HTML5 Canvas API |
| PWA | Service Worker, Web Manifest |
| Backend | Python Flask |
| AI | Google Gemini 2.5 Flash-Lite |
| Hosting | PythonAnywhere |
| Storage | Browser localStorage |

---

## 📁 Project Structure

```
Linguaverse/
├── app.py                  ← Flask server (API proxy — not committed)
├── index.html              ← Landing page
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker
├── icon-192.png            ← PWA icon
├── icon-512.png            ← PWA icon
├── pages/
│   ├── chat.html           ← Main chat interface
│   └── setup.html          ← 2-step onboarding
├── css/
│   ├── global.css
│   ├── landing.css
│   ├── setup.css
│   └── chat.css
└── js/
    ├── chat.js             ← All AI, voice and chat logic
    ├── setup.js            ← Setup flow
    ├── canvas-bg.js        ← Animated particle background
    └── reveal.js           ← Scroll animations
```

---

## 🚀 Deployment (PythonAnywhere)

1. Upload all files to `/home/yourusername/Linguaverse/`
2. Create a new Web App → Flask → Python 3.10
3. Edit the WSGI file:
   ```python
   import sys
   sys.path.insert(0, '/home/yourusername/Linguaverse')
   from app import app as application
   ```
4. Add your Gemini API key directly in `app.py`:
   ```python
   GEMINI_API_KEY = 'your_key_here'
   ```
5. Click **Reload** — live at `yourusername.pythonanywhere.com`

> ⚠️ `app.py` contains the API key and is **not committed to this repository**.

---

## 🔐 Security

All Gemini API calls are routed through a server-side Flask proxy (`/api/gemini`). The API key never reaches the browser or appears in any client-side code.

---

## 📚 Academic Context

Built as the Final Major Project for **FGCT6025: Final Major Project 25/26**.

**Key references:**
- Krashen, S. (1982) *Principles and Practice in Second Language Acquisition*
- Vygotsky, L. S. (1978) *Mind in Society*
- Kramsch, C. (1993) *Context and Culture in Language Teaching*

---

## 👤 Author

**Sagar Ghising**
FGCT6025 — Final Major Project 25/26
