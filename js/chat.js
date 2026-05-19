/* ═══════════════════════════════════
   chat.js — LinguaVerse
   Gemini AI + Voice + Sound Mode
═══════════════════════════════════ */

// ── STATE ────────────────────────────
let settings = {
  apiKey:     localStorage.getItem('lv_apiKey')     || '',
  lang:       localStorage.getItem('lv_lang')       || 'Japanese',
  level:      localStorage.getItem('lv_level')      || 'Beginner',
  mode:       localStorage.getItem('lv_mode')       || 'Conversation',
  name:       localStorage.getItem('lv_name')       || 'Learner',
  voiceSpeed: parseFloat(localStorage.getItem('lv_voiceSpeed') || '1.0'),
};

let chatHistory  = [];
let isThinking   = false;
let recognition  = null;
let isRecording  = false;
let soundMode    = false;  
// full duplex voice conversation
let isSpeaking   = false;
let synth        = window.speechSynthesis;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// ── DOM REFS ─────────────────────────
const chatBody     = document.getElementById('chatBody');
const msgInput     = document.getElementById('msgInput');
const sendBtn      = document.getElementById('sendBtn');
const micBtn       = document.getElementById('micBtn');
const aiAvatar     = document.getElementById('aiAvatar');
const botStatus    = document.getElementById('botStatus');
const botName      = document.getElementById('botName');
const soundModeBtn = document.getElementById('soundModeBtn');
const voiceWave    = document.getElementById('voiceWave');

// ── INIT ─────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  syncSettingsUI();
  showWelcome();
  loadDailyItems();
});

function syncSettingsUI() {
  setEl('settingLang',  settings.lang);
  setEl('settingLevel', settings.level);
  setEl('settingMode',  settings.mode);
  setEl('settingKey',   settings.apiKey);
  setEl('settingSpeed', String(settings.voiceSpeed));
  botName.textContent = `${langFlag(settings.lang)} LinguaBot`;
}
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function saveSetting(key, val) {
  settings[key] = key === 'voiceSpeed' ? parseFloat(val) : val;
  localStorage.setItem(`lv_${key}`, val);
  if (key === 'lang') botName.textContent = `${langFlag(val)} LinguaBot`;
}

const FLAGS = {
  Japanese:'🇯🇵', French:'🇫🇷', Spanish:'🇪🇸', Mandarin:'🇨🇳',
  Arabic:'🇸🇦', German:'🇩🇪', Korean:'🇰🇷', Portuguese:'🇧🇷',
  Italian:'🇮🇹', Hindi:'🇮🇳', Russian:'🇷🇺', Turkish:'🇹🇷',
  Dutch:'🇳🇱', Swedish:'🇸🇪', Polish:'🇵🇱', Greek:'🇬🇷',
  Hebrew:'🇮🇱', Thai:'🇹🇭', Vietnamese:'🇻🇳', Indonesian:'🇮🇩',
};
function langFlag(l) { return FLAGS[l] || '🌐'; }

// Speech recognition lang codes
const LANG_CODES = {
  Japanese:'ja-JP', French:'fr-FR', Spanish:'es-ES', Mandarin:'zh-CN',
  Arabic:'ar-SA', German:'de-DE', Korean:'ko-KR', Portuguese:'pt-BR',
  Italian:'it-IT', Hindi:'hi-IN', Russian:'ru-RU', Turkish:'tr-TR',
  Dutch:'nl-NL', Swedish:'sv-SE', Polish:'pl-PL', Greek:'el-GR',
  Hebrew:'he-IL', Thai:'th-TH', Vietnamese:'vi-VN', Indonesian:'id-ID',
};

// ── WELCOME ───────────────────────────
function showWelcome() {
  const greetings = {
    Japanese:'こんにちは！ (Konnichiwa!)', French:'Bonjour !',
    Spanish:'¡Hola!', Mandarin:'你好！(Nǐ hǎo!)',
    Arabic:'مرحباً! (Marhaban!)', German:'Hallo!',
    Korean:'안녕하세요! (Annyeonghaseyo!)', Portuguese:'Olá!',
    Italian:'Ciao!', Hindi:'नमस्ते! (Namaste!)',
    Russian:'Привет! (Privet!)', Turkish:'Merhaba!',
    Dutch:'Hallo!', Swedish:'Hej!', Polish:'Cześć!',
    Greek:'Γεια σου! (Yia sou!)', Hebrew:'שָׁלוֹם! (Shalom!)',
    Thai:'สวัสดี! (Sawasdee!)', Vietnamese:'Xin chào!', Indonesian:'Halo!',
  };
  const greeting = greetings[settings.lang] || 'Hello!';
  const content = `
    <span class="word-chip" data-word="${greeting.split(' ')[0]}" data-rom="" data-def="A greeting in ${settings.lang}">${greeting}</span>
    I'm your <strong>${settings.lang}</strong> tutor at <strong>${settings.level}</strong> level in <strong>${settings.mode}</strong> mode.
    <br/><br/>
    Tap any <span class="word-chip" data-word="highlighted" data-rom="" data-def="Words shown like this are clickable — tap for meaning!">highlighted word</span> for instant translation.
    Enable <strong>🔊 Sound Mode</strong> for a hands-free voice conversation — I'll speak and listen automatically!
    <br/><br/>
    What shall we explore today? 🌟
  `;
  appendMessage('ai', content);
}

// ── SYSTEM PROMPT ─────────────────────
function buildSystemPrompt() {
  return `You are LinguaBot, an expert, warm ${settings.lang} language tutor for a ${settings.level} learner named ${settings.name}. Mode: "${settings.mode}".

TEACHING STYLE:
- Conversation mode: natural flowing chat, gently correct mistakes inline
- Story mode: immersive micro-stories where user is the protagonist
- Lesson mode: structured explanations with clear examples and exercises

FORMATTING (CRITICAL — always follow):
- Wrap key ${settings.lang} vocabulary: <span class="word-chip" data-word="WORD" data-rom="ROMANIZATION_OR_EMPTY" data-def="ENGLISH_MEANING">WORD</span>
- For non-Latin scripts always include romanization in data-rom
- Cultural insights: <div class="culture-badge">🌏 Cultural note: TEXT</div>
- Add a speak button after important phrases: <button class="speak-btn" onclick="speakText('TEXT_IN_TARGET_LANGUAGE')">🔊 Listen</button>
- Use <strong> for grammar emphasis
- Keep responses 3-6 sentences unless teaching something complex

PERSONALITY:
- Detect confusion (short replies, "?") and simplify
- Celebrate when user uses target language
- Share surprising cultural facts
- If in Sound Mode, keep responses shorter and more conversational (1-3 sentences)
- End responses with an engaging follow-up question or mini-challenge`;
}

// ── SEND MESSAGE ──────────────────────
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || isThinking) return;
  if (!settings.apiKey) {
    appendMessage('ai', '⚠️ Please <a href="../pages/setup.html" style="color:var(--neon-cyan)">add your Gemini API key</a> in Setup to start chatting!');
    return;
  }
  appendMessage('user', escapeHtml(text));
  chatHistory.push({ role:'user', parts:[{ text }] });
  msgInput.value = '';
  msgInput.style.height = 'auto';
  sendBtn.disabled = true;
  setThinking(true);
  const typingEl = showTyping();

  try {
    const response = await callGemini(chatHistory);
    removeTyping(typingEl);
    chatHistory.push({ role:'model', parts:[{ text: response }] });
    appendMessage('ai', response);
    // In sound mode, speak the plain text of the response automatically
    if (soundMode) {
      const plain = stripHtml(response);
      await speakAndListen(plain);
    }
  } catch (err) {
    removeTyping(typingEl);
    appendMessage('ai', `⚠️ Error: ${err.message}. Check your API key in Settings ⚙️`);
  } finally {
    setThinking(false);
    sendBtn.disabled = false;
  }
}

// ── GEMINI API ────────────────────────
async function callGemini(history) {
  const body = {
    system_instruction: { parts:[{ text: buildSystemPrompt() }] },
    contents: history,
    generationConfig: { temperature:0.85, topK:40, topP:0.95, maxOutputTokens: soundMode ? 300 : 600 },
  };
  const res = await fetch(`${GEMINI_URL}?key=${settings.apiKey}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I had trouble responding. Please try again.';
}

// ── APPEND MESSAGE ────────────────────
function appendMessage(role, html) {
  const row = document.createElement('div');
  row.className = `msg-row ${role === 'user' ? 'user' : ''}`;

  const av = document.createElement('div');
  av.className = `msg-avatar ${role === 'ai' ? 'ai-av' : 'usr-av'}`;
  av.textContent = role === 'ai' ? '✦' : (settings.name[0] || 'U').toUpperCase();

  const bubble = document.createElement('div');
  bubble.className = `bubble ${role === 'ai' ? 'ai-bubble' : 'user-bubble'}`;
  bubble.innerHTML = html;

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = nowTime();

  if (role === 'user') {
    row.appendChild(time); row.appendChild(bubble); row.appendChild(av);
  } else {
    row.appendChild(av); row.appendChild(bubble); row.appendChild(time);
  }
  chatBody.appendChild(row);
  scrollToBottom();

  bubble.querySelectorAll('.word-chip').forEach(chip =>
    chip.addEventListener('click', e => showWordTooltip(e, chip))
  );
}

// ── TYPING INDICATOR ──────────────────
function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row'; row.id = 'typingRow';
  row.innerHTML = `<div class="msg-avatar ai-av">✦</div>
    <div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  chatBody.appendChild(row); scrollToBottom(); return row;
}
function removeTyping(el) { el && el.remove(); }

// ── THINKING STATE ────────────────────
function setThinking(on) {
  isThinking = on;
  aiAvatar.classList.toggle('thinking', on);
  if (on) {
    botStatus.textContent = '⚙ Thinking…';
    botStatus.className = 'bot-status thinking-status';
  } else {
    botStatus.textContent = soundMode ? '🔊 Sound Mode' : '● Online';
    botStatus.className = 'bot-status';
  }
}

// ══════════════════════════════════════
//  SOUND MODE — Full Voice Conversation
// ══════════════════════════════════════
function toggleSoundMode() {
  soundMode = !soundMode;
  soundModeBtn.classList.toggle('active', soundMode);
  soundModeBtn.innerHTML = soundMode
    ? '<div class="sound-dot"></div><span>Sound Mode</span>'
    : '<span>🔊</span><span>Sound Mode</span>';

  botStatus.textContent = soundMode ? '🔊 Sound Mode' : '● Online';

  if (soundMode) {
    appendMessage('ai', '🔊 <strong>Sound Mode activated!</strong> I\'ll speak my responses and automatically listen for your reply. Just talk naturally — say <em>"stop"</em> to exit.');
    startListening();
  } else {
    stopListening();
    synth.cancel();
    voiceWave.classList.remove('active');
    appendMessage('ai', 'Sound Mode off. Back to text chat! 💬');
  }
}

// Speak text then auto-listen
async function speakAndListen(text) {
  if (!soundMode) return;
  stopListening();
  await speakText(text);
  if (soundMode) {
    setTimeout(() => startListening(), 400);
  }
}

// Text-to-Speech
function speakText(text) {
  return new Promise(resolve => {
    if (!synth) { resolve(); return; }
    synth.cancel();
    isSpeaking = true;
    voiceWave.classList.add('active');

    const plain = typeof text === 'string' ? text : stripHtml(text);
    const utter = new SpeechSynthesisUtterance(plain);
    utter.rate   = settings.voiceSpeed;
    utter.pitch  = 1.05;
    utter.volume = 1;

    // Try to find a voice matching the target language
    const voices = synth.getVoices();
    const code   = LANG_CODES[settings.lang] || 'en-US';
    const match  = voices.find(v => v.lang.startsWith(code.split('-')[0]))
                || voices.find(v => v.lang.startsWith('en'));
    if (match) utter.voice = match;
    else utter.lang = code;

    utter.onend = () => {
      isSpeaking = false;
      voiceWave.classList.remove('active');
      resolve();
    };
    utter.onerror = () => {
      isSpeaking = false;
      voiceWave.classList.remove('active');
      resolve();
    };
    synth.speak(utter);
  });
}

// Start continuous speech recognition for sound mode
function startListening() {
  if (!soundMode || isSpeaking || isThinking) return;
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    appendMessage('ai', '⚠️ Speech recognition not supported. Try Chrome or Edge for Sound Mode.');
    soundMode = false;
    soundModeBtn.classList.remove('active');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'en-US'; // user speaks in English, AI responds in target lang
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.textContent = '⏹️';
  botStatus.textContent = '👂 Listening…';

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript.trim();
    if (transcript.toLowerCase().includes('stop') && soundMode) {
      toggleSoundMode();
      return;
    }
    if (transcript) {
      msgInput.value = transcript;
      sendMessage();
    }
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.textContent = '🎙️';
    if (soundMode && !isSpeaking && !isThinking) {
      botStatus.textContent = '🔊 Sound Mode';
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech') console.warn('Speech error:', e.error);
    recognition.stop();
  };

  try { recognition.start(); } catch(e) {}
}

function stopListening() {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
  isRecording = false;
  micBtn.classList.remove('recording');
  micBtn.textContent = '🎙️';
}

// ── MANUAL MIC (non-sound-mode) ───────
function toggleMic() {
  if (soundMode) { toggleSoundMode(); return; } // tap to exit sound mode

  if (isRecording) { stopListening(); return; }

  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Speech recognition not supported. Try Chrome or Edge.'); return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.textContent = '⏹️';
  };
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
    msgInput.value = transcript;
    autoResize(msgInput);
  };
  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.textContent = '🎙️';
    if (msgInput.value.trim()) sendMessage();
  };
  recognition.onerror = (e) => { console.warn(e.error); recognition.stop(); };
  recognition.start();
}

// ── WORD TOOLTIP ──────────────────────
const tooltip = document.getElementById('wordTooltip');
function showWordTooltip(e, chip) {
  tooltip.innerHTML = `
    <span class="tooltip-word">${chip.dataset.word || ''}</span>
    ${chip.dataset.rom ? `<span class="tooltip-rom">${chip.dataset.rom}</span>` : ''}
    <span>${chip.dataset.def || ''}</span>
  `;
  const rect = chip.getBoundingClientRect();
  let top  = rect.top - 10;
  let left = rect.left;
  if (top < 60) top = rect.bottom + 10;
  const tw = 270;
  if (left + tw > window.innerWidth - 10) left = window.innerWidth - tw - 10;
  tooltip.style.top  = `${top + window.scrollY}px`;
  tooltip.style.left = `${left}px`;
  tooltip.classList.add('visible');
  setTimeout(() => document.addEventListener('click', hideTooltip, { once:true }), 0);
}
function hideTooltip() { tooltip.classList.remove('visible'); }

// ── QUICK PROMPTS ─────────────────────
function sendQuick(btn) {
  const map = {
    'Teach me a phrase': `Teach me a useful everyday ${settings.lang} phrase for a ${settings.level} learner.`,
    'Cultural insight':  `Share one fascinating cultural fact about ${settings.lang}-speaking countries.`,
    'Tell me a story':   `Start an immersive short story in ${settings.lang} where I\'m the main character. Keep it ${settings.level} level.`,
    'Grammar tip':       `Give me one essential ${settings.lang} grammar tip commonly misunderstood by ${settings.level} learners.`,
    'Test my level':     `Quiz me with 3 ${settings.lang} questions at ${settings.level} level, then grade my answers.`,
    'Fun fact':          `Tell me one surprising or funny fact about the ${settings.lang} language or culture.`,
  };
  msgInput.value = map[btn.textContent] || btn.textContent;
  sendMessage();
}

// ── DAILY CHALLENGE ───────────────────
async function loadDailyItems() {
  const container = document.getElementById('dailyItems');
  const cacheKey  = `lv_daily_${settings.lang}_${new Date().toDateString()}`;
  const cached    = localStorage.getItem(cacheKey);
  if (cached) { container.innerHTML = cached; return; }
  if (!settings.apiKey) {
    container.innerHTML = '<div class="daily-loading">Add your API key to unlock daily challenges.</div>';
    return;
  }
  container.innerHTML = '<div class="daily-loading">✦ Generating today\'s challenges…</div>';

  try {
    const prompt = `Generate a Daily Language Snapshot for a ${settings.level} ${settings.lang} learner. Return ONLY a valid JSON array with 4 objects, each with: type (word|phrase|culture|grammar), title (in ${settings.lang}), romanization (if non-Latin, else ""), meaning (English), fun_fact (one sentence). No markdown, no extra text.`;
    const res  = await fetch(`${GEMINI_URL}?key=${settings.apiKey}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{role:'user',parts:[{text:prompt}]}], generationConfig:{temperature:0.9,maxOutputTokens:800} }),
    });
    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    raw = raw.replace(/```json|```/g,'').trim();
    const items = JSON.parse(raw);
    const tagClass = { word:'tag-word', phrase:'tag-phrase', culture:'tag-culture', grammar:'tag-grammar' };
    const tagLabel = { word:'📖 Word', phrase:'💬 Phrase', culture:'🌏 Culture', grammar:'📚 Grammar' };
    const html = items.map(item => `
      <div class="daily-item">
        <div class="daily-item-tag ${tagClass[item.type]||'tag-word'}">${tagLabel[item.type]||'📖 Word'}</div>
        <h4>${item.title}${item.romanization?` <span style="font-size:.73rem;color:var(--neon-cyan);font-family:var(--font-mono)">(${item.romanization})</span>`:''}</h4>
        <p><strong>${item.meaning}</strong></p>
        <p style="margin-top:6px;font-size:.77rem">${item.fun_fact}</p>
      </div>`).join('');
    container.innerHTML = html;
    localStorage.setItem(cacheKey, html);
  } catch(err) {
    container.innerHTML = '<div class="daily-loading">Couldn\'t load. Check your API key.</div>';
  }
}

// ── PANELS ────────────────────────────
function openDailyPanel()   { document.getElementById('dailyPanel').classList.add('open');    document.getElementById('overlay').classList.add('active'); }
function openSettings()     { document.getElementById('settingsPanel').classList.add('open'); document.getElementById('overlay').classList.add('active'); }
function closePanels()      { document.querySelectorAll('.side-panel').forEach(p=>p.classList.remove('open')); document.getElementById('overlay').classList.remove('active'); }

// ── CLEAR CHAT ────────────────────────
function clearChat() {
  if (!confirm('Clear all chat history?')) return;
  chatHistory = []; chatBody.innerHTML = ''; closePanels();
  setTimeout(showWelcome, 300);
}

// ── HELPERS ───────────────────────────
function autoResize(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; }
function handleKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function scrollToBottom() { chatBody.scrollTop = chatBody.scrollHeight; }
function nowTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function stripHtml(s) { const d=document.createElement('div'); d.innerHTML=s; return d.textContent||d.innerText||''; }

// Load voices async (Chrome needs this)
if (synth) {
  synth.onvoiceschanged = () => synth.getVoices();
  synth.getVoices();
}
