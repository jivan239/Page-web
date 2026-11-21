import { Sound } from './audio.js';
import {
  BASE_HP,
  MAX_LEVEL,
  REWARD_GOLD,
  REWARD_HEAL,
  TOWERS,
  TOWER_ORDER,
  VICTORY_WAVE,
  WORLD,
  sellValue,
  towerStats,
  upgradeCost,
} from './config.js';
import { Game } from './game.js';
import { REWARDS, RewardManager } from './monetization.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const sound = new Sound();
const game = new Game({ sound });
const renderer = new Renderer(canvas);

const els = {
  gold: document.getElementById('gold'),
  hp: document.getElementById('hp'),
  hpBar: document.getElementById('hpBar'),
  wave: document.getElementById('wave'),
  best: document.getElementById('best'),
  status: document.getElementById('statusText'),
  speedBadge: document.getElementById('speedBadge'),
  overlay: document.getElementById('overlay'),
  waveBtn: document.getElementById('waveBtn'),
  speedBtn: document.getElementById('speedBtn'),
  soundBtn: document.getElementById('soundBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  inspector: document.getElementById('inspector'),
};

let statusOverride = '';
let statusTimer = 0;
let lastStatus = '';
let hudCache = '';
let overlayKey = '';
let inspectorCache = '';

/* Recompensas: el límite y la puerta del anuncio viven en el módulo compartido. */
const rewards = new RewardManager();
let rewardUiKey = '';
const rewardsUI = window.PlaykoraRewardsUI.mount({
  host: '#pkAdHost',
  lifeLabel: 'Vida extra (+30 HP)',
  bonusLabel: '+100 oro',
  canLife: () => game.phase === 'playing',
  canBonus: () => game.phase === 'playing',
  onLife: () => claimReward(REWARDS.LIFE),
  onBonus: () => claimReward(REWARDS.BONUS),
  refresh: syncRewardUi,
});

function syncRewardUi() {
  const key = `${rewards.livesLeft}|${rewards.bonusLeft}|${game.phase}`;
  if (key === rewardUiKey) return;
  rewardUiKey = key;
  rewardsUI.update({ livesLeft: rewards.livesLeft, bonusLeft: rewards.bonusLeft });
}

function claimReward(type) {
  if (game.phase !== 'playing') {
    flash('Empieza una partida para usar recompensas');
    return false;
  }

  const claim = rewards.claim(type);
  if (!claim.ok) {
    flash(claim.reason === 'limite' ? 'Ya usaste todas las recompensas' : 'Anuncio no completado');
    return false;
  }

  const applied = game.applyReward(type);
  if (!applied.ok) {
    rewards.rollback(type);
    flash('No se pudo aplicar la recompensa');
    return false;
  }

  syncRewardUi();
  flash(
    type === REWARDS.BONUS
      ? `Recompensa: +${REWARD_GOLD} oro`
      : `Vida extra: +${REWARD_HEAL} HP`,
  );
  return true;
}

/* ---------- Textos de estado ---------- */

function flash(message) {
  statusOverride = message;
  statusTimer = 1.8;
}

function statusMessage() {
  if (statusOverride) return statusOverride;
  if (game.phase === 'idle') return 'Coloca torretas y prepara la defensa';
  if (game.phase === 'gameover') return 'Núcleo destruido · pulsa Reintentar';
  if (game.phase === 'victory') return '¡Núcleo defendido!';
  if (game.paused) return 'En pausa · pulsa P para continuar';
  if (game.plan) {
    const pending = game.plan.types.length - game.spawnIndex;
    return `Oleada ${game.wave} · ${game.enemies.length} en campo · ${pending} por llegar`;
  }
  if (game.countdown > 0) return `Siguiente oleada en ${Math.ceil(game.countdown)} s`;
  return 'Preparando defensa';
}

function syncHud() {
  const key = `${game.gold}|${game.hp}|${game.wave}|${game.best}`;
  if (key !== hudCache) {
    hudCache = key;
    els.gold.textContent = String(game.gold);
    els.hp.textContent = String(game.hp);
    els.wave.textContent = String(game.wave);
    els.best.textContent = String(game.best);
    const ratio = game.hp / BASE_HP;
    els.hpBar.style.width = `${Math.max(0, ratio) * 100}%`;
    els.hpBar.classList.toggle('is-low', ratio <= 0.35);
  }

  const status = statusMessage();
  if (status !== lastStatus) {
    lastStatus = status;
    els.status.textContent = status;
  }
}

/* ---------- Overlays ---------- */

function idleTemplate() {
  return `
    <div class="panel">
      <p class="ov-kicker">Máquina 05 · Playkora</p>
      <h2>Bastión Lumen</h2>
      <p class="ov-text">
        Un circuito, tres torretas y un núcleo de 100 HP. Coloca defensas
        junto al camino y detén las oleadas antes de que lleguen al final.
      </p>
      <ul class="ov-legend">
        <li><i class="dot dot--basic"></i>Básica · daño y cadencia equilibrados</li>
        <li><i class="dot dot--rapid"></i>Ligera · muchos disparos por segundo</li>
        <li><i class="dot dot--heavy"></i>Pesada · gran daño en área y ralentiza</li>
      </ul>
      <button class="btn btn--primary" type="button" data-action="start">Empezar defensa</button>
      <p class="ov-hint">Cada 5 oleadas llega un jefe. Gana oro con cada derrota.</p>
    </div>
  `;
}

function pausedTemplate() {
  return `
    <div class="panel">
      <p class="ov-kicker">En pausa</p>
      <h2>El núcleo espera</h2>
      <p class="ov-text">Pulsa <b>P</b> o el botón para seguir defendiendo.</p>
      <button class="btn btn--primary" type="button" data-action="resume">Continuar</button>
    </div>
  `;
}

function gameoverTemplate() {
  const s = game.summary || { cleared: 0, reached: game.wave, defeated: 0, best: game.best };
  return `
    <div class="panel">
      <p class="ov-kicker">Fin de partida</p>
      <h2>El núcleo cayó</h2>
      <p class="ov-text">Oleadas superadas <b>${s.cleared}</b> · alcanzaste la <b>${s.reached}</b></p>
      <p class="ov-text">Enemigos derrotados <b>${s.defeated}</b> · mejor oleada <b>${s.best}</b></p>
      <button class="btn btn--primary" type="button" data-action="retry">Reintentar</button>
      <p class="ov-hint">Espacio o Enter para volver a jugar</p>
    </div>
  `;
}

function victoryTemplate() {
  return `
    <div class="panel">
      <p class="ov-kicker">Misión cumplida</p>
      <h2>¡Núcleo a salvo!</h2>
      <p class="ov-text">
        Defendiste <b>${VICTORY_WAVE}</b> oleadas y derrotaste <b>${game.defeated}</b>
        enemigos. El circuito sigue en pie.
      </p>
      <button class="btn btn--primary" type="button" data-action="endless">Seguir en modo infinito</button>
      <button class="btn btn--quiet" type="button" data-action="retry">Nueva partida</button>
    </div>
  `;
}

function syncOverlay() {
  const key = `${game.phase}|${game.paused}|${game.summary ? game.summary.defeated : ''}`;
  if (key === overlayKey) return;
  overlayKey = key;

  if (game.phase === 'idle') {
    els.overlay.innerHTML = idleTemplate();
    els.overlay.classList.add('is-open');
  } else if (game.phase === 'gameover') {
    els.overlay.innerHTML = gameoverTemplate();
    els.overlay.classList.add('is-open');
  } else if (game.phase === 'victory') {
    els.overlay.innerHTML = victoryTemplate();
    els.overlay.classList.add('is-open');
  } else if (game.paused) {
    els.overlay.innerHTML = pausedTemplate();
    els.overlay.classList.add('is-open');
  } else {
    els.overlay.classList.remove('is-open');
    els.overlay.innerHTML = '';
  }
}

/* ---------- Inspector de torreta ---------- */

function syncInspector() {
  const tower = game.selectedTower;
  if (!tower) {
    if (inspectorCache !== '') {
      inspectorCache = '';
      els.inspector.hidden = true;
      els.inspector.innerHTML = '';
    }
    return;
  }

  const stats = towerStats(tower.def, tower.level);
  const key = `${tower.id}|${tower.level}|${game.gold}`;
  if (key === inspectorCache) return;
  inspectorCache = key;

  const maxed = tower.level >= MAX_LEVEL;
  const cost = maxed ? 0 : upgradeCost(tower.def, tower.level);
  els.inspector.hidden = false;
  els.inspector.innerHTML = `
    <div class="inspector__head">
      <span class="inspector__dot" data-tone="${tower.type}"></span>
      <span>
        <b>${tower.def.name}</b>
        <small>Nivel ${tower.level}/${MAX_LEVEL} · ${tower.invested} oro invertido</small>
      </span>
    </div>
    <div class="inspector__stats">
      <span>Daño<b>${stats.damage}</b></span>
      <span>Cadencia<b>${stats.rate.toFixed(2)}/s</b></span>
      <span>Alcance<b>${stats.range}</b></span>
    </div>
    <div class="inspector__actions">
      <button class="btn" type="button" data-inspect="upgrade" ${maxed || game.gold < cost ? 'disabled' : ''}>
        ${maxed ? 'Nivel máximo' : `Mejorar · ${cost}`}
      </button>
      <button class="btn btn--quiet" type="button" data-inspect="sell">
        Vender · +${sellValue(tower)}
      </button>
    </div>
  `;
}

/* ---------- Controles ---------- */

function syncControls() {
  const canPlay = game.phase === 'playing' && !game.paused;
  els.waveBtn.disabled = !canPlay || game.waveActive;
  els.waveBtn.textContent = game.waveActive
    ? 'Oleada en curso'
    : game.plan
      ? 'Oleada en curso'
      : `Iniciar oleada ${game.wave + 1}`;

  els.speedBtn.textContent = `Velocidad ${game.speed}x`;
  els.speedBadge.textContent = `${game.speed}x`;
  els.pauseBtn.disabled = game.phase !== 'playing';
  els.pauseBtn.setAttribute('aria-pressed', String(game.paused));
  els.soundBtn.textContent = sound.muted ? '🔇' : '🔊';
  els.soundBtn.setAttribute('aria-label', sound.muted ? 'Activar sonido' : 'Silenciar sonido');

  syncRewardUi();

  for (const button of document.querySelectorAll('[data-build]')) {
    const type = button.dataset.build;
    button.classList.toggle('is-active', game.buildType === type);
    button.classList.toggle('is-locked', game.gold < TOWERS[type].cost);
    button.setAttribute('aria-pressed', String(game.buildType === type));
  }
}

function startGame() {
  sound.ensure();
  game.start();
  rewards.reset();
  rewardsUI.reset();
  rewardUiKey = '';
  syncOverlay();
  syncControls();
}

function toggleSound() {
  sound.toggleMute();
}

function togglePause() {
  if (game.phase !== 'playing') return;
  sound.ensure();
  game.togglePause();
  syncOverlay();
}

function toggleSpeed() {
  sound.ensure();
  game.toggleSpeed();
}

els.overlay.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'start' || action === 'retry') startGame();
  else if (action === 'resume') togglePause();
  else if (action === 'endless') {
    game.continueEndless();
    syncOverlay();
  }
});

els.waveBtn.addEventListener('click', () => {
  sound.ensure();
  if (game.startWave()) flash(`Oleada ${game.wave} en camino`);
});

els.speedBtn.addEventListener('click', toggleSpeed);
els.soundBtn.addEventListener('click', toggleSound);
els.pauseBtn.addEventListener('click', togglePause);

els.inspector.addEventListener('click', (event) => {
  const button = event.target.closest('[data-inspect]');
  if (!button) return;
  const tower = game.selectedTower;
  if (!tower) return;

  if (button.dataset.inspect === 'upgrade') {
    const result = game.upgrade(tower);
    flash(result.ok ? `${tower.def.name} mejorada al nivel ${tower.level}` : 'Oro insuficiente');
  } else {
    const result = game.sell(tower);
    flash(result.ok ? `Torreta vendida · +${result.refund} oro` : 'No se pudo vender');
  }
  inspectorCache = '';
});

for (const button of document.querySelectorAll('[data-build]')) {
  button.addEventListener('click', () => {
    sound.ensure();
    game.setBuildType(button.dataset.build);
    inspectorCache = '';
    syncControls();
  });
}

/* ---------- Tablero táctil ---------- */

function toWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (WORLD.width / rect.width),
    y: (event.clientY - rect.top) * (WORLD.height / rect.height),
  };
}

function handleBoardClick(point) {
  if (game.phase !== 'playing' || game.paused) return;
  sound.ensure();

  const tower = game.towerAt(point.x, point.y);
  if (tower) {
    game.selectTower(tower);
    inspectorCache = '';
    return;
  }

  if (game.buildType) {
    const cell = game.nearestBuildCell(point.x, point.y);
    if (!cell) {
      flash('Construye junto al camino');
      return;
    }
    const result = game.placeTower(game.buildType, cell);
    if (!result.ok) flash(result.reason === 'oro' ? 'Oro insuficiente' : 'Casilla ocupada');
    return;
  }

  game.selectTower(null);
  inspectorCache = '';
}

let pointer = null;

canvas.addEventListener('pointerdown', (event) => {
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  game.hover = toWorld(event);
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    /* punteros sintéticos */
  }
});

canvas.addEventListener('pointermove', (event) => {
  game.hover = toWorld(event);
});

canvas.addEventListener('pointerleave', () => {
  game.hover = null;
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
  pointer = null;
  if (moved <= 16) handleBoardClick(toWorld(event));
});

canvas.addEventListener('pointercancel', () => {
  pointer = null;
  game.hover = null;
});

/* ---------- Teclado ---------- */

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const code = event.code;

  if (code === 'Digit1' || code === 'Numpad1') game.setBuildType('basic');
  else if (code === 'Digit2' || code === 'Numpad2') game.setBuildType('rapid');
  else if (code === 'Digit3' || code === 'Numpad3') game.setBuildType('heavy');
  else if (code === 'KeyM') toggleSound();
  else if (code === 'KeyF') toggleSpeed();
  else if (code === 'KeyP') togglePause();
  else if (code === 'Escape' || code === 'KeyQ') {
    if (game.buildType || game.selectedId) {
      game.buildType = null;
      game.selectTower(null);
      inspectorCache = '';
    } else if (game.paused) togglePause();
  } else if (code === 'KeyU' && game.selectedTower) {
    const result = game.upgrade(game.selectedTower);
    flash(result.ok ? 'Mejora aplicada' : 'Oro insuficiente o nivel máximo');
    inspectorCache = '';
  } else if (code === 'KeyX' && game.selectedTower) {
    const result = game.sell(game.selectedTower);
    if (result.ok) flash(`Vendida · +${result.refund} oro`);
    inspectorCache = '';
  } else if (code === 'Space' || code === 'Enter') {
    if (event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    if (game.phase === 'idle' || game.phase === 'gameover' || game.phase === 'victory') {
      startGame();
    } else {
      sound.ensure();
      if (game.startWave()) flash(`Oleada ${game.wave} en camino`);
    }
  }
});

/* ---------- Ciclo principal ---------- */

window.addEventListener('resize', () => renderer.resize());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing' && !game.paused) {
    game.togglePause();
    syncOverlay();
  }
});

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  game.update(dt);
  renderer.render(game, now / 1000);

  syncHud();
  syncOverlay();
  syncControls();
  syncInspector();

  if (statusTimer > 0) {
    statusTimer -= dt;
    if (statusTimer <= 0) statusOverride = '';
  }

  requestAnimationFrame(frame);
}

syncHud();
syncOverlay();
syncControls();
syncInspector();

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__bastion = game;
}

/* TOWER_ORDER se expone en modo debug para revisar las tablas desde consola. */
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')) {
  window.__bastionTowers = TOWER_ORDER;
}

requestAnimationFrame(frame);
