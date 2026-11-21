(function () {
  'use strict';

  /* =========================================================
     Configuración
     ========================================================= */
  const COLS = 24;
  const ROWS = 24;
  const CELL = 25;
  const W = COLS * CELL;
  const H = ROWS * CELL;

  const BOOST_MS   = 5000;   // duración del turbo de la manzana azul
  const BONUS_LIFE = 9500;   // tiempo que permanece una manzana especial
  const BOOST_MULT = 1.75;   // multiplicador de velocidad durante el turbo

  const RED_GROWTH  = 1;
  const GOLD_GROWTH = 2;     // "el doble"

  const PTS = { red: 10, blue: 15, gold: 30 };

  const TAU = Math.PI * 2;

  /* =========================================================
     Canvas y elementos
     ========================================================= */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = W * DPR;
  canvas.height = H * DPR;

  const el = {
    score: document.getElementById('scoreEl'),
    best: document.getElementById('bestEl'),
    len: document.getElementById('lenEl'),
    speed: document.getElementById('speedEl'),
    overlay: document.getElementById('overlay'),
    boostPill: document.getElementById('boostPill'),
    boostBar: document.getElementById('boostBar'),
    boostTime: document.getElementById('boostTime'),
    sound: document.getElementById('soundBtn'),
    pause: document.getElementById('pauseBtn')
  };

  /* =========================================================
     Estado
     ========================================================= */
  const STATE = { START: 'start', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' };

  let state = STATE.START;

  let snake, dir, inputQueue, growth, score, best, redApple, bonuses, particles;
  let stepTimer, boostMs, shake, flash, overAt, deathReason;

  let muted = false;
  let hudCache = {};

  /* Monetización compartida. Este juego es un IIFE, así que se carga en dinámico. */
  let monetization = null;
  let rewards = null;
  let rewardsUI = null;

  best = loadBest();

  /* =========================================================
     Utilidades
     ========================================================= */
  const key  = (x, y) => y * COLS + x;
  const cellX = x => x * CELL + CELL / 2;
  const cellY = y => y * CELL + CELL / 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loadBest() {
    try { return parseInt(localStorage.getItem('serpientePoderesBest') || '0', 10) || 0; }
    catch (e) { return 0; }
  }

  function saveBest(v) {
    try { localStorage.setItem('serpientePoderesBest', String(v)); } catch (e) { /* modo privado */ }
  }

  /* =========================================================
     Sonido (WebAudio, sin archivos externos)
     ========================================================= */
  let audio = null;

  function getAudio() {
    if (muted) return null;
    try {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audio = new AC();
      }
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch (e) {
      return null;
    }
  }

  function playTone(freq, dur, type, vol, slideTo, delay) {
    const ac = getAudio();
    if (!ac) return;
    const t0 = ac.currentTime + (delay || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function sfx(kind) {
    if (muted) return;
    switch (kind) {
      case 'red':
        playTone(620, 0.11, 'triangle', 0.07, 900);
        break;
      case 'blue':
        playTone(380, 0.26, 'sine', 0.07, 1180);
        playTone(760, 0.22, 'sine', 0.035, 1560, 0.02);
        break;
      case 'gold':
        playTone(880, 0.12, 'triangle', 0.06);
        playTone(1174, 0.12, 'triangle', 0.055, null, 0.07);
        playTone(1568, 0.20, 'triangle', 0.05, null, 0.14);
        break;
      case 'over':
        playTone(340, 0.55, 'sawtooth', 0.07, 80);
        break;
      case 'reward':
        playTone(660, 0.12, 'sine', 0.05, 990);
        playTone(990, 0.16, 'sine', 0.04, 1320, 0.1);
        break;
      case 'UI':
        playTone(520, 0.07, 'sine', 0.04, 700);
        break;
    }
  }

  /* =========================================================
     Lógica del juego
     ========================================================= */
  function reset() {
    snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 }
    ];
    dir = { x: 1, y: 0 };
    inputQueue = [];
    growth = 0;
    score = 0;
    bonuses = [];
    particles = [];
    stepTimer = 0;
    boostMs = 0;
    shake = 0;
    flash = 0;
    deathReason = '';
    redApple = null;
    redApple = spawnCell();
    hudCache = {};
  }

  /* =========================================================
     Anuncios simulados y recompensas (módulo compartido)
     ========================================================= */
  function initRewards() {
    if (!monetization || rewardsUI) return;

    const { REWARDS, RewardManager } = monetization;
    rewards = new RewardManager();
    rewardsUI = window.PlaykoraRewardsUI.mount({
      host: '#pkAdHost',
      bonusLabel: 'Turbo de 5 s',
      canLife: () => state === STATE.OVER,
      canBonus: () => state === STATE.PLAYING,
      onLife: () => claimLife(REWARDS.LIFE),
      onBonus: () => claimTurbo(REWARDS.BONUS),
      refresh: syncRewardUi,
    });
    syncRewardUi();
  }

  function syncRewardUi() {
    if (!rewardsUI || !rewards) return;
    rewardsUI.update({ livesLeft: rewards.livesLeft, bonusLeft: rewards.bonusLeft });
  }

  function resetRewards() {
    if (!rewards || !rewardsUI) return;
    rewards.reset();
    rewardsUI.reset();
    syncRewardUi();
  }

  function claimLife(type) {
    if (state !== STATE.OVER) {
      rewardsUI.setStatus('La segunda oportunidad se usa al perder.');
      return false;
    }
    const claim = rewards.claim(type);
    if (!claim.ok) {
      rewardsUI.setStatus(claim.reason === 'limite' ? 'Ya usaste las 2 vidas extra.' : 'Anuncio no completado.');
      return false;
    }
    if (!reviveWithLife()) {
      rewards.rollback(type);
      return false;
    }
    syncRewardUi();
    rewardsUI.setStatus('¡Segunda oportunidad conseguida!');
    return true;
  }

  function claimTurbo(type) {
    if (state !== STATE.PLAYING) {
      rewardsUI.setStatus('El turbo se usa durante la partida.');
      return false;
    }
    const claim = rewards.claim(type);
    if (!claim.ok) {
      rewardsUI.setStatus(claim.reason === 'limite' ? 'Recompensa ya usada.' : 'Anuncio no completado.');
      return false;
    }
    boostMs = BOOST_MS;
    sfx('reward');
    syncRewardUi();
    rewardsUI.setStatus('¡Turbo de 5 s conseguido!');
    return true;
  }

  function reviveWithLife() {
    if (state !== STATE.OVER) return false;
    snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 }
    ];
    dir = { x: 1, y: 0 };
    inputQueue = [];
    growth = 0;
    stepTimer = 0;
    boostMs = BOOST_MS;
    shake = 0;
    flash = 0;
    state = STATE.PLAYING;
    hideOverlay();
    sfx('reward');
    return true;
  }

  function spawnCell() {
    const taken = new Set();
    for (const s of snake) taken.add(key(s.x, s.y));
    if (redApple) taken.add(key(redApple.x, redApple.y));
    for (const b of bonuses) taken.add(key(b.x, b.y));

    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!taken.has(key(x, y))) free.push({ x, y });
      }
    }
    if (!free.length) return null;
    return free[(Math.random() * free.length) | 0];
  }

  function baseInterval() {
    return Math.max(78, 145 - score * 0.55);
  }

  function currentInterval() {
    const base = baseInterval();
    return boostMs > 0 ? base / BOOST_MULT : base;
  }

  function step() {
    if (inputQueue.length) {
      const nd = inputQueue.shift();
      if (nd.x !== -dir.x || nd.y !== -dir.y) dir = nd;
    }

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // paredes
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      die('warm');
      return;
    }

    // colisión con el propio cuerpo (la cola se libera si no estamos creciendo)
    const limit = growth > 0 ? snake.length : snake.length - 1;
    for (let i = 0; i < limit; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        die('cold');
        return;
      }
    }

    snake.unshift(head);

    // manzanas especiales
    for (let i = bonuses.length - 1; i >= 0; i--) {
      if (bonuses[i].x === head.x && bonuses[i].y === head.y) {
        eatBonus(bonuses[i]);
        bonuses.splice(i, 1);
      }
    }

    // manzana roja
    if (redApple && head.x === redApple.x && head.y === redApple.y) {
      eatRed();
    }

    if (growth > 0) growth--;
    else snake.pop();
  }

  function eatRed() {
    score += PTS.red;
    growth += RED_GROWTH;
    burst(cellX(redApple.x), cellY(redApple.y), ['#ff6b78', '#ff4d5e', '#ffd0d4'], 14, 150);
    sfx('red');
    redApple = null;
    maybeSpawnBonus();
    redApple = spawnCell();
  }

  function maybeSpawnBonus() {
    if (bonuses.length >= 2) return;
    if (Math.random() > 0.42) return;
    const spot = spawnCell();
    if (!spot) return;
    bonuses.push({
      x: spot.x,
      y: spot.y,
      type: Math.random() < 0.62 ? 'blue' : 'gold',
      life: BONUS_LIFE,
      maxLife: BONUS_LIFE
    });
  }

  function eatBonus(b) {
    if (b.type === 'blue') {
      score += PTS.blue;
      growth += 1;
      boostMs = BOOST_MS;
      burst(cellX(b.x), cellY(b.y), ['#8fe3ff', '#4dc3ff', '#d6f4ff'], 18, 190);
      sfx('blue');
    } else {
      score += PTS.gold;
      growth += GOLD_GROWTH;
      shake = Math.max(shake, 7);
      flash = 0.5;
      burst(cellX(b.x), cellY(b.y), ['#ffe58a', '#ffcf4d', '#fff6cf'], 24, 220);
      sfx('gold');
    }
  }

  function die(reason) {
    deathReason = reason;
    state = STATE.OVER;
    overAt = performance.now();
    shake = 11;
    if (score > best) {
      best = score;
      saveBest(best);
    }
    sfx('over');
    if (monetization) {
      monetization.onGameOver({ score, best, reason, length: snake.length });
    }
    showOverlay('over');
    syncRewardUi();
  }

  function startGame() {
    reset();
    resetRewards();
    state = STATE.PLAYING;
    hideOverlay();
    el.pause.innerHTML = '&#10074;&#10074;';
    sfx('UI');
    syncRewardUi();
  }

  function togglePause() {
    if (state === STATE.PLAYING) {
      state = STATE.PAUSED;
      showOverlay('paused');
      el.pause.innerHTML = '&#9654;';
      sfx('UI');
    } else if (state === STATE.PAUSED) {
      state = STATE.PLAYING;
      hideOverlay();
      el.pause.innerHTML = '&#10074;&#10074;';
      sfx('UI');
    }
  }

  /* =========================================================
     Entrada
     ========================================================= */
  function queueDir(x, y) {
    if (state === STATE.START) {
      startGame();
    }
    if (state !== STATE.PLAYING) return;

    const ref = inputQueue.length ? inputQueue[inputQueue.length - 1] : dir;
    if (ref.x === -x && ref.y === -y) return;   // no se puede girar 180°
    if (ref.x === x && ref.y === y) return;     // misma dirección: ignorar
    if (inputQueue.length < 2) inputQueue.push({ x: x, y: y });
  }

  const KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
  };

  window.addEventListener('keydown', function (e) {
    const k = e.key;

    if (k === ' ' || k === 'Spacebar') e.preventDefault();

    if (KEYS[k]) {
      e.preventDefault();
      const [x, y] = KEYS[k];
      queueDir(x, y);
      return;
    }

    if (k === ' ' || k === 'Spacebar' || k === 'Enter') {
      if (state === STATE.START) {
        startGame();
      } else if (state === STATE.OVER) {
        if (performance.now() - overAt > 350) startGame();
      } else {
        togglePause();
      }
      return;
    }

    if (k === 'p' || k === 'P') { togglePause(); return; }

    if (k === 'r' || k === 'R') {
      if (state === STATE.PLAYING || state === STATE.PAUSED) startGame();
      return;
    }

    if (k === 'm' || k === 'M') { toggleSound(); }
  });

  // gestos táctiles
  let touchStart = null;

  canvas.addEventListener('touchstart', function (e) {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;

    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) {
      if (state === STATE.PLAYING || state === STATE.PAUSED) togglePause();
      else if (state === STATE.START) startGame();
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 1 : -1, 0);
    else queueDir(0, dy > 0 ? 1 : -1);
  }, { passive: true });

  // pausa automática al cambiar de ventana
  window.addEventListener('blur', function () {
    if (state === STATE.PLAYING) togglePause();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === STATE.PLAYING) togglePause();
  });

  /* =========================================================
     Partículas
     ========================================================= */
  function burst(x, y, colors, count, power) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = rand(power * 0.25, power);
      const life = rand(380, 780);
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: life,
        maxLife: life,
        size: rand(1.6, 3.8),
        color: colors[(Math.random() * colors.length) | 0],
        square: Math.random() < 0.3
      });
    }
    if (particles.length > 400) particles.splice(0, particles.length - 400);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt * 1000;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      p.vx *= 0.985;
    }
  }

  /* =========================================================
     Actualización
     ========================================================= */
  function update(dt) {
    updateParticles(dt);

    shake = Math.max(0, shake - dt * 26);
    flash = Math.max(0, flash - dt * 2.4);

    if (state !== STATE.PLAYING) return;

    if (boostMs > 0) boostMs = Math.max(0, boostMs - dt * 1000);

    for (let i = bonuses.length - 1; i >= 0; i--) {
      const b = bonuses[i];
      b.life -= dt * 1000;
      if (b.life <= 0) {
        burst(cellX(b.x), cellY(b.y), b.type === 'blue' ? ['#4dc3ff', '#2b7fa8'] : ['#ffcf4d', '#a8801d'], 7, 90);
        bonuses.splice(i, 1);
      }
    }

    stepTimer += dt * 1000;
    let guard = 0;

    while (state === STATE.PLAYING && stepTimer >= currentInterval()) {
      stepTimer -= currentInterval();
      step();
      if (++guard > 6) { stepTimer = 0; break; }
    }
  }

  /* =========================================================
     Dibujo
     ========================================================= */
  const PALETTES = {
    red:  { hi: '#ff9aa4', mid: '#ff4d5e', lo: '#b81f36', glow: 'rgba(255,77,94,.85)' },
    blue: { hi: '#a5ebff', mid: '#4dc3ff', lo: '#1b74b8', glow: 'rgba(77,195,255,.9)' },
    gold: { hi: '#fff3b8', mid: '#ffcf4d', lo: '#b8860b', glow: 'rgba(255,207,77,.9)' }
  };

  function drawFruit(cx, cy, radius, kind, now) {
    const pal = PALETTES[kind];
    const pulse = 1 + Math.sin(now / 260 + (kind === 'gold' ? 1.4 : 0)) * 0.045;
    const r = radius * pulse;

    // halo
    ctx.save();
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = kind === 'gold' ? 26 : 18;

    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.12, cx, cy, r * 1.05);
    g.addColorStop(0, pal.hi);
    g.addColorStop(0.55, pal.mid);
    g.addColorStop(1, pal.lo);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.restore();

    // brillo
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.34, cy - r * 0.38, r * 0.26, r * 0.16, -0.7, 0, TAU);
    ctx.fill();

    // rabito
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.78);
    ctx.quadraticCurveTo(cx + 1, cy - r * 1.12, cx + 3.2, cy - r * 1.3);
    ctx.stroke();

    // hoja
    ctx.fillStyle = '#4fd17a';
    ctx.beginPath();
    ctx.ellipse(cx + 6.2, cy - r * 1.12, 5, 2.5, -0.5, 0, TAU);
    ctx.fill();

    // marca del rayo en la azul
    if (kind === 'blue') {
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.beginPath();
      ctx.moveTo(cx + 1.2, cy - r * 0.55);
      ctx.lineTo(cx - r * 0.42, cy + r * 0.14);
      ctx.lineTo(cx - r * 0.02, cy + r * 0.14);
      ctx.lineTo(cx - r * 0.22, cy + r * 0.62);
      ctx.lineTo(cx + r * 0.46, cy - r * 0.16);
      ctx.lineTo(cx + r * 0.04, cy - r * 0.16);
      ctx.closePath();
      ctx.fill();
    }

    // destellos dorados
    if (kind === 'gold') {
      const spin = now / 420;
      for (let i = 0; i < 3; i++) {
        const a = spin + i * (TAU / 3);
        const sx = cx + Math.cos(a) * (r + 7);
        const sy = cy + Math.sin(a) * (r + 7);
        const s = 1 + Math.sin(now / 180 + i) * 0.35;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = 'rgba(255,246,207,.9)';
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          const ang = j * Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * 4 * s, Math.sin(ang) * 4 * s);
          ctx.lineTo(Math.cos(ang + Math.PI / 4) * 1.3, Math.sin(ang + Math.PI / 4) * 1.3);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawSnake(now) {
    const n = snake.length;
    const boosted = boostMs > 0;

    // aura cuando hay turbo
    if (boosted) {
      ctx.save();
      ctx.shadowColor = 'rgba(77,195,255,.85)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(77,195,255,.11)';
      for (const s of snake) {
        roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 8);
        ctx.fill();
      }
      ctx.restore();
    }

    for (let i = n - 1; i >= 0; i--) {
      const s = snake[i];
      const t = n > 1 ? i / (n - 1) : 0;

      const pad = 1.5 + t * 1.3;
      const x = s.x * CELL + pad;
      const y = s.y * CELL + pad;
      const size = CELL - pad * 2;
      const radius = 8.5 - t * 3.2;

      const hue = lerp(152, 172, t);
      const sat = lerp(88, 62, t);
      const light = lerp(63, 30, t);

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = 'rgba(70,240,138,.75)';
        ctx.shadowBlur = boosted ? 22 : 14;
      } else if (i < 4) {
        ctx.shadowColor = 'rgba(70,240,138,.35)';
        ctx.shadowBlur = 8;
      }

      const grad = ctx.createLinearGradient(x, y, x + size, y + size);
      grad.addColorStop(0, 'hsl(' + hue + ',' + sat + '%,' + (light + 9) + '%)');
      grad.addColorStop(1, 'hsl(' + hue + ',' + sat + '%,' + (light - 4) + '%)');

      ctx.fillStyle = grad;
      roundRect(x, y, size, size, radius);
      ctx.fill();
      ctx.restore();

      // brillo interno
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      roundRect(x + size * 0.18, y + size * 0.14, size * 0.64, size * 0.28, radius * 0.6);
      ctx.fill();
    }

    // ojos de la cabeza
    const head = snake[0];
    const hx = cellX(head.x);
    const hy = cellY(head.y);
    const ox = dir.x * 4.6;
    const oy = dir.y * 4.6;
    const px = -dir.y * 4.6;
    const py = dir.x * 4.6;

    for (const sign of [1, -1]) {
      const ex = hx + ox + px * sign;
      const ey = hy + oy + py * sign;

      ctx.fillStyle = '#f4fffb';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.7, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#0a2018';
      ctx.beginPath();
      ctx.arc(ex + dir.x * 0.9, ey + dir.y * 0.9, 1.35, 0, TAU);
      ctx.fill();
    }

    // lengüita ocasional
    if (Math.sin(now / 320) > 0.86) {
      const tipX = hx + dir.x * 15;
      const tipY = hy + dir.y * 15;
      ctx.strokeStyle = '#ff6b8a';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + dir.x * 10, hy + dir.y * 10);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.square) {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function render(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // fondo
    const bg = ctx.createRadialGradient(W / 2, H * 0.44, 50, W / 2, H / 2, W * 0.86);
    bg.addColorStop(0, '#0b1a23');
    bg.addColorStop(1, '#04090c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // rejilla
    ctx.strokeStyle = 'rgba(140,220,200,.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
    }
    ctx.stroke();

    // sacudida
    ctx.save();
    if (shake > 0.3) {
      ctx.translate(rand(-shake, shake) * 0.7, rand(-shake, shake) * 0.7);
    }

    // manzana roja
    if (redApple) drawFruit(cellX(redApple.x), cellY(redApple.y), CELL * 0.37, 'red', now);

    // manzanas especiales
    for (const b of bonuses) {
      const cx = cellX(b.x);
      const cy = cellY(b.y);
      const r = CELL * 0.37;

      // anillo de tiempo restante
      const frac = clamp(b.life / b.maxLife, 0, 1);
      const blink = b.life < 2200 && Math.floor(now / 160) % 2 === 0;

      if (!blink) drawFruit(cx, cy, r, b.type, now);

      ctx.save();
      ctx.globalAlpha = blink ? 0.35 : 0.9;
      ctx.strokeStyle = b.type === 'blue' ? 'rgba(77,195,255,.85)' : 'rgba(255,207,77,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
      ctx.restore();
    }

    drawSnake(now);
    drawParticles();

    ctx.restore();

    // viñeta
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.34, W / 2, H / 2, W * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // destello dorado
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,240,190,' + (flash * 0.35) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* =========================================================
     HUD
     ========================================================= */
  function setText(node, value, bucket) {
    if (hudCache[bucket] === value) return;
    hudCache[bucket] = value;
    node.textContent = value;
  }

  function syncHud() {
    setText(el.score, String(score), 'score');
    setText(el.best, String(best), 'best');
    setText(el.len, String(snake.length), 'len');

    if (boostMs > 0) {
      setText(el.speed, BOOST_MULT.toFixed(1) + '\u00D7', 'speed');
      if (!el.speed.classList.contains('boost')) el.speed.classList.add('boost');

      el.boostPill.classList.add('on');
      el.boostBar.style.width = (boostMs / BOOST_MS * 100) + '%';
      el.boostTime.textContent = (boostMs / 1000).toFixed(1) + 's';
    } else {
      setText(el.speed, '1.0\u00D7', 'speed');
      el.speed.classList.remove('boost');
      el.boostPill.classList.remove('on');
    }
  }

  /* =========================================================
     Overlays (pantallas)
     ========================================================= */
  function showOverlay(kind) {
    let html = '';

    if (kind === 'start') {
      html =
        '<p class="ov-kicker">Listo para jugar</p>' +
        '<h2>Serpiente de Poderes</h2>' +
        '<p class="ov-text">Come manzanas rojas para crecer. Atrapa las azules y las doradas antes de que desaparezcan.</p>' +
        '<ul class="ov-legend">' +
          '<li><i class="dot red"></i>Roja: +1</li>' +
          '<li><i class="dot blue"></i>Azul: +1 y turbo 5 s</li>' +
          '<li><i class="dot gold"></i>Dorada: +2</li>' +
        '</ul>' +
        '<button class="btn" data-action="start">Empezar</button>' +
        '<p class="ov-hint"><kbd>&larr;</kbd><kbd>&uarr;</kbd><kbd>&darr;</kbd><kbd>&rarr;</kbd> o <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> para moverte · <kbd>Espacio</kbd> pausa</p>';
    } else if (kind === 'paused') {
      html =
        '<p class="ov-kicker">En pausa</p>' +
        '<h2>Respira un momento</h2>' +
        '<p class="ov-text">Pulsa <b>Espacio</b> o el botón para seguir jugando.</p>' +
        '<button class="btn" data-action="resume">Continuar</button>';
    } else {
      const isBest = score > 0 && score >= best;
      html =
        '<p class="ov-kicker">Fin del juego</p>' +
        '<h2>' + (deathReason === 'warm' ? '\u00A1Choque contra el muro!' : '\u00A1Te mordiste!') + '</h2>' +
        '<div class="recap">' +
          '<div><span>Puntos</span><span class="' + (isBest ? 'new-best' : '') + '">' + score + '</span></div>' +
          '<div><span>Récord</span><span>' + best + '</span></div>' +
          '<div><span>Largo</span><span>' + snake.length + '</span></div>' +
        '</div>' +
        '<p class="ov-text">' + (isBest ? '\u00A1Nuevo récord! ' : '') + 'Las doradas valen 30 puntos y crecen el doble.</p>' +
        '<button class="btn" data-action="start">Jugar de nuevo</button>' +
        '<button class="btn" type="button" data-action="reward-life">Segunda oportunidad (anuncio)</button>' +
        '<p class="ov-hint"><kbd>Espacio</kbd> o <kbd>R</kbd> para reiniciar</p>';
    }

    el.overlay.innerHTML = html;
    el.overlay.classList.add('show');
  }

  function hideOverlay() {
    el.overlay.classList.remove('show');
    el.overlay.innerHTML = '';
  }

  el.overlay.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    btn.blur();
    const action = btn.dataset.action;
    if (action === 'start') startGame();
    else if (action === 'resume') togglePause();
    else if (action === 'reward-life' && monetization) claimLife(monetization.REWARDS.LIFE);
  });

  /* =========================================================
     Botones
     ========================================================= */
  function toggleSound() {
    muted = !muted;
    el.sound.innerHTML = muted ? '&#128263;' : '&#128266;';
    el.sound.title = muted ? 'Activar sonido (M)' : 'Silenciar (M)';
    if (!muted) sfx('UI');
  }

  el.sound.addEventListener('click', function () {
    toggleSound();
    el.sound.blur();
  });

  el.pause.addEventListener('click', function () {
    togglePause();
    el.pause.blur();
  });

  /* =========================================================
     Bucle principal
     ========================================================= */
  let last = performance.now();

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    update(dt);
    render(now);
    syncHud();

    requestAnimationFrame(loop);
  }

  /* =========================================================
     Arranque
     ========================================================= */
  reset();
  showOverlay('start');
  requestAnimationFrame(loop);

  import('../../../js/monetization.js')
    .then((module) => {
      monetization = module;
      initRewards();
    })
    .catch(() => {
      /* Si el módulo no carga, los juegos siguen funcionando sin recompensas. */
    });
})();
