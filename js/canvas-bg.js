/* ═══════════════════════════════════
   canvas-bg.js — LinguaVerse
   Animated particle constellation background
═══════════════════════════════════ */

(function () {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  const CONFIG = {
    count: 70,
    maxDist: 140,
    speed: 0.35,
    baseRadius: 1.5,
    colors: ['#9b7fe8', '#38d9c0', '#d4a853', '#f87b8e'],
  };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function initParticles() {
    particles = Array.from({ length: CONFIG.count }, () => ({
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  randBetween(-CONFIG.speed, CONFIG.speed),
      vy:  randBetween(-CONFIG.speed, CONFIG.speed),
      r:   randBetween(0.6, CONFIG.baseRadius),
      color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
      pulse: Math.random() * Math.PI * 2,
    }));
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Update + draw particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;

      // Bounce off edges
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      const pulsedR = p.r + Math.sin(p.pulse) * 0.4;

      // Glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulsedR * 4);
      grd.addColorStop(0, `rgba(${hexToRgb(p.color)},0.8)`);
      grd.addColorStop(1, `rgba(${hexToRgb(p.color)},0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, pulsedR * 4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulsedR, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.maxDist) {
          const alpha = (1 - dist / CONFIG.maxDist) * 0.18;

          // Color-blend the line between the two particle colors
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `rgba(${hexToRgb(a.color)},${alpha})`);
          grad.addColorStop(1, `rgba(${hexToRgb(b.color)},${alpha})`);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    initParticles();
    draw();
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    initParticles();
    draw();
  });

  // Mouse interaction — attract nearby particles
  window.addEventListener('mousemove', (e) => {
    particles && particles.forEach(p => {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        p.vx += dx * 0.00015;
        p.vy += dy * 0.00015;
        // Clamp speed
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > CONFIG.speed * 2.5) {
          p.vx = (p.vx / spd) * CONFIG.speed * 2.5;
          p.vy = (p.vy / spd) * CONFIG.speed * 2.5;
        }
      }
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
