(() => {
  'use strict';

  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let stars = [];
  let width = 0;
  let height = 0;
  let last = 0;
  let raf = 0;

  function createStars() {
    const target = Math.round((width * height) / 14000);
    const count = Math.min(170, Math.max(55, target));

    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.88 ? 1 : 2,
      speed: 2 + Math.random() * 9,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.5 + Math.random() * 1.9,
      tint: Math.random() < 0.14 ? '#a9c8ff' : '#ffffff',
    }));
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const seconds = time / 1000;

    for (const star of stars) {
      ctx.globalAlpha = 0.22 + 0.58 * Math.abs(Math.sin(seconds * star.twinkle + star.phase));
      ctx.fillStyle = star.tint;
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }

    ctx.globalAlpha = 1;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createStars();

    if (reduceMotion) draw(performance.now());
  }

  function loop(now) {
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    for (const star of stars) {
      star.y += star.speed * dt;
      if (star.y > height + 2) {
        star.y = -2;
        star.x = Math.random() * width;
      }
    }

    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    resize();
    if (reduceMotion) return;
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', start);
  document.addEventListener('visibilitychange', () => {
    if (reduceMotion) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  });

  const cards = Array.from(document.querySelectorAll('[data-game]'));
  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const index = Number(event.key) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= cards.length) return;

    const card = cards[index];
    if (!card) return;

    event.preventDefault();
    window.location.href = card.getAttribute('href');
  });

  start();
})();
