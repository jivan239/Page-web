export const COLS = 10;
export const ROWS = 20;

export const CELL = 28;
export const BOARD_X = 18;
export const BOARD_Y = 20;
export const BOARD_W = COLS * CELL;
export const BOARD_H = ROWS * CELL;

export const CANVAS_W = 460;
export const CANVAS_H = BOARD_H + BOARD_Y * 2;

export const SIDE_X = BOARD_X + BOARD_W + 22;
export const SIDE_W = CANVAS_W - SIDE_X - 16;

export const PREVIEW_CELL = 12;

/* Paleta propia: noche, oro y cuarzo. */
export const COLORS = {
  bgTop: '#080c1e',
  bgBottom: '#04060f',
  boardTop: '#0b1228',
  boardBottom: '#050814',
  grid: 'rgba(130, 166, 255, 0.075)',
  frame: 'rgba(255, 212, 121, 0.4)',
  frameGlow: 'rgba(255, 176, 102, 0.22)',
  ghost: 'rgba(223, 233, 255, 0.16)',
  text: '#dfe9ff',
  label: '#6f84ad',
  faint: '#465a80',
  clear: '#fff8e0',
  sidePanel: 'rgba(255, 255, 255, 0.035)',
  sideLine: 'rgba(255, 255, 255, 0.08)',
};

/*
 * Siete teselas originales. Cada una ocupa cuatro celdas y se llama
 * por su forma, no por ninguna nomenclatura de marca.
 */
export const TESSERAS = {
  vara: {
    name: 'Vara',
    color: '#6fe9ff',
    glare: '#d6fbff',
    deep: '#0b5a78',
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  dado: {
    name: 'Dado',
    color: '#ffd479',
    glare: '#fff3c4',
    deep: '#8a5a12',
    matrix: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  cruz: {
    name: 'Cruz',
    color: '#c8a6ff',
    glare: '#f0e4ff',
    deep: '#4b2d80',
    matrix: [
      [0, 0, 0, 0],
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  sierpe: {
    name: 'Sierpe',
    color: '#7dffb0',
    glare: '#dcffe9',
    deep: '#116b46',
    matrix: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  rayo: {
    name: 'Rayo',
    color: '#ff7a9c',
    glare: '#ffd8e1',
    deep: '#7a1f3d',
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  gancho: {
    name: 'Gancho',
    color: '#6fa8ff',
    glare: '#d8e6ff',
    deep: '#1b3f8a',
    matrix: [
      [0, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  esquina: {
    name: 'Esquina',
    color: '#ffb066',
    glare: '#ffe6cc',
    deep: '#7a3d10',
    matrix: [
      [0, 0, 0, 0],
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
};

export const TESSERA_TYPES = Object.keys(TESSERAS);

export const TIMING = {
  lock: 0.42,
  clear: 0.3,
  maxLockResets: 15,
};

export const SCORE = {
  single: 100,
  double: 300,
  triple: 500,
  quad: 800,
  soft: 1,
  hard: 2,
};

export const STORAGE = {
  best: 'mosaicoLunar:best',
  muted: 'mosaicoLunar:muted',
};
