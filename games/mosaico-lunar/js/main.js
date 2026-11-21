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
  lines: document.getElementById('lines'),
  overlay: document.getElementById('overlay'),
  soundBtn: document.getElementById('soundBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
};

const rewards = new RewardManager();
const rewardsUI = window.PlaykoraRewardsUI.mount({
  host: '#pkAdHost',
  bonusLabel: 'Tesela Vara',
  canLife: () => game.phase === 'gameover',
  canBonus: () => game.phase === 'playing',
  onLife: () => claimLife(),
  onBonus: () => claimVara(),
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
  if (!game.reviveWithClear()) {
    rewards.rollback(REWARDS.LIFE);
    return false;
  }
  syncRewardUi();
  rewardsUI.setStatus('¡Vida extra conseguida!');
  return true;
}

function claimVara() {
  if (game.phase !== 'playing') {
    rewardsUI.setStatus('La recompensa se usa durante la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.BONUS);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Recompensa ya usada.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.grantVara()) {
    rewards.rollback(REWARDS.BONUS);
    return false;
  }
  syncRewardUi();
  rewardsUI.setStatus('¡Tesela Vara añadida!');
  return true;
}

/* ---------- Overlays ---------- */

const idleTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Máquina 04 · Playkora</p>
    <h2>Mosaico Lunar</h2>
    <p class="ov-text">
      Las teselas caen desde la noche. Gíralas, encájalas y completa filas
      enteras: cada diez filas el mosaico acelera.
    </p>
    <ul class="ov-legend">
      <li><i class="dot dot--vara"></i>Vara · línea de cuatro</li>
      <li><i class="dot dot--cruz"></i>Cruz · tres con remate</li>
      <li><i class="dot dot--dado"></i>Dado · bloque compacto</li>
      <li><i class="dot dot--rayo"></i>Rayo · zigzag de dos</li>
    </ul>
    <button class="btn" type="button" data-action="start">Empezar</button>
    <p class="ov-hint">Flechas / WASD · Espacio cae · C guarda · P pausa</p>
  </div>
`;

const pausedTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">En pausa</p>
    <h2>El mosaico espera</h2>
    <p class="ov-text">Pulsa <b>P</b> o el botón para seguir encajando teselas.</p>
    <button class="btn" type="button" data-action="resume">Continuar</button>
  </div>
`;

const gameoverTemplate = () => `
  <div class="panel">
    <p class="ov-kicker">Fin del mosaico</p>
    <h2>La noche se cerró</h2>
    <p class="ov-text">Puntuación <b>${game.score}</b> · Récord <b>${game.best}</b></p>
    <p class="ov-text">Llegaste al nivel <b>${game.level}</b> con <b>${game.lines}</b> filas.</p>
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

function syncHud() {
  const key = `${game.score}|${game.best}|${game.level}|${game.lines}`;
  if (key === hudCache) return;
  hudCache = key;

  els.score.textContent = String(game.score);
  els.best.textContent = String(game.best);
  els.level.textContent = String(game.level);
  els.lines.textContent = String(game.lines);
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

function togglePause() {
  if (game.phase !== 'playing' && game.phase !== 'paused') return;
  sound.ensure();
  game.togglePause();
  syncOverlay();
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
els.pauseBtn.addEventListener('click', togglePause);

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const code = event.code;

  if (code === 'ArrowLeft' || code === 'KeyA') {
    event.preventDefault();
    sound.ensure();
    game.move(-1);
    return;
  }
  if (code === 'ArrowRight' || code === 'KeyD') {
    event.preventDefault();
    sound.ensure();
    game.move(1);
    return;
  }
  if (code === 'ArrowDown' || code === 'KeyS') {
    event.preventDefault();
    sound.ensure();
    game.softDrop();
    return;
  }

  if (event.repeat) return;

  if (code === 'ArrowUp' || code === 'KeyW' || code === 'KeyX') {
    event.preventDefault();
    sound.ensure();
    game.rotate(1);
    return;
  }
  if (code === 'KeyZ') {
    event.preventDefault();
    sound.ensure();
    game.rotate(-1);
    return;
  }
  if (code === 'KeyC') {
    event.preventDefault();
    sound.ensure();
    game.holdPiece();
    return;
  }
  if (code === 'Space') {
    event.preventDefault();
    if (game.phase === 'idle' || game.phase === 'gameover') startGame();
    else if (game.phase === 'paused') {
      sound.ensure();
      game.togglePause();
      syncOverlay();
    } else if (game.phase === 'playing') {
      sound.ensure();
      game.hardDrop();
    }
    return;
  }
  if (code === 'KeyP' || code === 'Escape') {
    event.preventDefault();
    togglePause();
    return;
  }
  if (code === 'KeyM') {
    toggleSound();
    return;
  }
  if (code === 'Enter') {
    if (game.phase === 'idle' || game.phase === 'gameover') startGame();
    else if (game.phase === 'paused') {
      sound.ensure();
      game.togglePause();
      syncOverlay();
    }
  }
});

/* ---------- Botones táctiles ---------- */

const actions = {
  left: () => game.move(-1),
  right: () => game.move(1),
  rotate: () => game.rotate(1),
  down: () => game.softDrop(),
  drop: () => game.hardDrop(),
  hold: () => game.holdPiece(),
};

for (const button of document.querySelectorAll('[data-act]')) {
  const act = button.dataset.act;
  let timer = 0;

  const trigger = () => {
    sound.ensure();
    actions[act]?.();
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    trigger();
    if (act === 'down') timer = window.setInterval(trigger, 70);
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('click', (event) => {
    if (event.detail === 0) trigger();
  });
}

/* ---------- Gesto sobre el lienzo ---------- */

let gesture = null;

canvas.addEventListener('pointerdown', (event) => {
  gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    /* punteros sintéticos */
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  gesture = null;

  sound.ensure();

  if (Math.hypot(dx, dy) < 20) {
    game.rotate(1);
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    game.move(dx > 0 ? 1 : -1);
  } else if (dy > 0) {
    game.softDrop();
  } else {
    game.holdPiece();
  }
});

canvas.addEventListener('pointercancel', () => {
  gesture = null;
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
  window.__mosaico = game;
}

requestAnimationFrame(frame);
