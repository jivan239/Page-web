import { WIDTH, HEIGHT } from './config.js';
import { formatScore } from './utils.js';
import { AudioEngine } from './audio.js';
import { Game, GameState } from './game.js';
import { REWARDS, RewardManager } from '../../../js/monetization.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const panels = {
  menu: document.getElementById('screen-menu'),
  pause: document.getElementById('screen-pause'),
  gameover: document.getElementById('screen-gameover'),
};

const els = {
  menuHigh: document.getElementById('menu-highscore'),
  finalScore: document.getElementById('final-score'),
  finalWave: document.getElementById('final-wave'),
  finalHigh: document.getElementById('final-highscore'),
  record: document.getElementById('gameover-record'),
  sound: document.getElementById('sound-toggle'),
};

let highScore = 0;
let game;

const rewards = new RewardManager();
const rewardsUI = window.PlaykoraRewardsUI.mount({
  host: '#pkAdHost',
  bonusLabel: 'Escudo de cristal',
  canLife: () => Boolean(game && game.state === GameState.GAMEOVER),
  canBonus: () => Boolean(game && (game.state === GameState.PLAYING || game.state === GameState.WAVE)),
  onLife: () => claimLife(),
  onBonus: () => claimShield(),
  refresh: syncRewardUi,
});

function syncRewardUi() {
  rewardsUI.update({ livesLeft: rewards.livesLeft, bonusLeft: rewards.bonusLeft });
}

function claimLife() {
  if (game.state !== GameState.GAMEOVER) {
    rewardsUI.setStatus('La vida extra se puede usar al perder.');
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

function claimShield() {
  if (game.state !== GameState.PLAYING && game.state !== GameState.WAVE) {
    rewardsUI.setStatus('El escudo se puede usar durante la partida.');
    return false;
  }
  const claim = rewards.claim(REWARDS.BONUS);
  if (!claim.ok) {
    rewardsUI.setStatus(claim.reason === 'limite' ? 'Recompensa ya usada.' : 'Anuncio no completado.');
    return false;
  }
  if (!game.grantShield()) {
    rewards.rollback(REWARDS.BONUS);
    return false;
  }
  syncRewardUi();
  rewardsUI.setStatus('¡Escudo activo 8 s!');
  return true;
}

function showPanel(name) {
  for (const [key, panel] of Object.entries(panels)) {
    panel.hidden = key !== name;
  }
  overlay.hidden = name === null;

  if (name === null && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

const ui = {
  showMenu() {
    els.menuHigh.textContent = formatScore(highScore);
    showPanel('menu');
    syncRewardUi();
  },

  showPause() {
    showPanel('pause');
  },

  showGameOver({ score, wave, highScore: record, isRecord }) {
    els.finalScore.textContent = formatScore(score);
    els.finalWave.textContent = String(wave).padStart(2, '0');
    els.finalHigh.textContent = formatScore(record);
    els.record.hidden = !isRecord;
    showPanel('gameover');
    syncRewardUi();
  },

  hidePanels() {
    showPanel(null);
  },

  setHighScore(value) {
    highScore = value;
    els.menuHigh.textContent = formatScore(value);
  },

  onNewGame() {
    rewards.reset();
    rewardsUI.reset();
    syncRewardUi();
  },
};

const audio = new AudioEngine();
game = new Game(canvas, audio, ui);

function applyDpr() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (dpr === game.dpr) return;
  game.dpr = dpr;
  canvas.width = Math.round(WIDTH * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
}

function syncSoundUi() {
  els.sound.textContent = audio.muted ? 'Sonido: OFF' : 'Sonido: ON';
  els.sound.setAttribute('aria-pressed', String(audio.muted));
}

function toggleSound() {
  audio.unlock();
  audio.setMuted(!audio.muted);
  syncSoundUi();
}

function handleAction(action) {
  audio.unlock();
  switch (action) {
    case 'start':
    case 'restart':
      game.startGame();
      break;
    case 'resume':
      game.resume();
      break;
    case 'pause':
      game.pause();
      break;
    case 'menu':
      game.toMenu();
      break;
    case 'reward-life':
      claimLife();
      break;
    case 'toggle-sound':
      toggleSound();
      break;
    default:
      break;
  }
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  handleAction(trigger.dataset.action);
});

function normalizeKey(event) {
  if (event.code) return event.code;
  const key = event.key;
  if (key === ' ' || key === 'Spacebar') return 'Space';
  if (key === 'Esc') return 'Escape';
  if (/^[a-zA-Z]$/.test(key)) return `Key${key.toUpperCase()}`;
  return key;
}

window.addEventListener('keydown', (event) => {
  const code = normalizeKey(event);
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) {
    event.preventDefault();
  }

  if (code === 'ArrowLeft' || code === 'KeyA') game.input.left = true;
  if (code === 'ArrowRight' || code === 'KeyD') game.input.right = true;

  if (code === 'Space' || code === 'KeyJ') {
    if (game.state === GameState.MENU || game.state === GameState.GAMEOVER) {
      game.startGame();
    } else {
      game.input.fire = true;
    }
    audio.unlock();
  }

  if ((code === 'KeyP' || code === 'Escape') && !event.repeat) {
    game.togglePause();
  }

  if (code === 'KeyM' && !event.repeat) {
    toggleSound();
  }

  if (code === 'Enter' && !event.repeat) {
    if (game.state === GameState.MENU || game.state === GameState.GAMEOVER) {
      game.startGame();
    } else if (game.state === GameState.PAUSED) {
      game.resume();
    }
  }
});

window.addEventListener('keyup', (event) => {
  const code = normalizeKey(event);
  if (code === 'ArrowLeft' || code === 'KeyA') game.input.left = false;
  if (code === 'ArrowRight' || code === 'KeyD') game.input.right = false;
  if (code === 'Space' || code === 'KeyJ') game.input.fire = false;
});

function pointerToGameX(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientX - rect.left) / rect.width) * WIDTH;
}

canvas.addEventListener('pointerdown', (event) => {
  audio.unlock();
  if (event.pointerType === 'mouse') return;
  if (game.state !== GameState.PLAYING) return;
  canvas.setPointerCapture(event.pointerId);
  game.input.pointerX = pointerToGameX(event);
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'mouse') return;
  if (!canvas.hasPointerCapture(event.pointerId)) return;
  game.input.pointerX = pointerToGameX(event);
});

function releasePointer(event) {
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  game.input.pointerX = null;
}

canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

document.querySelectorAll('[data-hold]').forEach((button) => {
  const key = button.dataset.hold;

  const press = (event) => {
    event.preventDefault();
    audio.unlock();
    game.input[key] = true;
    button.classList.add('is-active');
  };

  const release = () => {
    game.input[key] = false;
    button.classList.remove('is-active');
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === GameState.PLAYING) game.pause();
});

window.addEventListener('resize', applyDpr);

syncSoundUi();
applyDpr();
game.start();

// Hook de depuración opcional: http://localhost:8080/?debug
if (new URLSearchParams(window.location.search).has('debug')) {
  window.__game = game;
}
