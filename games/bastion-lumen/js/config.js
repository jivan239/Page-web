/* Configuración, mapa y tablas de Bastión Lumen. Sin dependencias externas. */

export const WORLD = Object.freeze({
  width: 720,
  height: 560,
  cell: 40,
  cols: 18,
  rows: 14,
});

export const STORAGE = Object.freeze({
  best: 'bastionLumen:bestWave',
  muted: 'bastionLumen:muted',
});

export const START_GOLD = 180;
export const BASE_HP = 100;
export const AUTO_NEXT = 6;
export const MAX_LEVEL = 4;
export const MAX_REWARDS = 2;
export const REWARD_GOLD = 100;
export const REWARD_HEAL = 30;
export const VICTORY_WAVE = 10;

export const START_MARKER = Object.freeze({ x: 18, y: 100 });
export const CORE = Object.freeze({ x: 660, y: 470 });

/* Puntos de control del circuito. Se suavizan con Catmull-Rom para que los
 * enemigos nunca se queden atorados en las esquinas. */
const WAYPOINTS = [
  { x: -34, y: 100 },
  { x: 120, y: 100 },
  { x: 300, y: 100 },
  { x: 540, y: 112 },
  { x: 616, y: 184 },
  { x: 616, y: 268 },
  { x: 520, y: 320 },
  { x: 262, y: 320 },
  { x: 132, y: 352 },
  { x: 122, y: 438 },
  { x: 232, y: 490 },
  { x: 430, y: 490 },
  { x: 580, y: 470 },
  { x: CORE.x, y: CORE.y },
];

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const half = 0.5;
  return {
    x: half * (
      2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: half * (
      2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  };
}

function buildPath(waypoints, steps) {
  const points = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)];
    for (let s = 0; s < steps; s += 1) {
      points.push(catmull(p0, p1, p2, p3, s / steps));
    }
  }
  points.push({ ...waypoints[waypoints.length - 1] });

  const cum = [0];
  for (let i = 1; i < points.length; i += 1) {
    cum[i] = cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return { points, cum, total: cum[cum.length - 1] };
}

export const PATH = Object.freeze(buildPath(WAYPOINTS, 20));

/** Posición y tangente del camino a una distancia dada desde el inicio. */
export function pointAt(distance) {
  const { points, cum, total } = PATH;
  if (distance <= 0) {
    const a = points[0];
    const b = points[1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: a.x, y: a.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
  }
  if (distance >= total) {
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: b.x, y: b.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
  }

  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= distance) lo = mid;
    else hi = mid - 1;
  }

  const a = points[lo];
  const b = points[lo + 1];
  const span = cum[lo + 1] - cum[lo] || 1;
  const t = (distance - cum[lo]) / span;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    dx: (b.x - a.x) / len,
    dy: (b.y - a.y) / len,
  };
}

function distanceToPath(x, y) {
  let best = Infinity;
  for (const point of PATH.points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/* Celdas del tablero:
 * - bloqueadas: el camino pasa por encima;
 * - disponibles: libre y lo bastante cerca del camino para ser útil. */
const GRID = (() => {
  const cells = [];
  const blocked = new Set();
  const half = WORLD.cell / 2;

  for (let row = 0; row < WORLD.rows; row += 1) {
    for (let col = 0; col < WORLD.cols; col += 1) {
      const x = col * WORLD.cell + half;
      const y = row * WORLD.cell + half;
      const key = `${col},${row}`;
      const distance = distanceToPath(x, y);
      if (distance <= 31) {
        blocked.add(key);
      } else if (distance <= 88) {
        cells.push({ col, row, x, y, key });
      }
    }
  }
  return { cells, blocked };
})();

export const BUILDABLE_CELLS = Object.freeze(GRID.cells);
export const BLOCKED_CELLS = GRID.blocked;

export const TOWERS = Object.freeze({
  basic: {
    id: 'basic',
    name: 'Básica',
    cost: 60,
    range: 112,
    damage: 17,
    rate: 1.55,
    shotSpeed: 390,
    aoe: 0,
    color: '#6fe9ff',
    description: 'Cadencia equilibrada',
  },
  rapid: {
    id: 'rapid',
    name: 'Ligera',
    cost: 95,
    range: 98,
    damage: 9,
    rate: 4.1,
    shotSpeed: 540,
    aoe: 0,
    color: '#7dffb0',
    description: 'Dispara muy rápido',
  },
  heavy: {
    id: 'heavy',
    name: 'Pesada',
    cost: 145,
    range: 132,
    damage: 46,
    rate: 0.72,
    shotSpeed: 260,
    aoe: 54,
    color: '#ffb066',
    description: 'Alto daño en área',
  },
});

export const TOWER_ORDER = Object.freeze(['basic', 'rapid', 'heavy']);

export function towerStats(def, level) {
  const step = level - 1;
  return {
    range: def.range + step * 9,
    damage: Math.round(def.damage * Math.pow(1.42, step)),
    rate: def.rate * Math.pow(1.12, step),
    aoe: def.aoe ? def.aoe + step * 5 : 0,
  };
}

export function upgradeCost(def, level) {
  return Math.round(def.cost * (0.8 + 0.55 * (level - 1)));
}

export function sellValue(tower) {
  return Math.round(tower.invested * 0.65);
}

export const ENEMIES = Object.freeze({
  scout: { name: 'Explorador', hp: 0.62, speed: 1.55, reward: 0.8, leak: 4, radius: 10, color: '#7dffb0' },
  grunt: { name: 'Andador', hp: 1, speed: 1, reward: 1, leak: 6, radius: 12, color: '#ff7a9c' },
  tank: { name: 'Bloque', hp: 2.6, speed: 0.62, reward: 1.9, leak: 12, radius: 15, color: '#c8a6ff' },
  boss: { name: 'Núcleo hostil', hp: 16, speed: 0.5, reward: 9, leak: 30, radius: 22, color: '#ffd479' },
});

/** Plan de una oleada: más enemigos, más vida y más velocidad cada vez. */
export function wavePlan(wave) {
  const types = [];
  const count = Math.min(34, 5 + wave * 2);
  for (let i = 0; i < count; i += 1) {
    let type = 'grunt';
    if (wave >= 2 && i % 3 === 1) type = 'scout';
    if (wave >= 4 && i % 4 === 2) type = 'tank';
    types.push(type);
  }
  const boss = wave % 5 === 0;
  if (boss) types.push('boss');

  return {
    wave,
    types,
    hp: Math.round(26 * Math.pow(1.19, wave - 1)),
    speed: Math.min(96, 44 + wave * 2.1),
    interval: Math.max(0.3, 0.9 - wave * 0.028),
    bonus: 20 + wave * 6,
    boss,
  };
}
