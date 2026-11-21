import { Game } from './game.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { REWARDS, RewardManager } from '../../../js/monetization.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const sound = new Sound();
const game = new Game({ sound });

const els = {
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  level: document.getElementById('level'),
  lives: document.getElementById('lives'),
  overlay: document.getElementById('overlay'),
  soundBtn: document.getElementById('soundBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
};

const rewards = new RewardManager();
const rewardsUI = window.PlaykoraRewardsUI.mount({
  host: '#pkAdHost',
  bonusLabel: 'Asustar sombras',
  canLife: () => game.phase === 'gameover',
  canBonus: () => game.phase === 'playing' || game.phase === 'ready',
  onLife: () => claimLife(),
  onBonus: () => claimFright(),
  refresh: syncRewardUi,
});

function syncRewardUi() {
  rewardsUI.update({ livesLeft: rewards.livesLeft, bonusLeft: rewards.bonusLeft });
}

function claimLife() {
  if (game.phase !== 'gameover') {
    rewardsUI.setStatus('La vida extra se usa al terminar la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.LIFE);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Ya usaste las 2 vidas extra.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.reviveWithLife()) {
    rewards.rollback(REWARDS.LIFE);
    return false;
  }
  syncRewardUi();
  rewardsUI.setStatus('¡Vida extra conseguida!');
  return true;
}

function claimFright() {
  if (game.phase !== 'playing' && game.phase !== 'ready') {
    rewardsUI.setStatus('La recompensa se usa durante la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.BONUS);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Recompensa ya usada.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.scareGhosts()) {
    rewards.rollback(REWARDS.BONUS);
    return false;
  }
  syncRewardUi();
  rewardsUI.setStatus('¡Sombras asustadas!');
  return true;
}

const KEY_DIRS = {
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyA: 'left',
  KeyS: 'down',
  KeyD: 'right',
};

/* ---------- Overlays ---------- */

const idleTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Máquina 03 · Playkora</p>
    <h2>Cazaluces</h2>
    <p class="ov-text">
      Recoge las 362 luces y las 4 luces de poder. Cada sombra juega a su manera:
      Brasa te caza, Eco te corta el paso, Cierzo calcula y Musgo se acobarda.
    </p>
    <ul class="ov-legend">
      <li><i class="dot dot--brasa"></i>Brasa: persigue tu casilla</li>
      <li><i class="dot dot--eco"></i>Eco: apunta 4 casillas delante</li>
      <li><i class="dot dot--cierzo"></i>Cierzo: usa a Brasa para emboscar</li>
      <li><i class="dot dot--musgo"></i>Musgo: huye si estás cerca</li>
    </ul>
    <button class="btn" type="button" data-action="start">Empezar</button>
    <p class="ov-hint">Flechas / WASD · P pausa · M sonido</p>
  </div>
`;

const pausedTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">En pausa</p>
    <h2>Respira un momento</h2>
    <p class="ov-text">Pulsa <b>P</b> o el botón para seguir jugando.</p>
    <button class="btn" type="button" data-action="resume">Continuar</button>
  </div>
`;

const gameoverTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Fin del juego</p>
    <h2>Las sombras ganan</h2>
    <p class="ov-text">Puntuación <b>${game.score}</b> · Récord <b>${game.best}</b></p>
    <p class="ov-text">Llegaste al nivel <b>${game.level}</b>.</p>
    <button class="btn" type="button" data-action="start">Reintentar</button>
    <button class="btn" type="button" data-action="reward-life">Vida extra (anuncio)</button>
    <p class="ov-hint">Enter o Espacio para volver a jugar</p>
  </div>
`;

let overlayPhase = null;

function showOverlay(html) {
  els.overlay.innerHTML = html;
  els.overlay.classList.add('is-open');
}

function hideOverlay() {
  els.overlay.classList.remove('is-open');
  els.overlay.innerHTML = '';
}

function syncOverlay() {
  if (game.phase === overlayPhase) return;
  overlayPhase = game.phase;

  if (game.phase === 'idle') showOverlay(idleTemplate());
  else if (game.phase === 'paused') showOverlay(pausedTemplate());
  else if (game.phase === 'gameover') {
    showOverlay(gameoverTemplate());
    syncRewardUi();
  } else hideOverlay();

  updateControls();
}

/* ---------- HUD ---------- */

let hudCache = '';

function renderLives(count) {
  els.lives.replaceChildren();
  if (count <= 0) {
    els.lives.textContent = '—';
    return;
  }
  for (let i = 0; i < count; i += 1) {
    const life = document.createElement('span');
    life.className = 'life';
    els.lives.append(life);
  }
}

function syncHud() {
  const key = `${game.score}|${game.best}|${game.level}|${game.lives}`;
  if (key === hudCache) return;
  hudCache = key;

  els.score.textContent = String(game.score);
  els.best.textContent = String(game.best);
  els.level.textContent = String(game.level);
  renderLives(game.lives);
}

/* ---------- Controles ---------- */

function updateControls() {
  const canPause = game.phase === 'playing' || game.phase === 'paused';
  els.pauseBtn.disabled = !canPause;
  els.pauseBtn.setAttribute('aria-pressed', String(game.phase === 'paused'));
  els.soundBtn.textContent = sound.muted ? '🔇' : '🔊';
  els.soundBtn.setAttribute(
    'aria-label',
    sound.muted ? 'Activar sonido' : 'Silenciar sonido',
  );
}

function startGame() {
  sound.ensure();
  game.start();
  rewards.reset();
  rewardsUI.reset();
  syncRewardUi();
  syncOverlay();
}

function toggleSound() {
  sound.toggleMute();
  updateControls();
}

els.overlay.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (action === 'start') startGame();
  else if (action === 'reward-life') claimLife();
  else if (action === 'resume') {
    sound.ensure();
    game.togglePause();
    syncOverlay();
  }
});

els.soundBtn.addEventListener('click', toggleSound);

els.pauseBtn.addEventListener('click', () => {
  if (game.phase !== 'playing' && game.phase !== 'paused') return;
  sound.ensure();
  game.togglePause();
  syncOverlay();
});

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const dir = KEY_DIRS[event.code];
  if (dir) {
    event.preventDefault();
    sound.ensure();
    game.setDirection(dir);
    return;
  }

  if (event.repeat) return;

  if (event.code === 'KeyP' || event.code === 'Space') {
    event.preventDefault();
    if (game.phase === 'playing' || game.phase === 'paused') {
      sound.ensure();
      game.togglePause();
      syncOverlay();
    } else if (game.phase === 'idle' || game.phase === 'gameover') {
      startGame();
    }
  } else if (event.code === 'KeyM') {
    toggleSound();
  } else if (event.code === 'Enter') {
    if (game.phase === 'idle' || game.phase === 'gameover') startGame();
    else if (game.phase === 'paused') {
      sound.ensure();
      game.togglePause();
      syncOverlay();
    }
  }
});

for (const button of document.querySelectorAll('[data-dir]')) {
  const setDirection = () => {
    sound.ensure();
    game.setDirection(button.dataset.dir);
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    setDirection();
  });
  button.addEventListener('click', setDirection);
}

/* ---------- Swipe ---------- */

let swipe = null;

canvas.addEventListener('pointerdown', (event) => {
  swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    /* algunos navegadores no permiten capturar punteros sintéticos */
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (!swipe || swipe.id !== event.pointerId) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;

  if (Math.hypot(dx, dy) < 18) return;
  sound.ensure();
  if (Math.abs(dx) > Math.abs(dy)) {
    game.setDirection(dx > 0 ? 'right' : 'left');
  } else {
    game.setDirection(dy > 0 ? 'down' : 'up');
  }
});

canvas.addEventListener('pointercancel', () => {
  swipe = null;
});

/* ---------- Ciclo principal ---------- */

window.addEventListener('resize', () => renderer.resize());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') {
    game.togglePause();
    syncOverlay();
  }
});

window.addEventListener('beforeunload', () => game.saveBest());

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  game.update(dt);
  renderer.render(game, now / 1000);
  syncHud();
  syncOverlay();

  requestAnimationFrame(frame);
}

syncHud();
updateControls();
syncOverlay();

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__cazaluces = game;
}

requestAnimationFrame(frame);
