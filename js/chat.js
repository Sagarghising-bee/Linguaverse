/* ═══════════════════════════════
   chat.js — LinguaVerse
═══════════════════════════════ */

// ── STATE ──
let settings = {
  apiKey:     localStorage.getItem('lv_apiKey')     || '',
  lang:       localStorage.getItem('lv_lang')       || 'Japanese',
  level:      localStorage.getItem('lv_level')      || 'Beginner',
  mode:       localStorage.getItem('lv_mode')       || 'Conversation',
  name:       localStorage.getItem('lv_name')       || 'Learner',
  voiceSpeed: parseFloat(localStorage.getItem('lv_voiceSpeed') || '1.0'),
};

let chatHistory = [];
let isThinking  = false;
let recognition = null;
let isRecording = false;
let soundMode   = false;
let isSpeaking  = false;
const synth     = window.speechSynthesis;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ── DOM ──
const chatBody     = document.getElementById('chatBody');
const msgInput     = document.getElementById('msgInput');
const sendBtn      = document.getElementById('sendBtn');
const micBtn       = document.getElementById('micBtn');
const aiAvatar     = document.getElementById('aiAvatar');
const botStatus    = document.getElementById('botStatus');
const botName      = document.getElementById('botName');
const soundModeBtn = document.getElementById('soundModeBtn');
const voiceWave    = document.getElementById('voiceWave');

// Language code map for TTS & speech recognition
const LANG_CODES = {
  Japanese:'ja-JP', French:'fr-FR', Spanish:'es-ES', Mandarin:'zh-CN',
  Arabic:'ar-SA', German:'de-DE', Korean:'ko-KR', Portuguese:'pt-BR',
  Italian:'it-IT', Hindi:'hi-IN', Russian:'ru-RU', Turkish:'tr-TR',
  Dutch:'nl-NL', Swedish:'sv-SE', Polish:'pl-PL', Greek:'el-GR',
  Hebrew:'he-IL', Thai:'th-TH', Vietnamese:'vi-VN', Indonesian:'id-ID',
};

// Language display names for bot header
const LANG_LABELS = {
  Japanese:'JA', French:'FR', Spanish:'ES', Mandarin:'ZH',
  Arabic:'AR', German:'DE', Korean:'KO', Portuguese:'PT',
  Italian:'IT', Hindi:'HI', Russian:'RU', Turkish:'TR',
  Dutch:'NL', Swedish:'SV', Polish:'PL', Greek:'EL',
  Hebrew:'HE', Thai:'TH', Vietnamese:'VI', Indonesian:'ID',
};

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  syncSettingsUI();
  showWelcome();
  loadDailyItems();
  if (synth) synth.getVoices(); // preload voices
});

function syncSettingsUI() {
  setVal('settingLang',  settings.lang);
  setVal('settingLevel', settings.level);
  setVal('settingMode',  settings.mode);
  setVal('settingKey',   settings.apiKey);
  setVal('settingSpeed', String(settings.voiceSpeed));
  botName.textContent = `[${LANG_LABELS[settings.lang]||'??'}] LinguaBot`;
}
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

function saveSetting(key, val) {
  settings[key] = key === 'voiceSpeed' ? parseFloat(val) : val;
  localStorage.setItem(`lv_${key}`, val);
  if (key === 'lang') botName.textContent = `[${LANG_LABELS[val]||'??'}] LinguaBot`;
}

function toggleSettingKey() {
  const el = document.getElementById('settingKey');
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// ── WELCOME MESSAGE ──
function showWelcome() {
  const greetings = {
    Japanese:'こんにちは (Konnichiwa)', French:'Bonjour !',
    Spanish:'¡Hola!', Mandarin:'你好 (Nǐ hǎo)',
    Arabic:'مرحباً (Marhaban)', German:'Hallo!',
    Korean:'안녕하세요 (Annyeonghaseyo)', Portuguese:'Olá!',
    Italian:'Ciao!', Hindi:'नमस्ते (Namaste)',
    Russian:'Привет (Privet)', Turkish:'Merhaba!',
    Dutch:'Hallo!', Swedish:'Hej!', Polish:'Cześć!',
    Greek:'Γεια σου (Yia sou)', Hebrew:'שָׁלוֹם (Shalom)',
    Thai:'สวัสดี (Sawasdee)', Vietnamese:'Xin chào!', Indonesian:'Halo!',
  };
  const greeting = greetings[settings.lang] || 'Hello!';
  const parts = greeting.split(' ');
  const native = parts[0];

  appendMessage('ai', `
    <span class="word-chip" data-word="${native}" data-rom="" data-def="A greeting in ${settings.lang}">${greeting}</span>
    <br/><br/>
    I'm your <strong>${settings.lang}</strong> tutor at <strong>${settings.level}</strong> level in <strong>${settings.mode}</strong> mode.
    <br/><br/>
    Tap any <span class="word-chip" data-word="highlighted word" data-rom="" data-def="Tap me for translation!">highlighted word</span> for an instant translation.
    Enable <strong>🔊 Sound Mode</strong> for hands-free voice conversation!
    <br/><br/>
    What shall we explore today? 🌟
  `);
}

// ── SYSTEM PROMPT ──
function buildSystemPrompt() {
  return `You are LinguaBot, an expert warm ${settings.lang} language tutor for a ${settings.level} learner named ${settings.name}. Mode: "${settings.mode}".

TEACHING STYLE:
- Conversation: natural chat, gently correct mistakes inline
- Story: immersive micro-stories where user is the protagonist  
- Lesson: structured explanations with clear examples

${soundMode ? `SOUND MODE IS ON: Keep responses under 3 sentences. Plain text only — no HTML tags.
Include at least one ${settings.lang} phrase so TTS speaks it correctly.
Format: say the phrase first, then brief English explanation.` : `
FORMATTING (use every response):
- Wrap key ${settings.lang} vocab: <span class="word-chip" data-word="WORD" data-rom="ROMANIZATION" data-def="ENGLISH">WORD</span>
- Cultural notes: <div class="culture-badge">🌏 Cultural note: ONE_PARAGRAPH_NO_LINE_BREAKS</div>
- Listen buttons: <button class="speak-btn" onclick="speakText('THE_TARGET_LANGUAGE_PHRASE_ONLY')">🔊 Listen</button>
- Use <strong> for grammar emphasis
- Keep responses 3-5 sentences`}

ALWAYS:
- Celebrate when user uses target language correctly
- Simplify if user seems confused
- End with a question or mini-challenge
- Be warm, encouraging, and culturally insightful`;
}

// ── SEND MESSAGE ──
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || isThinking) return;
  if (!settings.apiKey) {
    appendMessage('ai', '⚠️ Please <a href="../pages/setup.html" style="color:var(--neon-cyan)">add your Gemini API key</a> in Setup first!');
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
    if (soundMode) {
      const plain = stripHtml(response).replace(/\s+/g,' ').trim();
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

// ── GEMINI API ──
async function callGemini(history) {
  const body = {
    system_instruction: { parts:[{ text: buildSystemPrompt() }] },
    contents: history,
    generationConfig: {
      temperature: 0.85, topK: 40, topP: 0.95,
      maxOutputTokens: soundMode ? 250 : 600,
    },
  };
  const res = await fetch(`${GEMINI_URL}?key=${settings.apiKey}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I had trouble responding. Please try again.';
}

// ── APPEND MESSAGE ──
function appendMessage(role, html) {
  const row    = document.createElement('div');
  row.className = `msg-row ${role==='user'?'user':''}`;

  const av      = document.createElement('div');
  av.className  = `msg-avatar ${role==='ai'?'ai-av':'usr-av'}`;
  av.textContent = role==='ai' ? '✦' : (settings.name[0]||'U').toUpperCase();

  const bubble   = document.createElement('div');
  bubble.className = `bubble ${role==='ai'?'ai-bubble':'user-bubble'}`;
  bubble.innerHTML = html;

  const time     = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = nowTime();

  if (role==='user') { row.append(time, bubble, av); }
  else               { row.append(av, bubble, time); }

  chatBody.appendChild(row);
  scrollToBottom();
  bubble.querySelectorAll('.word-chip').forEach(c => c.addEventListener('click', e => showWordTooltip(e, c)));
}

// ── TYPING ──
function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row'; row.id = 'typingRow';
  row.innerHTML = `<div class="msg-avatar ai-av">✦</div>
    <div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  chatBody.appendChild(row); scrollToBottom(); return row;
}
function removeTyping(el) { el && el.remove(); }

// ── THINKING STATE ──
function setThinking(on) {
  isThinking = on;
  aiAvatar.classList.toggle('thinking', on);
  botStatus.textContent = on ? '⚙ Thinking…' : (soundMode ? '🔊 Sound Mode' : '● Online');
  botStatus.className   = 'bot-status' + (on ? ' thinking-status' : '');
}

// ══════════════════════════════
//  SOUND MODE
// ══════════════════════════════
function toggleSoundMode() {
  soundMode = !soundMode;
  soundModeBtn.classList.toggle('active', soundMode);
  soundModeBtn.innerHTML = soundMode
    ? `<span style="width:8px;height:8px;border-radius:50%;background:var(--neon-green);animation:dotLive 1s ease infinite;display:inline-block"></span> <span class="sound-label">Sound</span>`
    : `🔊 <span class="sound-label">Sound</span>`;

  botStatus.textContent = soundMode ? '🔊 Sound Mode' : '● Online';

  if (soundMode) {
    appendMessage('ai', '🔊 <strong>Sound Mode ON!</strong> I\'ll speak and listen automatically. Say <em>"stop"</em> anytime to exit.');
    setTimeout(() => startListening(), 800);
  } else {
    stopListening();
    if (synth) synth.cancel();
    voiceWave.classList.remove('active');
    appendMessage('ai', 'Sound Mode off — back to text chat. 💬');
  }
}

async function speakAndListen(text) {
  if (!soundMode) return;
  stopListening();
  await speakText(text);
  if (soundMode) setTimeout(() => startListening(), 500);
}

// Text-to-speech — ALWAYS sets lang code first (fixes wrong language bug)
function speakText(text) {
  return new Promise(resolve => {
    if (!synth) { resolve(); return; }
    synth.cancel();
    isSpeaking = true;
    voiceWave.classList.add('active');

    const plain = stripHtml(String(text)).replace(/\s+/g,' ').trim();
    const utter = new SpeechSynthesisUtterance(plain);
    utter.rate   = settings.voiceSpeed;
    utter.pitch  = 1.05;
    utter.volume = 1;

    // CRITICAL: always set lang so TTS uses correct language
    const code = LANG_CODES[settings.lang] || 'en-US';
    utter.lang  = code;

    // Try to find a matching installed voice
    const voices = synth.getVoices();
    const prefix = code.split('-')[0];
    const match  = voices.find(v => v.lang === code) || voices.find(v => v.lang.startsWith(prefix));
    if (match) { utter.voice = match; utter.lang = match.lang; }

    utter.onend   = () => { isSpeaking = false; voiceWave.classList.remove('active'); resolve(); };
    utter.onerror = () => { isSpeaking = false; voiceWave.classList.remove('active'); resolve(); };
    synth.speak(utter);
  });
}

function startListening() {
  if (!soundMode || isSpeaking || isThinking) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { appendMessage('ai', '⚠️ Speech recognition requires Chrome or Edge.'); soundMode=false; soundModeBtn.classList.remove('active'); return; }

  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  isRecording = true;
  micBtn.classList.add('recording');
  micBtn.textContent = '⏹️';
  botStatus.textContent = '👂 Listening…';

  recognition.onresult = e => {
    const t = e.results[0][0].transcript.trim();
    if (t.toLowerCase().includes('stop')) { toggleSoundMode(); return; }
    if (t) { msgInput.value = t; sendMessage(); }
  };
  recognition.onend = () => {
    isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎙️';
    if (soundMode && !isSpeaking && !isThinking) botStatus.textContent = '🔊 Sound Mode';
  };
  recognition.onerror = e => { if (e.error !== 'no-speech') console.warn(e.error); recognition.stop(); };
  try { recognition.start(); } catch(e) {}
}

function stopListening() {
  if (recognition) { try { recognition.stop(); } catch(e){} recognition = null; }
  isRecording = false;
  micBtn.classList.remove('recording');
  micBtn.textContent = '🎙️';
}

// ── MANUAL MIC (non-sound-mode) ──
function toggleMic() {
  if (soundMode) { toggleSoundMode(); return; }
  if (isRecording) { stopListening(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech recognition requires Chrome or Edge.'); return; }

  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = true;

  recognition.onstart = () => { isRecording=true; micBtn.classList.add('recording'); micBtn.textContent='⏹️'; };
  recognition.onresult = e => {
    msgInput.value = Array.from(e.results).map(r=>r[0].transcript).join('');
    autoResize(msgInput);
  };
  recognition.onend = () => {
    isRecording=false; micBtn.classList.remove('recording'); micBtn.textContent='🎙️';
    if (msgInput.value.trim()) sendMessage();
  };
  recognition.onerror = e => { console.warn(e.error); recognition.stop(); };
  recognition.start();
}

// ── WORD TOOLTIP ──
const tooltip = document.getElementById('wordTooltip');
function showWordTooltip(e, chip) {
  tooltip.innerHTML = `
    <span class="tooltip-word">${chip.dataset.word||''}</span>
    ${chip.dataset.rom ? `<span class="tooltip-rom">${chip.dataset.rom}</span>` : ''}
    <span>${chip.dataset.def||''}</span>
  `;
  const rect = chip.getBoundingClientRect();
  let top = rect.top - 10, left = rect.left;
  if (top < 60) top = rect.bottom + 10;
  if (left + 270 > window.innerWidth - 10) left = window.innerWidth - 280;
  tooltip.style.top  = `${top + window.scrollY}px`;
  tooltip.style.left = `${left}px`;
  tooltip.classList.add('visible');
  setTimeout(() => document.addEventListener('click', hideTooltip, { once:true }), 0);
}
function hideTooltip() { tooltip.classList.remove('visible'); }

// ── QUICK PROMPTS ──
function sendQuick(btn) {
  const map = {
    'Teach me a phrase': `Teach me a useful everyday ${settings.lang} phrase for a ${settings.level} learner.`,
    'Cultural insight':  `Share one fascinating cultural fact about ${settings.lang}-speaking countries.`,
    'Tell me a story':   `Start an immersive short story in ${settings.lang} where I'm the main character. ${settings.level} level.`,
    'Grammar tip':       `Give me one essential ${settings.lang} grammar tip for ${settings.level} learners.`,
    'Test my level':     `Quiz me with 3 ${settings.lang} questions at ${settings.level} level, then grade my answers.`,
    'Fun fact':          `Tell me one surprising or funny fact about the ${settings.lang} language or culture.`,
  };
  msgInput.value = map[btn.textContent] || btn.textContent;
  sendMessage();
}

// ── DAILY CHALLENGE ──
async function loadDailyItems() {
  const container = document.getElementById('dailyItems');
  const key = `lv_daily_${settings.lang}_${new Date().toDateString()}`;
  const cached = localStorage.getItem(key);
  if (cached) { container.innerHTML = cached; return; }
  if (!settings.apiKey) { container.innerHTML = '<div class="daily-loading">Add your API key to unlock daily challenges.</div>'; return; }
  container.innerHTML = '<div class="daily-loading">✦ Generating today\'s challenges…</div>';
  try {
    const prompt = `Generate a Daily Language Snapshot for a ${settings.level} ${settings.lang} learner. Return ONLY valid JSON — an array of 4 objects, each with: type (word|phrase|culture|grammar), title (in ${settings.lang}), romanization (if non-Latin else ""), meaning (English), fun_fact (one sentence). No markdown, no extra text.`;
    const res  = await fetch(`${GEMINI_URL}?key=${settings.apiKey}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ contents:[{role:'user',parts:[{text:prompt}]}], generationConfig:{temperature:0.9,maxOutputTokens:800} }),
    });
    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    raw = raw.replace(/```json|```/g,'').trim();
    const items = JSON.parse(raw);
    const tClass = { word:'tag-word', phrase:'tag-phrase', culture:'tag-culture', grammar:'tag-grammar' };
    const tLabel = { word:'Word', phrase:'Phrase', culture:'Culture', grammar:'Grammar' };
    const html = items.map(i=>`
      <div class="daily-item">
        <div class="daily-item-tag ${tClass[i.type]||'tag-word'}">${tLabel[i.type]||'Word'}</div>
        <h4>${i.title}${i.romanization?` <span style="font-size:.73rem;color:var(--neon-cyan);font-family:var(--font-mono)">(${i.romanization})</span>`:''}</h4>
        <p><strong>${i.meaning}</strong></p>
        <p style="margin-top:5px;font-size:.77rem">${i.fun_fact}</p>
      </div>`).join('');
    container.innerHTML = html;
    localStorage.setItem(key, html);
  } catch(e) { container.innerHTML = '<div class="daily-loading">Could not load. Check your API key.</div>'; }
}

// ── PANELS ──
function openDailyPanel()  { document.getElementById('dailyPanel').classList.add('open');    document.getElementById('overlay').classList.add('active'); }
function openSettings()    { document.getElementById('settingsPanel').classList.add('open'); document.getElementById('overlay').classList.add('active'); }
function closePanels()     { document.querySelectorAll('.side-panel').forEach(p=>p.classList.remove('open')); document.getElementById('overlay').classList.remove('active'); }
function clearChat()       { if (!confirm('Clear all chat?')) return; chatHistory=[]; chatBody.innerHTML=''; closePanels(); setTimeout(showWelcome, 300); }

// ── HELPERS ──
function autoResize(el)  { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; }
function handleKey(e)    { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }
function scrollToBottom(){ chatBody.scrollTop=chatBody.scrollHeight; }
function nowTime()       { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function escapeHtml(s)   { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function stripHtml(s)    { const d=document.createElement('div'); d.innerHTML=s; return d.textContent||d.innerText||''; }
