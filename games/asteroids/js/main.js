/* Entrada, HUD, overlays y recompensas de Asteroids en Playkora. */

import { Game } from './game.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { STORAGE } from './config.js';
import { REWARDS, RewardManager } from '../../../js/monetization.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const sound = new Sound(STORAGE.muted);
const game = new Game({ sound });

const input = { left: false, right: false, thrust: false, fire: false };

const els = {
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  lives: document.getElementById('lives'),
  level: document.getElementById('level'),
  shield: document.getElementById('shield'),
  overlay: document.getElementById('overlay'),
  soundBtn: document.getElementById('soundBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
};

const rewards = new RewardManager();
const rewardsUI = window.PlaykoraRewardsUI.mount({
  host: '#pkAdHost',
  lifeLabel: 'Nave extra',
  bonusLabel: 'Escudo 8 s',
  canLife: () => game.phase === 'gameover',
  canBonus: () => game.phase === 'playing',
  onLife: () => claimLife(),
  onBonus: () => claimBonus(),
  refresh: syncRewardUi,
});

function syncRewardUi() {
  rewardsUI.update({ livesLeft: rewards.livesLeft, bonusLeft: rewards.bonusLeft });
}

function claimLife() {
  if (game.phase !== 'gameover') {
    rewardsUI.setStatus('La nave extra se usa al terminar la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.LIFE);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Ya usaste las 2 naves extra.' : 'Anuncio no completado.');
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
    rewardsUI.setStatus('El escudo se usa durante la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.BONUS);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Escudo ya usado.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.grantShield()) {
    rewards.rollback(REWARDS.BONUS);
    return false;
  }
  syncRewardUi();
  return true;
}

/* ---------- Overlays ---------- */

const idleTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Máquina 09 · Playkora</p>
    <h2>Asteroids</h2>
    <p class="ov-text">
      Gira con <b>&larr;</b> <b>&rarr;</b> o <b>A</b> <b>D</b>, empuja con
      <b>&uarr;</b> o <b>W</b> y dispara con <b>Espacio</b>. Los asteroides
      grandes se parten en dos más pequeños.
    </p>
    <ul class="ov-legend">
      <li><b>Espacio</b> · disparar</li>
      <li><b>Mayús</b> · salto hiperespacial</li>
      <li><b>P</b> · pausa · <b>M</b> · sonido</li>
    </ul>
    <button class="btn" type="button" data-action="start">Empezar</button>
  </div>
`;

const pausedTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">En pausa</p>
    <h2>El espacio espera</h2>
    <p class="ov-text">Pulsa <b>P</b> o el botón para volver a pilotar.</p>
    <button class="btn" type="button" data-action="resume">Continuar</button>
  </div>
`;

const gameoverTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Nave perdida</p>
    <h2>Fin de la partida</h2>
    <p class="ov-text">Puntos <b>${game.score}</b> · Récord <b>${game.best}</b> · Nivel <b>${game.level}</b></p>
    <button class="btn" type="button" data-action="start">Reintentar</button>
    <button class="btn" type="button" data-action="reward-life">Nave extra (anuncio)</button>
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
  const key = `${game.score}|${game.best}|${game.lives}|${game.level}|${Math.ceil(game.shield)}`;
  if (key === hudCache) return;
  hudCache = key;

  els.score.textContent = String(game.score);
  els.best.textContent = String(game.best);
  els.lives.textContent = String(Math.max(0, game.lives));
  els.level.textContent = String(game.level);
  els.shield.textContent = game.shield > 0 ? `${Math.ceil(game.shield)} s` : '—';
}

function updateControls() {
  const canPause = game.phase === 'playing' || game.phase === 'paused';
  els.pauseBtn.disabled = !canPause;
  els.pauseBtn.setAttribute('aria-pressed', String(game.phase === 'paused'));
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
  if (game.phase === 'paused') clearInput();
  syncOverlay();
}

function clearInput() {
  input.left = false;
  input.right = false;
  input.thrust = false;
  input.fire = false;
}

/* ---------- Eventos ---------- */

els.overlay.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'start') startGame();
  else if (action === 'resume') togglePause();
  else if (action === 'reward-life') claimLife();
});

els.soundBtn.addEventListener('click', () => {
  sound.toggleMute();
  updateControls();
});
els.pauseBtn.addEventListener('click', togglePause);

const keyMap = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'thrust',
  KeyW: 'thrust',
  Space: 'fire',
};

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (
    (event.code === 'Enter' || event.code === 'Space') &&
    (game.phase === 'idle' || game.phase === 'gameover' || game.phase === 'paused')
  ) {
    event.preventDefault();
    if (event.repeat) return;
    sound.ensure();
    if (game.phase === 'paused') togglePause();
    else startGame();
    return;
  }

  const action = keyMap[event.code];
  if (action) {
    event.preventDefault();
    sound.ensure();
    input[action] = true;
    return;
  }
  if (event.repeat) return;
  if (event.code === 'KeyP' || event.code === 'Escape') {
    event.preventDefault();
    togglePause();
  } else if (event.code === 'KeyM') {
    sound.toggleMute();
    updateControls();
  } else if (event.code === 'KeyR') {
    event.preventDefault();
    startGame();
  } else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    event.preventDefault();
    if (game.ship) {
      game.ship.x = Math.random() * 960;
      game.ship.y = Math.random() * 720;
      game.ship.vx = 0;
      game.ship.vy = 0;
      game.ship.invuln = 1.2;
    }
  }
});

window.addEventListener('keyup', (event) => {
  const action = keyMap[event.code];
  if (action) input[action] = false;
});

for (const button of document.querySelectorAll('[data-act]')) {
  const action = button.dataset.act;
  const set = (value) => {
    if (!(action in input)) return;
    if (value) sound.ensure();
    input[action] = value;
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    set(true);
  });
  button.addEventListener('pointerup', () => set(false));
  button.addEventListener('pointerleave', () => set(false));
  button.addEventListener('pointercancel', () => set(false));
}

window.addEventListener('blur', clearInput);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') {
    clearInput();
    game.togglePause();
    syncOverlay();
  }
});

window.addEventListener('beforeunload', () => game.saveBest());

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt, input);
  renderer.render(game, now / 1000, input);
  syncHud();
  syncOverlay();
  requestAnimationFrame(frame);
}

syncHud();
syncOverlay();
updateControls();

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__asteroides = game;
}

requestAnimationFrame(frame);
