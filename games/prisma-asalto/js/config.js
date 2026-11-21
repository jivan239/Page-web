// Resolución lógica del juego. El canvas se escala por CSS y DPR.
export const WIDTH = 960;
export const HEIGHT = 720;

export const PLAYER = {
  width: 44,
  height: 24,
  speed: 470,
  margin: 26,
  lives: 3,
  invulnerability: 2.4,
};

export const BULLET = {
  width: 4,
  height: 16,
  speed: 800,
  enemySpeed: 300,
  cooldown: 0.26,
  maxPlayer: 2,
  maxEnemy: 4,
};

export const FORMATION = {
  cols: 11,
  rows: 5,
  cellW: 62,
  cellH: 46,
  invaderW: 32,
  invaderH: 24,
  top: 118,
  marginX: 38,
  drop: 18,
  baseSpeed: 26,
  maxSpeed: 330,
};

export const BARRIER = {
  count: 4,
  cols: 9,
  rows: 6,
  cell: 8,
  top: 496,
};

export const UFO = {
  width: 52,
  height: 22,
  y: 76,
  speed: 145,
  minDelay: 16,
  maxDelay: 28,
  points: [50, 100, 150, 200, 300],
};

export const STORAGE = {
  highScore: 'prismaAsalto:highscore',
  muted: 'prismaAsalto:muted',
};

export const COLORS = {
  player: '#5ef2c0',
  bullet: '#f2fbff',
  enemyBullet: '#ff5d7a',
  aguja: '#ff6ec7',
  cristal: '#5ad2ff',
  nucleo: '#a6ff5e',
  ufo: '#ff5d7a',
  barrier: '#35d9d0',
  text: '#cfe1ff',
  accent: '#7aa2ff',
};

// Arte en píxeles: cada 'X' se dibuja como un bloque.
export const SPRITES = {
  player: [
    '.....X.....',
    '....XXX....',
    '...XX.XX...',
    '..XX...XX..',
    '.XXX.X.XXX.',
    'XXXXXXXXXXX',
    'XX.X...X.XX',
    'X.........X',
  ],
  ufo: [
    '...XXXXXX...',
    '..XXXXXXXX..',
    '.XX.XXXX.XX.',
    'XXXXXXXXXXXX',
    '..XX.XX.XX..',
    '...X....X...',
  ],
  aguja: [
    [
      '...XX...',
      '..XXXX..',
      '.XX..XX.',
      'XX.XX.XX',
      'XXXXXXXX',
      '.X.XX.X.',
      '..XXXX..',
      '..X..X..',
    ],
    [
      '...XX...',
      '..XXXX..',
      '.XX..XX.',
      'XX.XX.XX',
      'XXXXXXXX',
      '..XXXX..',
      '.X.XX.X.',
      'X.X..X.X',
    ],
  ],
  cristal: [
    [
      '....XXX....',
      '..XXXXXXX..',
      '.XX.XXX.XX.',
      'XXXX.XX.XXX',
      'XXXXXXXXXXX',
      '.XX.XXX.XX.',
      '..XX...XX..',
      '..X.....X..',
    ],
    [
      '....XXX....',
      '..XXXXXXX..',
      '.XX.XXX.XX.',
      'XXXXXXXXXXX',
      'XXX.XXX.XXX',
      '.XX.XXX.XX.',
      '..XX...XX..',
      '.X.......X.',
    ],
  ],
  nucleo: [
    [
      '...XXXXXX...',
      '..XXXXXXXX..',
      '.XXX.XX.XXX.',
      'XXXXXXXXXXXX',
      'XX.XXXXXX.XX',
      '...XX..XX...',
      '..XX.XX.XX..',
      '.XX......XX.',
    ],
    [
      '...XXXXXX...',
      '..XXXXXXXX..',
      '.XXX.XX.XXX.',
      'XXXXXXXXXXXX',
      'XX.XXXXXX.XX',
      '..XXX..XXX..',
      '.XX..XX..XX.',
      'XX..X..X..XX',
    ],
  ],
};
