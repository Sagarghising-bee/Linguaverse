/* ═══════════════════════════════════
   reveal.js — LinguaVerse
   Scroll-triggered reveal animations
═══════════════════════════════════ */

(function () {
  function reveal() {
    document.querySelectorAll('.reveal').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 40) {
        el.classList.add('visible');
      }
    });
  }

  // Initial trigger
  setTimeout(reveal, 80);
  window.addEventListener('scroll', reveal, { passive: true });
})();
