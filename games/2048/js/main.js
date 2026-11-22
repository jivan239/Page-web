/* Entrada, HUD, overlays y recompensas del 2048 de Playkora. */

import { Game } from './game.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { STORAGE } from './config.js';
import { REWARDS, RewardManager } from '../../../js/monetization.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const sound = new Sound(STORAGE.muted);
const game = new Game({ sound });

const els = {
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  moves: document.getElementById('moves'),
  status: document.getElementById('status'),
  overlay: document.getElementById('overlay'),
  soundBtn: document.getElementById('soundBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  undoBtn: document.getElementById('undoBtn'),
  newBtn: document.getElementById('newBtn'),
};

const rewards = new RewardManager();
const rewardsUI = window.PlaykoraRewardsUI.mount({
  host: '#pkAdHost',
  lifeLabel: 'Continuar partida',
  bonusLabel: 'Ficha extra',
  canLife: () => game.phase === 'gameover' && !!game.snapshot,
  canBonus: () => game.phase === 'playing',
  onLife: () => claimLife(),
  onBonus: () => claimBonus(),
  refresh: syncRewardUi,
});

function syncRewardUi() {
  rewardsUI.update({ livesLeft: rewards.livesLeft, bonusLeft: rewards.bonusLeft });
}

function claimLife() {
  if (game.phase !== 'gameover' || !game.snapshot) {
    rewardsUI.setStatus('La continuación se usa al terminar la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.LIFE);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Ya usaste las 2 continuaciones.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.revive()) {
    rewards.rollback(REWARDS.LIFE);
    return false;
  }
  syncRewardUi();
  return true;
}

function claimBonus() {
  if (game.phase !== 'playing') {
    rewardsUI.setStatus('La ficha extra se usa durante la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.BONUS);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Recompensa ya usada.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.grantTile()) {
    rewards.rollback(REWARDS.BONUS);
    return false;
  }
  syncRewardUi();
  return true;
}

/* ---------- Overlays ---------- */

const idleTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Máquina 08 · Playkora</p>
    <h2>2048</h2>
    <p class="ov-text">
      Desliza las fichas con las flechas o WASD. Dos fichas iguales se fusionan
      y suman su valor. Llega a <b>2048</b> sin quedarte sin movimientos.
    </p>
    <ul class="ov-legend">
      <li><b>Flechas / WASD</b> · mover</li>
      <li><b>Z</b> · deshacer una jugada</li>
      <li><b>P</b> · pausa · <b>M</b> · sonido</li>
    </ul>
    <button class="btn" type="button" data-action="start">Empezar</button>
  </div>
`;

const pausedTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">En pausa</p>
    <h2>El tablero espera</h2>
    <p class="ov-text">Pulsa <b>P</b> o el botón para seguir fusionando fichas.</p>
    <button class="btn" type="button" data-action="resume">Continuar</button>
  </div>
`;

const gameoverTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Partida terminada</p>
    <h2>Sin movimientos</h2>
    <p class="ov-text">Puntos <b>${game.score}</b> · Récord <b>${game.best}</b> · Ficha máxima <b>${game.maxTile()}</b></p>
    <button class="btn" type="button" data-action="start">Reintentar</button>
    <button class="btn" type="button" data-action="undo">Deshacer última jugada</button>
    <button class="btn" type="button" data-action="reward-life">Continuar (anuncio)</button>
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

function syncHud() {
  const key = `${game.score}|${game.best}|${game.moves}|${game.won}|${game.phase}`;
  if (key === hudCache) return;
  hudCache = key;

  els.score.textContent = String(game.score);
  els.best.textContent = String(game.best);
  els.moves.textContent = String(game.moves);
  els.status.textContent = game.won ? '¡2048 alcanzado! Puedes seguir jugando.' : '';
}

function updateControls() {
  const canPause = game.phase === 'playing' || game.phase === 'paused';
  els.pauseBtn.disabled = !canPause;
  els.pauseBtn.setAttribute('aria-pressed', String(game.phase === 'paused'));
  els.undoBtn.disabled = game.phase !== 'playing' || !game.snapshot;
  els.soundBtn.textContent = sound.muted ? '🔇' : '🔊';
  els.soundBtn.setAttribute('aria-label', sound.muted ? 'Activar sonido' : 'Silenciar sonido');
}

function startGame() {
  sound.ensure();
  game.start();
  rewards.reset();
  rewardsUI.reset();
  syncRewardUi();
  syncOverlay();
  updateControls();
}

function togglePause() {
  if (game.phase !== 'playing' && game.phase !== 'paused') return;
  sound.ensure();
  game.togglePause();
  syncOverlay();
}

function undo() {
  if (!game.undo()) return;
  syncOverlay();
  updateControls();
}

/* ---------- Eventos ---------- */

els.overlay.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'start') startGame();
  else if (action === 'resume') togglePause();
  else if (action === 'reward-life') claimLife();
  else if (action === 'undo') undo();
});

els.newBtn.addEventListener('click', startGame);
els.undoBtn.addEventListener('click', undo);
els.soundBtn.addEventListener('click', () => {
  sound.toggleMute();
  updateControls();
});
els.pauseBtn.addEventListener('click', togglePause);

const directions = {
  left: 'left',
  right: 'right',
  up: 'up',
  down: 'down',
};

for (const button of document.querySelectorAll('[data-act]')) {
  button.addEventListener('click', () => {
    sound.ensure();
    const direction = directions[button.dataset.act];
    if (direction) game.move(direction);
    updateControls();
  });
  button.addEventListener('pointerdown', () => sound.ensure());
}

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const code = event.code;
  let direction = null;

  if (code === 'ArrowLeft' || code === 'KeyA') direction = 'left';
  else if (code === 'ArrowRight' || code === 'KeyD') direction = 'right';
  else if (code === 'ArrowUp' || code === 'KeyW') direction = 'up';
  else if (code === 'ArrowDown' || code === 'KeyS') direction = 'down';

  if (direction) {
    event.preventDefault();
    sound.ensure();
    game.move(direction);
    updateControls();
    return;
  }
  if (event.repeat) return;

  if (code === 'KeyZ' || code === 'KeyU') {
    event.preventDefault();
    undo();
  } else if (code === 'KeyN') {
    event.preventDefault();
    startGame();
  } else if (code === 'KeyP' || code === 'Escape') {
    event.preventDefault();
    togglePause();
  } else if (code === 'KeyM') {
    sound.toggleMute();
    updateControls();
  } else if (code === 'Enter' || code === 'Space') {
    event.preventDefault();
    if (game.phase === 'idle' || game.phase === 'gameover') startGame();
    else if (game.phase === 'paused') togglePause();
  }
});

let swipe = null;

canvas.addEventListener('pointerdown', (event) => {
  swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
});

canvas.addEventListener('pointerup', (event) => {
  if (!swipe || swipe.id !== event.pointerId) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.hypot(dx, dy) < 24) return;
  sound.ensure();
  if (Math.abs(dx) > Math.abs(dy)) game.move(dx > 0 ? 'right' : 'left');
  else game.move(dy > 0 ? 'down' : 'up');
  updateControls();
});

canvas.addEventListener('pointercancel', () => {
  swipe = null;
});

window.addEventListener('resize', () => renderer.resize());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') {
    game.togglePause();
    syncOverlay();
  }
});

window.addEventListener('beforeunload', () => game.saveBest());

function frame(now) {
  renderer.render(game, now);
  syncHud();
  syncOverlay();
  updateControls();
  requestAnimationFrame(frame);
}

syncHud();
syncOverlay();
updateControls();

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__dosMil48 = game;
}

requestAnimationFrame(frame);
