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

  const FEVER_MS       = 8000;   // fiebre de puntos: manzanas normales x2 y 3 a la vez
  const GHOST_MS       = 6000;   // atraviesa cuerpo y bordes
  const MAGNET_MS      = 8000;   // atrae manzanas cercanas
  const ICE_MS         = 7000;   // velocidad x0,65
  const TURBO_MS       = 5000;   // velocidad x2 y comida x3
  const REVERSE_MS     = 4000;   // controles invertidos
  const BOMB_MS        = 9000;   // obstáculo temporal
  const TIMED_MS       = 6000;   // manzana que parpadea y vale más cuanto antes se come
  const REVIVE_GHOST_MS = 3000;  // fantasma al usar el anuncio de segunda oportunidad
  const BONUS_MS       = 9500;   // tiempo en pantalla de las manzanas especiales
  const REVERSE_REWARD = 120;    // premio por sobrevivir a los controles invertidos
  const HIGH_SCORE_REVIVE = 250; // a partir de aquí se ofrece revivir al chocar
  const COMBO_WINDOW   = 3000;
  const COMBO_MAX      = 4;
  const FEVER_APPLES   = 3;

  const RED_GROWTH = 1;
  const PTS = {
    red: 10, gold: 35, ghost: 25, magnet: 25, ice: 25,
    lime: 20, turbo: 30, reverse: 15, timed: 0
  };

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
    combo: document.getElementById('comboEl'),
    overlay: document.getElementById('overlay'),
    boostPill: document.getElementById('boostPill'),
    boostLabel: document.querySelector('#boostPill .boost-label'),
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

  let snake, dir, inputQueue, growth, score, best, apples, bonuses, particles;
  let stepTimer, shake, flash, overAt, deathReason;
  let effects, combo, lastEatAt, reversePending;

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

  function sfx(kind, level) {
    if (muted) return;
    switch (kind) {
      case 'red':
        playTone(620, 0.11, 'triangle', 0.07, 900);
        break;
      case 'power':
        playTone(440, 0.16, 'sine', 0.06, 880);
        playTone(660, 0.18, 'triangle', 0.04, 1320, 0.05);
        break;
      case 'combo':
        playTone(520 + level * 190, 0.09, 'triangle', 0.05, 900 + level * 240);
        break;
      case 'bomb':
        playTone(180, 0.28, 'sawtooth', 0.08, 60);
        playTone(90, 0.36, 'square', 0.035, 40, 0.03);
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
    apples = [];
    bonuses = [];
    particles = [];
    stepTimer = 0;
    shake = 0;
    flash = 0;
    deathReason = '';
    effects = { fever: 0, ghost: 0, magnet: 0, ice: 0, turbo: 0, reverse: 0 };
    combo = 1;
    lastEatAt = 0;
    reversePending = false;
    const spot = spawnCell();
    if (spot) apples.push(spot);
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
      lifeLabel: 'Revivir + Fantasma 3 s',
      bonusLabel: 'Fantasma 3 s',
      canLife: () => state === STATE.OVER && score >= HIGH_SCORE_REVIVE,
      canBonus: () => state === STATE.PLAYING,
      onLife: () => claimLife(REWARDS.LIFE),
      onBonus: () => claimBonus(REWARDS.BONUS),
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
    if (score < HIGH_SCORE_REVIVE) {
      rewardsUI.setStatus('Revivir disponible desde ' + HIGH_SCORE_REVIVE + ' puntos.');
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

  function claimBonus(type) {
    if (state !== STATE.PLAYING) {
      rewardsUI.setStatus('El fantasma se usa durante la partida.');
      return false;
    }
    const claim = rewards.claim(type);
    if (!claim.ok) {
      rewardsUI.setStatus(claim.reason === 'limite' ? 'Recompensa ya usada.' : 'Anuncio no completado.');
      return false;
    }
    effects.ghost = Math.max(effects.ghost, REVIVE_GHOST_MS);
    sfx('power');
    syncRewardUi();
    rewardsUI.setStatus('¡Fantasma de 3 s conseguido!');
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
    combo = 1;
    lastEatAt = 0;
    effects.fever = 0;
    effects.magnet = 0;
    effects.ice = 0;
    effects.turbo = 0;
    effects.ghost = REVIVE_GHOST_MS;
    effects.reverse = 0;
    reversePending = false;
    apples = apples.filter((a) => !snake.some((s) => s.x === a.x && s.y === a.y));
    bonuses = bonuses.filter((b) => !snake.some((s) => s.x === b.x && s.y === b.y));
    syncApples();
    shake = 0;
    flash = 0;
    state = STATE.PLAYING;
    hideOverlay();
    sfx('power');
    return true;
  }

  const BONUS_COLORS = {
    gold:   ['#fff3b8', '#ffcf4d', '#b8860b'],
    ghost:  ['#dff6ff', '#8fe3ff', '#3aa7d8'],
    magnet: ['#e9d6ff', '#b879ff', '#6b3fb0'],
    ice:    ['#e8ffff', '#8ff2ff', '#39a9c9'],
    lime:   ['#f2ffd0', '#b6ef56', '#5e9b20'],
    turbo:  ['#ffd7a8', '#ff8a3d', '#b23b0b'],
    reverse:['#ffd0f2', '#ff5fb5', '#a01068'],
    timed:  ['#fff7d6', '#ffe38a', '#d19a1d'],
    bomb:   ['#5b5b68', '#24242e', '#0a0a10']
  };

  const BONUS_POOL = [
    ['gold', 12], ['ghost', 12], ['magnet', 10], ['ice', 10], ['lime', 10],
    ['turbo', 8], ['reverse', 7], ['timed', 12], ['bomb', 9]
  ];

  function spawnCell() {
    const taken = new Set();
    for (const s of snake) taken.add(key(s.x, s.y));
    for (const a of apples) taken.add(key(a.x, a.y));
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

  function syncApples() {
    const target = effects.fever > 0 ? FEVER_APPLES : 1;
    while (apples.length < target) {
      const spot = spawnCell();
      if (!spot) break;
      apples.push(spot);
    }
    while (apples.length > target) apples.pop();
  }

  function speedFactor() {
    let factor = 1;
    if (effects.turbo > 0) factor *= 2;
    if (effects.ice > 0) factor *= 0.65;
    return factor;
  }

  function baseInterval() {
    return Math.max(78, 145 - score * 0.55);
  }

  function currentInterval() {
    return Math.max(45, baseInterval() / speedFactor());
  }

  function registerEat(base, now, normal) {
    if (lastEatAt && now - lastEatAt <= COMBO_WINDOW) {
      combo = Math.min(COMBO_MAX, combo + 1);
    } else {
      combo = 1;
    }
    lastEatAt = now;

    let points = base * combo;
    if (normal && effects.fever > 0) points *= 2;
    if (effects.turbo > 0) points *= 3;
    points = Math.round(points);
    score += points;
    sfx('combo', combo);
    return points;
  }

  function trimTail(amount) {
    const available = Math.max(0, snake.length + growth - 3);
    const remove = Math.min(available, amount);
    if (remove <= 0) return;
    const fromSnake = Math.min(snake.length - 3, remove);
    if (fromSnake > 0) snake.splice(snake.length - fromSnake, fromSnake);
    growth = Math.max(0, growth - (remove - fromSnake));
  }

  function applyMagnet() {
    if (effects.magnet <= 0) return;
    const head = snake[0];
    const taken = new Set();
    for (const s of snake) taken.add(key(s.x, s.y));
    for (const a of apples) taken.add(key(a.x, a.y));
    for (const b of bonuses) taken.add(key(b.x, b.y));

    const fruits = apples.concat(bonuses.filter((b) => b.type !== 'bomb'));
    for (const fruit of fruits) {
      const dx = head.x - fruit.x;
      const dy = head.y - fruit.y;
      if ((!dx && !dy) || Math.abs(dx) + Math.abs(dy) > 4) continue;

      const moveX = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
      const moveY = moveX === 0 ? Math.sign(dy) : 0;
      const nx = fruit.x + moveX;
      const ny = fruit.y + moveY;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (taken.has(key(nx, ny))) continue;

      taken.delete(key(fruit.x, fruit.y));
      fruit.x = nx;
      fruit.y = ny;
      taken.add(key(nx, ny));
    }
  }

  function step() {
    if (inputQueue.length) {
      const nd = inputQueue.shift();
      if (nd.x !== -dir.x || nd.y !== -dir.y) dir = nd;
    }

    applyMagnet();

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (effects.ghost > 0) {
      head.x = (head.x + COLS) % COLS;
      head.y = (head.y + ROWS) % ROWS;
    } else {
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
        die('warm');
        return;
      }
      const limit = growth > 0 ? snake.length : snake.length - 1;
      for (let i = 0; i < limit; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          die('cold');
          return;
        }
      }
    }

    snake.unshift(head);

    for (let i = bonuses.length - 1; i >= 0; i--) {
      if (bonuses[i].x === head.x && bonuses[i].y === head.y) {
        const bonus = bonuses[i];
        bonuses.splice(i, 1);
        if (bonus.type === 'bomb') hitBomb(bonus);
        else eatBonus(bonus);
      }
    }

    for (let i = apples.length - 1; i >= 0; i--) {
      if (apples[i].x === head.x && apples[i].y === head.y) {
        const apple = apples[i];
        apples.splice(i, 1);
        eatApple(apple);
      }
    }

    if (growth > 0) growth--;
    else snake.pop();

    syncApples();
  }

  function eatApple(apple) {
    registerEat(PTS.red, performance.now(), true);
    growth += RED_GROWTH;
    burst(cellX(apple.x), cellY(apple.y), ['#ff9aa4', '#ff4d5e', '#ffd0d4'], 14, 150);
    sfx('red');
    maybeSpawnBonus();
  }

  function pickBonusType() {
    const total = BONUS_POOL.reduce((sum, item) => sum + item[1], 0);
    let roll = Math.random() * total;
    for (const [type, weight] of BONUS_POOL) {
      roll -= weight;
      if (roll <= 0) return type;
    }
    return 'gold';
  }

  function maybeSpawnBonus() {
    if (bonuses.length >= 2) return;
    if (Math.random() > 0.55) return;
    const spot = spawnCell();
    if (!spot) return;
    const type = pickBonusType();
    const life = type === 'timed' ? TIMED_MS : type === 'bomb' ? BOMB_MS : BONUS_MS;
    bonuses.push({ x: spot.x, y: spot.y, type, life, maxLife: life });
  }

  function hitBomb(bomb) {
    score = Math.max(0, score - 60);
    combo = 1;
    lastEatAt = 0;
    trimTail(4);
    shake = Math.max(shake, 9);
    flash = 0.35;
    burst(cellX(bomb.x), cellY(bomb.y), BONUS_COLORS.bomb.concat('#ff5a5a'), 22, 210);
    sfx('bomb');
  }

  function eatBonus(b) {
    const now = performance.now();
    const colors = BONUS_COLORS[b.type] || BONUS_COLORS.gold;

    switch (b.type) {
      case 'gold':
        registerEat(PTS.gold, now, false);
        effects.fever = Math.max(effects.fever, FEVER_MS);
        syncApples();
        shake = Math.max(shake, 7);
        flash = 0.5;
        break;
      case 'ghost':
        registerEat(PTS.ghost, now, false);
        effects.ghost = Math.max(effects.ghost, GHOST_MS);
        growth += 1;
        break;
      case 'magnet':
        registerEat(PTS.magnet, now, false);
        effects.magnet = Math.max(effects.magnet, MAGNET_MS);
        growth += 1;
        break;
      case 'ice':
        registerEat(PTS.ice, now, false);
        effects.ice = Math.max(effects.ice, ICE_MS);
        growth += 1;
        break;
      case 'lime':
        registerEat(PTS.lime, now, false);
        trimTail(3 + (Math.random() < 0.5 ? 0 : 1));
        break;
      case 'turbo':
        registerEat(PTS.turbo, now, false);
        effects.turbo = Math.max(effects.turbo, TURBO_MS);
        break;
      case 'reverse':
        registerEat(PTS.reverse, now, false);
        effects.reverse = Math.max(effects.reverse, REVERSE_MS);
        reversePending = true;
        break;
      case 'timed': {
        const value = 20 + Math.round(70 * clamp(b.life / b.maxLife, 0, 1));
        registerEat(value, now, false);
        growth += 1;
        break;
      }
    }

    burst(cellX(b.x), cellY(b.y), colors, 20, 200);
    if (b.type !== 'gold') sfx('power');
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

    if (effects.reverse > 0) {
      x = -x;
      y = -y;
    }

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

  // cruceta del riel lateral
  var PAD_DIRS = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
  };

  for (const button of document.querySelectorAll('[data-dir]')) {
    button.addEventListener('click', function () {
      const dir = PAD_DIRS[button.dataset.dir];
      if (dir) queueDir(dir[0], dir[1]);
    });
  }

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

    const ms = dt * 1000;
    const feverWasActive = effects.fever > 0;
    const reverseWasActive = effects.reverse > 0;

    for (const name of Object.keys(effects)) {
      if (effects[name] > 0) effects[name] = Math.max(0, effects[name] - ms);
    }

    if (feverWasActive && effects.fever === 0) syncApples();

    if (reverseWasActive && effects.reverse === 0 && reversePending) {
      reversePending = false;
      score += REVERSE_REWARD;
      burst(cellX(snake[0].x), cellY(snake[0].y), BONUS_COLORS.reverse, 22, 190);
      sfx('reward');
      rewardsUI && rewardsUI.setStatus('¡Sobreviviste! +' + REVERSE_REWARD + ' puntos');
    }

    if (lastEatAt && performance.now() - lastEatAt > COMBO_WINDOW) combo = 1;

    for (let i = bonuses.length - 1; i >= 0; i--) {
      const b = bonuses[i];
      b.life -= ms;
      if (b.life <= 0) {
        const colors = BONUS_COLORS[b.type] || BONUS_COLORS.gold;
        burst(cellX(b.x), cellY(b.y), colors, 7, 90);
        bonuses.splice(i, 1);
      }
    }

    stepTimer += ms;
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
    red:     { hi: '#ff9aa4', mid: '#ff4d5e', lo: '#b81f36', glow: 'rgba(255,77,94,.85)' },
    gold:    { hi: '#fff3b8', mid: '#ffcf4d', lo: '#b8860b', glow: 'rgba(255,207,77,.9)' },
    ghost:   { hi: '#dff6ff', mid: '#8fe3ff', lo: '#3aa7d8', glow: 'rgba(143,227,255,.9)' },
    magnet:  { hi: '#e9d6ff', mid: '#b879ff', lo: '#6b3fb0', glow: 'rgba(184,121,255,.9)' },
    ice:     { hi: '#e8ffff', mid: '#8ff2ff', lo: '#39a9c9', glow: 'rgba(143,242,255,.9)' },
    lime:    { hi: '#f2ffd0', mid: '#b6ef56', lo: '#5e9b20', glow: 'rgba(182,239,86,.9)' },
    turbo:   { hi: '#ffd7a8', mid: '#ff8a3d', lo: '#b23b0b', glow: 'rgba(255,138,61,.9)' },
    reverse: { hi: '#ffd0f2', mid: '#ff5fb5', lo: '#a01068', glow: 'rgba(255,95,181,.9)' },
    timed:   { hi: '#fff7d6', mid: '#ffe38a', lo: '#d19a1d', glow: 'rgba(255,227,138,.9)' },
    bomb:    { hi: '#5b5b68', mid: '#24242e', lo: '#0a0a10', glow: 'rgba(120,120,150,.75)' }
  };

  function drawMark(cx, cy, r, kind, now) {
    ctx.save();
    ctx.strokeStyle = kind === 'bomb' ? '#d7d7e4' : 'rgba(10,24,32,.9)';
    ctx.fillStyle = kind === 'bomb' ? '#d7d7e4' : 'rgba(10,24,32,.9)';
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (kind) {
      case 'ghost':
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy - r * 0.05, r * 0.1, 0, TAU);
        ctx.arc(cx + r * 0.25, cy - r * 0.05, r * 0.1, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.45, cy + r * 0.42);
        ctx.lineTo(cx - r * 0.22, cy + r * 0.22);
        ctx.lineTo(cx, cy + r * 0.42);
        ctx.lineTo(cx + r * 0.22, cy + r * 0.22);
        ctx.lineTo(cx + r * 0.45, cy + r * 0.42);
        ctx.stroke();
        break;
      case 'magnet':
        ctx.lineWidth = Math.max(2.4, r * 0.24);
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.05, r * 0.52, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.52, cy - r * 0.05);
        ctx.lineTo(cx - r * 0.52, cy + r * 0.42);
        ctx.moveTo(cx + r * 0.52, cy - r * 0.05);
        ctx.lineTo(cx + r * 0.52, cy + r * 0.42);
        ctx.stroke();
        break;
      case 'ice':
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3;
          const dx = Math.cos(a) * r * 0.62;
          const dy = Math.sin(a) * r * 0.62;
          ctx.beginPath();
          ctx.moveTo(cx - dx, cy - dy);
          ctx.lineTo(cx + dx, cy + dy);
          ctx.stroke();
        }
        break;
      case 'lime':
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.5, cy - r * 0.5);
        ctx.lineTo(cx + r * 0.4, cy + r * 0.4);
        ctx.moveTo(cx + r * 0.5, cy - r * 0.5);
        ctx.lineTo(cx - r * 0.4, cy + r * 0.4);
        ctx.stroke();
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + sx * r * 0.52, cy + r * 0.52, r * 0.14, 0, TAU);
          ctx.stroke();
        }
        break;
      case 'turbo':
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + sx * r * 0.35 + r * 0.1, cy - r * 0.6);
          ctx.lineTo(cx + sx * r * 0.35 - r * 0.3, cy + r * 0.05);
          ctx.lineTo(cx + sx * r * 0.35, cy + r * 0.05);
          ctx.lineTo(cx + sx * r * 0.35 - r * 0.1, cy + r * 0.6);
          ctx.lineTo(cx + sx * r * 0.35 + r * 0.3, cy - r * 0.08);
          ctx.lineTo(cx + sx * r * 0.35, cy - r * 0.08);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'reverse':
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.6, cy - r * 0.25);
        ctx.lineTo(cx + r * 0.6, cy - r * 0.25);
        ctx.moveTo(cx - r * 0.6, cy + r * 0.25);
        ctx.lineTo(cx + r * 0.6, cy + r * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.6, cy - r * 0.25);
        ctx.lineTo(cx - r * 0.25, cy - r * 0.5);
        ctx.lineTo(cx - r * 0.25, cy);
        ctx.moveTo(cx + r * 0.6, cy + r * 0.25);
        ctx.lineTo(cx + r * 0.25, cy + r * 0.5);
        ctx.lineTo(cx + r * 0.25, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'timed': {
        const wobble = Math.sin(now / 140) * r * 0.06;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.5, cy - r * 0.6);
        ctx.lineTo(cx + r * 0.5, cy - r * 0.6);
        ctx.lineTo(cx, cy + wobble);
        ctx.lineTo(cx + r * 0.5, cy + r * 0.6);
        ctx.lineTo(cx - r * 0.5, cy + r * 0.6);
        ctx.lineTo(cx, cy + wobble);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'bomb':
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.05, cy - r * 0.45);
        ctx.quadraticCurveTo(cx + r * 0.45, cy - r * 0.9, cx + r * 0.7, cy - r * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + r * 0.08, r * 0.12, 0, TAU);
        ctx.arc(cx - r * 0.28, cy + r * 0.05, r * 0.12, 0, TAU);
        ctx.arc(cx + r * 0.28, cy + r * 0.05, r * 0.12, 0, TAU);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

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

    if (kind !== 'bomb') {
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
    }

    // símbolo del poder o trampa
    drawMark(cx, cy, r, kind, now);

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
    const ghost = effects.ghost > 0;
    const boosted = effects.turbo > 0;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.52;

    // aura de turbo o fantasma
    if (boosted || ghost) {
      ctx.save();
      ctx.shadowColor = ghost ? 'rgba(143,227,255,.85)' : 'rgba(255,138,61,.85)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = ghost ? 'rgba(143,227,255,.13)' : 'rgba(255,138,61,.13)';
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
        ctx.shadowColor = ghost ? 'rgba(143,227,255,.8)' : 'rgba(70,240,138,.75)';
        ctx.shadowBlur = boosted || ghost ? 22 : 14;
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

    ctx.restore();
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

    // manzanas normales (1 o 3 durante la fiebre)
    for (const a of apples) {
      drawFruit(cellX(a.x), cellY(a.y), CELL * 0.37, 'red', now);
    }

    // poderes, trampas y manzana temporizada
    for (const b of bonuses) {
      const cx = cellX(b.x);
      const cy = cellY(b.y);
      const r = CELL * 0.37;
      const pal = PALETTES[b.type] || PALETTES.gold;

      // anillo de tiempo restante
      const frac = clamp(b.life / b.maxLife, 0, 1);
      const blink = b.type === 'timed' && Math.floor(now / 150) % 2 === 0;

      ctx.save();
      ctx.globalAlpha = blink ? 0.22 : 1;
      drawFruit(cx, cy, r, b.type, now);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = blink ? 0.35 : 0.9;
      ctx.strokeStyle = b.type === 'bomb' ? 'rgba(255,90,90,.9)' : pal.mid;
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

  const EFFECT_INFO = {
    fever:   { label: 'FIEBRE 2×', ms: FEVER_MS },
    ghost:   { label: 'FANTASMA', ms: GHOST_MS },
    magnet:  { label: 'IM\u00C1N', ms: MAGNET_MS },
    ice:     { label: 'HIELO', ms: ICE_MS },
    turbo:   { label: 'TURBO 3×', ms: TURBO_MS },
    reverse: { label: 'INVERTIDO', ms: REVERSE_MS }
  };

  function syncHud() {
    setText(el.score, String(score), 'score');
    setText(el.best, String(best), 'best');
    setText(el.len, String(snake.length), 'len');

    if (el.combo) {
      setText(el.combo, '\u00D7' + combo, 'combo');
      el.combo.classList.toggle('hot', combo > 1);
    }

    const speed = speedFactor();
    setText(el.speed, speed.toFixed(2).replace(/0$/, '') + '\u00D7', 'speed');
    el.speed.classList.toggle('boost', speed !== 1);

    let active = null;
    for (const name of Object.keys(EFFECT_INFO)) {
      if (effects[name] > 0) {
        active = name;
        break;
      }
    }

    if (active) {
      const info = EFFECT_INFO[active];
      el.boostPill.classList.add('on');
      el.boostPill.dataset.effect = active;
      setText(el.boostLabel, info.label, 'effectLabel');
      el.boostBar.style.width = clamp(effects[active] / info.ms * 100, 0, 100) + '%';
      el.boostTime.textContent = (effects[active] / 1000).toFixed(1) + 's';
    } else {
      el.boostPill.classList.remove('on');
      el.boostPill.dataset.effect = '';
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
        '<p class="ov-text">Come en menos de 3 s para subir el combo (\u00D72, \u00D73, \u00D74). Cada manzana especial cambia la partida.</p>' +
        '<ul class="ov-legend">' +
          '<li><i class="dot red"></i>Roja: crece</li>' +
          '<li><i class="dot gold"></i>Dorada: fiebre 8 s y 3 manzanas</li>' +
          '<li><i class="dot ghost"></i>Azul: fantasma 6 s</li>' +
          '<li><i class="dot magnet"></i>Morada: im\u00E1n 8 s</li>' +
          '<li><i class="dot ice"></i>Celeste: hielo 7 s</li>' +
          '<li><i class="dot lime"></i>Verde: recorta 3 o 4</li>' +
          '<li><i class="dot turbo"></i>Roja brillante: turbo 5 s \u00D73</li>' +
          '<li><i class="dot reverse"></i>Invertida: \u00A1sobrevive y gana +120!</li>' +
          '<li><i class="dot timed"></i>Temporizada: 6 s, vale m\u00E1s cuanto antes</li>' +
          '<li><i class="dot bomb"></i>Negra: bomba, quita puntos y cola</li>' +
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
      const canRevive = Boolean(monetization && rewards && rewards.livesLeft > 0 && score >= HIGH_SCORE_REVIVE);
      html =
        '<p class="ov-kicker">Fin del juego</p>' +
        '<h2>' + (deathReason === 'warm' ? '\u00A1Choque contra el muro!' : '\u00A1Te mordiste!') + '</h2>' +
        '<div class="recap">' +
          '<div><span>Puntos</span><span class="' + (isBest ? 'new-best' : '') + '">' + score + '</span></div>' +
          '<div><span>Récord</span><span>' + best + '</span></div>' +
          '<div><span>Largo</span><span>' + snake.length + '</span></div>' +
        '</div>' +
        '<p class="ov-text">' + (isBest ? '\u00A1Nuevo récord! ' : '') +
          (canRevive ? 'Puedes revivir una vez con fantasma de 3 s.' : 'La segunda oportunidad aparece desde ' + HIGH_SCORE_REVIVE + ' puntos.') + '</p>' +
        '<button class="btn" data-action="start">Jugar de nuevo</button>' +
        (canRevive
          ? '<button class="btn btn--reward" type="button" data-action="reward-life">Revivir con Fantasma 3 s (anuncio)</button>'
          : '') +
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
  /* =========================================================
      Hook de pruebas (solo con ?debug en la URL)
      ========================================================= */
  if (/(?:^|[?&])debug(?:[=&]|$)/.test(location.search)) {
    window.__serpiente = {
      snapshot: function () {
        return {
          state: state,
          score: score,
          best: best,
          combo: combo,
          dir: { x: dir.x, y: dir.y },
          snake: snake.map((s) => ({ x: s.x, y: s.y })),
          apples: apples.map((a) => ({ x: a.x, y: a.y })),
          bonuses: bonuses.map((b) => ({ x: b.x, y: b.y, type: b.type, life: b.life })),
          effects: Object.assign({}, effects),
          growth: growth,
          speed: speedFactor()
        };
      },
      start: startGame,
      step: step,
      tick: function (ms) { update(ms / 1000); syncHud(); return true; },
      die: die,
      queueDir: queueDir,
      setScore: function (value) { score = value; },
      moveApple: function (x, y) {
        if (!apples.length) apples.push({ x: x, y: y });
        else { apples[0].x = x; apples[0].y = y; }
        return true;
      },
      eat: function (type, life) {
        if (state !== STATE.PLAYING) startGame();
        const head = snake[0];
        const max = type === 'timed' ? TIMED_MS : type === 'bomb' ? BOMB_MS : BONUS_MS;
        const bonus = { x: head.x, y: head.y, type: type, life: life === undefined ? max : life, maxLife: max };
        if (type === 'bomb') hitBomb(bonus);
        else eatBonus(bonus);
        return true;
      },
      setEffect: function (name, ms) {
        if (!(name in effects)) return false;
        effects[name] = ms;
        if (name === 'fever') syncApples();
        if (name === 'reverse') reversePending = true;
        return true;
      },
      spawn: function (type) {
        if (state !== STATE.PLAYING) startGame();
        const spot = spawnCell();
        if (!spot) return false;
        const life = type === 'timed' ? TIMED_MS : type === 'bomb' ? BOMB_MS : BONUS_MS;
        bonuses.push({ x: spot.x, y: spot.y, type: type, life: life, maxLife: life });
        return true;
      }
    };
  }

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
