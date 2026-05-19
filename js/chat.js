/* ═══════════════════════════════════
   chat.js — LinguaVerse
   Full AI chat logic with Gemini API
═══════════════════════════════════ */

// ── STATE ────────────────────────────
let settings = {
  apiKey: localStorage.getItem('lv_apiKey') || '',
  lang:   localStorage.getItem('lv_lang')   || 'Japanese',
  level:  localStorage.getItem('lv_level')  || 'Beginner',
  mode:   localStorage.getItem('lv_mode')   || 'Conversation',
  name:   localStorage.getItem('lv_name')   || 'Learner',
};

let chatHistory = [];
let isThinking  = false;
let recognition = null;
let isRecording = false;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// ── DOM REFS ─────────────────────────
const chatBody  = document.getElementById('chatBody');
const msgInput  = document.getElementById('msgInput');
const sendBtn   = document.getElementById('sendBtn');
const micBtn    = document.getElementById('micBtn');
const aiAvatar  = document.getElementById('aiAvatar');
const botStatus = document.getElementById('botStatus');
const botName   = document.getElementById('botName');

// ── INIT ─────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  syncSettingsUI();
  showWelcome();
  loadDailyItems();
});

function syncSettingsUI() {
  const s = document.getElementById('settingLang');
  const l = document.getElementById('settingLevel');
  const m = document.getElementById('settingMode');
  const k = document.getElementById('settingKey');
  if (s) s.value = settings.lang;
  if (l) l.value = settings.level;
  if (m) m.value = settings.mode;
  if (k) k.value = settings.apiKey;

  const flag = langFlag(settings.lang);
  botName.textContent = `${flag} LinguaBot`;
}

function saveSetting(key, val) {
  settings[key] = val;
  localStorage.setItem(`lv_${key}`, val);
  if (key === 'lang') botName.textContent = `${langFlag(val)} LinguaBot`;
}

function langFlag(lang) {
  const flags = {
    Japanese:'🇯🇵', French:'🇫🇷', Spanish:'🇪🇸', Mandarin:'🇨🇳',
    Arabic:'🇸🇦', German:'🇩🇪', Korean:'🇰🇷', Portuguese:'🇧🇷',
    Italian:'🇮🇹', Hindi:'🇮🇳', Russian:'🇷🇺', Turkish:'🇹🇷',
  };
  return flags[lang] || '🌐';
}

// ── WELCOME MESSAGE ───────────────────
function showWelcome() {
  const welcomes = {
    Japanese:   ['こんにちは！', 'Hello! (Konnichiwa!)'],
    French:     ['Bonjour !', 'Hello!'],
    Spanish:    ['¡Hola!', 'Hello!'],
    Mandarin:   ['你好！', 'Hello! (Nǐ hǎo!)'],
    Arabic:     ['مرحباً!', 'Hello! (Marhaban!)'],
    German:     ['Hallo!', 'Hello!'],
    Korean:     ['안녕하세요!', 'Hello! (Annyeonghaseyo!)'],
    Portuguese: ['Olá!', 'Hello!'],
    Italian:    ['Ciao!', 'Hello!'],
    Hindi:      ['नमस्ते!', 'Hello! (Namaste!)'],
    Russian:    ['Привет!', 'Hello! (Privet!)'],
    Turkish:    ['Merhaba!', 'Hello!'],
  };

  const [native, eng] = welcomes[settings.lang] || ['Hello!', ''];

  const content = `
    <span class="word-chip" data-word="${native}" data-rom="${eng}" data-def="A standard greeting in ${settings.lang}">${native}</span> ${eng}
    I'm your <strong>${settings.lang}</strong> tutor — at <strong>${settings.level}</strong> level, in <strong>${settings.mode}</strong> mode.
    <br/><br/>
    I'll teach you vocabulary, grammar, culture, and pronunciation. <strong>Tap any highlighted word</strong> to see its meaning instantly.
    <br/><br/>
    What shall we explore today? You can ask me anything, or pick a quick prompt below. 🌟
  `;

  appendMessage('ai', content);
}

// ── BUILD SYSTEM PROMPT ───────────────
function buildSystemPrompt() {
  return `You are LinguaBot, an expert, warm, and encouraging ${settings.lang} language tutor for a ${settings.level} learner named ${settings.name}. You're in "${settings.mode}" mode.

TEACHING STYLE:
- Adapt complexity to ${settings.level} level
- In Conversation mode: have natural conversations, gently correct mistakes
- In Story mode: create immersive micro-stories where the user plays a character
- In Lesson mode: structured explanations with examples

FORMATTING RULES (CRITICAL):
- Wrap key ${settings.lang} vocabulary in: <span class="word-chip" data-word="WORD" data-rom="ROMANIZATION" data-def="ENGLISH_MEANING">WORD</span>
- Include romanization/pronunciation for non-Latin scripts
- Add cultural insights wrapped in: <div class="culture-badge">🌏 Cultural note: YOUR_NOTE</div>
- Use <strong> for emphasis on important grammar points
- Keep responses concise but rich — aim for 3-5 sentences max unless teaching something complex

UNIQUE FEATURES:
- Occasionally share fascinating cultural facts about ${settings.lang}-speaking countries
- Detect if user seems confused (short replies, "?", "what?") and simplify
- Celebrate when user uses target language correctly
- If user writes in ${settings.lang}, respond partly in ${settings.lang} too
- Always end with an engaging follow-up question or mini-challenge

Remember: You're not just a translator — you're a cultural ambassador and patient friend.`;
}

// ── SEND MESSAGE ──────────────────────
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || isThinking) return;

  if (!settings.apiKey) {
    appendMessage('ai', '⚠️ Please <a href="../pages/setup.html" style="color:var(--teal)">add your Gemini API key</a> in Setup to start chatting!');
    return;
  }

  appendMessage('user', escapeHtml(text));
  chatHistory.push({ role: 'user', parts: [{ text }] });

  msgInput.value = '';
  msgInput.style.height = 'auto';
  sendBtn.disabled = true;
  setThinking(true);

  const typingEl = showTyping();

  try {
    const response = await callGemini(chatHistory);
    removeTyping(typingEl);
    chatHistory.push({ role: 'model', parts: [{ text: response }] });
    appendMessage('ai', response);
  } catch (err) {
    removeTyping(typingEl);
    appendMessage('ai', `⚠️ Error: ${err.message}. Check your API key in Settings.`);
  } finally {
    setThinking(false);
    sendBtn.disabled = false;
  }
}

// ── GEMINI API CALL ───────────────────
async function callGemini(history) {
  if (!settings.apiKey) throw new Error('No API key set');

  const body = {
    system_instruction: { parts: [{ text: buildSystemPrompt() }] },
    contents: history,
    generationConfig: {
      temperature: 0.85,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 600,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${settings.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
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
  av.textContent = role === 'ai' ? '✦' : settings.name[0].toUpperCase();

  const bubble = document.createElement('div');
  bubble.className = `bubble ${role === 'ai' ? 'ai-bubble' : 'user-bubble'}`;
  bubble.innerHTML = html;

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = now();

  if (role === 'user') {
    row.appendChild(time);
    row.appendChild(bubble);
    row.appendChild(av);
  } else {
    row.appendChild(av);
    row.appendChild(bubble);
    row.appendChild(time);
  }

  chatBody.appendChild(row);
  scrollToBottom();

  // Attach word chip listeners
  bubble.querySelectorAll('.word-chip').forEach(chip => {
    chip.addEventListener('click', (e) => showWordTooltip(e, chip));
  });
}

// ── TYPING INDICATOR ──────────────────
function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typingRow';
  row.innerHTML = `
    <div class="msg-avatar ai-av">✦</div>
    <div class="typing-bubble">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
  chatBody.appendChild(row);
  scrollToBottom();
  return row;
}
function removeTyping(el) { el && el.remove(); }

// ── THINKING STATE ────────────────────
function setThinking(on) {
  isThinking = on;
  if (on) {
    aiAvatar.classList.add('thinking');
    botStatus.textContent = '⚙ Thinking…';
    botStatus.className = 'bot-status thinking-status';
  } else {
    aiAvatar.classList.remove('thinking');
    botStatus.textContent = '● Online';
    botStatus.className = 'bot-status';
  }
}

// ── WORD TOOLTIP ──────────────────────
const tooltip = document.getElementById('wordTooltip');

function showWordTooltip(e, chip) {
  const word = chip.dataset.word || '';
  const rom  = chip.dataset.rom  || '';
  const def  = chip.dataset.def  || '';

  tooltip.innerHTML = `
    <span class="tooltip-word">${word}</span>
    ${rom ? `<span class="tooltip-rom">${rom}</span>` : ''}
    <span>${def}</span>
  `;

  const rect = chip.getBoundingClientRect();
  let top  = rect.top - tooltip.offsetHeight - 10;
  let left = rect.left;

  // Flip if too high
  if (top < 10) top = rect.bottom + 10;
  // Clamp right edge
  const tW = 260;
  if (left + tW > window.innerWidth - 10) left = window.innerWidth - tW - 10;

  tooltip.style.top  = `${top + window.scrollY}px`;
  tooltip.style.left = `${left}px`;
  tooltip.classList.add('visible');

  // Hide on outside click
  setTimeout(() => {
    document.addEventListener('click', hideTooltip, { once: true });
  }, 0);
}
function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ── QUICK PROMPTS ─────────────────────
function sendQuick(btn) {
  const prompts = {
    'Teach me a phrase':  `Teach me a useful everyday phrase in ${settings.lang} for a ${settings.level} learner.`,
    'Cultural insight':   `Share a fascinating cultural fact or insight about ${settings.lang}-speaking countries.`,
    'Tell me a story':    `Start a short immersive story in ${settings.lang} where I'm the main character. Keep it ${settings.level} level.`,
    'Grammar tip':        `Give me one essential ${settings.lang} grammar tip that's commonly misunderstood by ${settings.level} learners.`,
    'Test my level':      `Give me a short quiz — 3 questions — to test my ${settings.lang} ${settings.level} knowledge. Then evaluate my answers.`,
  };
  const text = prompts[btn.textContent] || btn.textContent;
  msgInput.value = text;
  sendMessage();
}

// ── VOICE INPUT ───────────────────────
function toggleMic() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
    return;
  }

  if (isRecording) {
    recognition && recognition.stop();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US'; // Could be made dynamic
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.textContent = '⏹️';
  };

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('');
    msgInput.value = transcript;
    autoResize(msgInput);
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.textContent = '🎙️';
    if (msgInput.value.trim()) sendMessage();
  };

  recognition.onerror = (e) => {
    console.warn('Speech error:', e.error);
    recognition.stop();
  };

  recognition.start();
}

// ── DAILY CHALLENGE ───────────────────
async function loadDailyItems() {
  const container = document.getElementById('dailyItems');

  // Check cache (refresh once per day)
  const cacheKey  = `lv_daily_${settings.lang}_${new Date().toDateString()}`;
  const cached    = localStorage.getItem(cacheKey);
  if (cached) {
    container.innerHTML = cached;
    return;
  }

  if (!settings.apiKey) {
    container.innerHTML = '<div class="daily-loading">Add your API key to unlock daily challenges.</div>';
    return;
  }

  container.innerHTML = '<div class="daily-loading">✦ Generating today\'s challenges…</div>';

  const prompt = `Generate a "Daily Language Snapshot" for a ${settings.level} ${settings.lang} learner. Return ONLY a JSON array with exactly 4 objects, each with fields: type ("word"|"phrase"|"culture"|"grammar"), title (${settings.lang} content), romanization (if non-Latin, else ""), meaning (English translation/explanation), fun_fact (one interesting sentence).`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${settings.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
      }),
    });

    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Strip markdown fences if present
    raw = raw.replace(/```json|```/g, '').trim();

    const items = JSON.parse(raw);
    const tagClass = { word: 'tag-word', phrase: 'tag-phrase', culture: 'tag-culture', grammar: 'tag-grammar' };
    const tagLabel = { word: '📖 Word', phrase: '💬 Phrase', culture: '🌏 Culture', grammar: '📚 Grammar' };

    const html = items.map(item => `
      <div class="daily-item">
        <div class="daily-item-tag ${tagClass[item.type] || 'tag-word'}">${tagLabel[item.type] || '📖 Word'}</div>
        <h4>${item.title}${item.romanization ? ` <span style="font-size:0.75rem;color:var(--teal);font-family:var(--font-mono)">(${item.romanization})</span>` : ''}</h4>
        <p><strong>${item.meaning}</strong></p>
        <p style="margin-top:6px;font-size:0.78rem">${item.fun_fact}</p>
      </div>
    `).join('');

    container.innerHTML = html;
    localStorage.setItem(cacheKey, html);

  } catch (err) {
    container.innerHTML = '<div class="daily-loading">Couldn\'t load daily items. Check your API key.</div>';
  }
}

// ── PANELS ────────────────────────────
function openDailyPanel() {
  document.getElementById('dailyPanel').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}
function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('overlay').classList.add('active');
}
function closePanels() {
  document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
  document.getElementById('overlay').classList.remove('active');
}

// ── CLEAR CHAT ────────────────────────
function clearChat() {
  if (!confirm('Clear all chat history?')) return;
  chatHistory = [];
  chatBody.innerHTML = '';
  closePanels();
  setTimeout(showWelcome, 300);
}

// ── TEXTAREA AUTO-RESIZE ──────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── KEY HANDLER ───────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── HELPERS ───────────────────────────
function scrollToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
