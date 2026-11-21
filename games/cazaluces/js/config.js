export const TILE = 16;
export const COLS = 28;
export const ROWS = 31;

/* Mapa original: # muro, . luz, o luz de poder, = puerta de la casa. */
export const MAZE = [
  '############################',
  '#............##............#',
  '#.##.######..##..######.##.#',
  '#o##.######..##..######.##o#',
  '#.##.######..##..######.##.#',
  '#..........................#',
  '#.##.##.############.##.##.#',
  '#.##.##.############.##.##.#',
  '#........##......##........#',
  '######.#####.##.#####.######',
  '#..........................#',
  '#.##.##.###......###.##.##.#',
  '#.##.##.#####==#####.##.##.#',
  '#.##.##.###      ###.##.##.#',
  '..........#      #..........',
  '#.##.##.###      ###.##.##.#',
  '#.##.##.############.##.##.#',
  '#.##.##.##........##.##.##.#',
  '#........##......##........#',
  '######.#####.##.#####.######',
  '#..........................#',
  '#.##.####.########.####.##.#',
  '#.##.####.##....##.####.##.#',
  '#o..##.......##.......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.########.######.########.#',
  '#.########.######.########.#',
  '#..........................#',
  '############################',
];

export const SPARK_START = { x: 12, y: 23 };
export const HOUSE_CENTER = { x: 13, y: 14 };
export const DOOR_EXIT = { x: 13, y: 11 };
export const TUNNEL_ROW = 14;

export const GHOST_DEFS = {
  brasa: {
    name: 'Brasa',
    color: '#ff5b6e',
    shape: 'hex',
    start: { x: 13, y: 11 },
    scatter: { x: 25, y: -3 },
    releaseDelay: 0,
    releaseDots: 0,
  },
  eco: {
    name: 'Eco',
    color: '#ff9ad5',
    shape: 'round',
    start: { x: 13, y: 14 },
    scatter: { x: 2, y: -3 },
    releaseDelay: 0.8,
    releaseDots: 0,
  },
  cierzo: {
    name: 'Cierzo',
    color: '#46e6ff',
    shape: 'diamond',
    start: { x: 11, y: 14 },
    scatter: { x: 27, y: 33 },
    releaseDelay: 5,
    releaseDots: 30,
  },
  musgo: {
    name: 'Musgo',
    color: '#ffb347',
    shape: 'shard',
    start: { x: 16, y: 14 },
    scatter: { x: 0, y: 33 },
    releaseDelay: 9,
    releaseDots: 60,
  },
};

export const GHOST_ORDER = ['brasa', 'eco', 'cierzo', 'musgo'];

export const DIRS = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};

/* Orden de desempate: arriba, izquierda, abajo, derecha. */
export const DIR_ORDER = ['up', 'left', 'down', 'right'];
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const COLORS = {
  wall: '#11d6c9',
  wallFill: '#04121f',
  door: '#ff8ad8',
  pellet: '#ffe6b0',
  power: '#ffd166',
  spark: '#7cf7ff',
  sparkCore: '#eaffff',
  sparkRing: 'rgba(200, 166, 255, 0.85)',
  sparkTail: 'rgba(124, 247, 255, 0.45)',
  frightened: '#2737ff',
  frightenedFlash: '#f4f7ff',
  text: '#f5f8ff',
};

export const SPEED = {
  spark: 6.2,
  ghost: 5.7,
  frightened: 3.5,
  eaten: 11.5,
  exiting: 2.8,
  tunnel: 0.55,
  elroy1: 0.08,
  elroy2: 0.16,
  levelStep: 0.18,
  levelMax: 1.45,
};

export const TIMING = {
  ready: 1.8,
  death: 1.9,
  levelClear: 2.1,
  frightBase: 7,
  frightMin: 2,
  frightStep: 0.5,
  revive: 0.6,
};

/* Alternancia scatter/chase. El último tramo dura para siempre. */
export const MODE_SCHEDULE = [
  { mode: 'scatter', time: 7 },
  { mode: 'chase', time: 20 },
  { mode: 'scatter', time: 7 },
  { mode: 'chase', time: 20 },
  { mode: 'scatter', time: 5 },
  { mode: 'chase', time: 20 },
  { mode: 'scatter', time: 5 },
  { mode: 'chase', time: Infinity },
];

export const POINTS = {
  pellet: 10,
  power: 50,
  ghosts: [200, 400, 800, 1600],
  extraLife: 10000,
};

export const STORAGE_KEY = 'cazalucesBest';
