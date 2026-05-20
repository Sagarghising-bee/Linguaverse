/* ═══════════════════════════════
   setup.js — LinguaVerse
═══════════════════════════════ */

let currentStep  = 1;
let selectedLang  = null;
let selectedLevel = 'Beginner';
let selectedMode  = 'Conversation';

// Language selection
document.querySelectorAll('.lang-pick').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-pick').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedLang = btn.dataset.lang;
  });
});

// Level selection
document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedLevel = btn.dataset.level;
  });
});

// Mode selection
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode = btn.dataset.mode;
  });
});

function nextStep(from) {
  if (from === 1) {
    const key = document.getElementById('apiKey').value.trim();
    if (!key) { shakeInput('apiKey'); return; }
    localStorage.setItem('lv_apiKey', key);
  }
  if (from === 2) {
    if (!selectedLang) { alert('Please pick a language first!'); return; }
    localStorage.setItem('lv_lang', selectedLang);
  }

  const current = document.getElementById(`step${from}`);
  const next    = document.getElementById(`step${from + 1}`);
  current.style.opacity   = '0';
  current.style.transform = 'translateX(-20px)';
  setTimeout(() => {
    current.classList.remove('active');
    current.style.opacity = current.style.transform = '';
    next.classList.add('active');
  }, 200);
  currentStep = from + 1;
  updateStepIndicator();
}

function finishSetup() {
  const name = document.getElementById('userName').value.trim();
  localStorage.setItem('lv_level', selectedLevel);
  localStorage.setItem('lv_mode',  selectedMode);
  if (name) localStorage.setItem('lv_name', name);

  const card = document.querySelector('.setup-card');
  card.style.transition = 'all 0.4s ease';
  card.style.opacity    = '0';
  card.style.transform  = 'translateY(-20px) scale(0.97)';

  // Correct path — setup.html is inside pages/, chat.html is also inside pages/
  setTimeout(() => { window.location.href = '../pages/chat.html'; }, 400);
}

function updateStepIndicator() {
  document.querySelectorAll('.step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (n === currentStep) s.classList.add('active');
    if (n <  currentStep)  s.classList.add('done');
  });
}

function toggleKey() {
  const input = document.getElementById('apiKey');
  input.type  = input.type === 'password' ? 'text' : 'password';
}

function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.animation   = 'none';
  el.offsetHeight;
  el.style.animation   = 'shake 0.4s ease';
  el.style.borderColor = 'var(--neon-pink)';
  setTimeout(() => { el.style.borderColor = el.style.animation = ''; }, 1000);
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
`;
document.head.appendChild(shakeStyle);

// Pre-fill saved values
window.addEventListener('DOMContentLoaded', () => {
  const savedKey  = localStorage.getItem('lv_apiKey');
  const savedLang = localStorage.getItem('lv_lang');
  if (savedKey)  document.getElementById('apiKey').value = savedKey;
  if (savedLang) {
    document.querySelectorAll('.lang-pick').forEach(btn => {
      if (btn.dataset.lang === savedLang) { btn.classList.add('selected'); selectedLang = savedLang; }
    });
  }
});

