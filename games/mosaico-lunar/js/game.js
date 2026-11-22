import {
  COLS,
  ROWS,
  RESCUE_ROWS,
  TESSERAS,
  TESSERA_TYPES,
  TIMING,
  SCORE,
  STORAGE,
} from './config.js';
import { onGameOver } from '../../../js/monetization.js';

const shuffle = (list) => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const rotateMatrix = (matrix, dir) => {
  const size = matrix.length;
  const out = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!matrix[y][x]) continue;
      if (dir > 0) out[x][size - 1 - y] = 1;
      else out[size - 1 - x][y] = 1;
    }
  }
  return out;
};

const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
];

export class Game {
  constructor({ sound } = {}) {
    this.sound = sound || { play() {}, ensure() {} };
    this.board = this.emptyBoard();
    this.best = 0;
    this.loadBest();

    this.phase = 'idle';
    this.score = 0;
    this.lines = 0;
    this.level = 1;

    this.queue = [];
    this.bag = [];
    this.hold = null;
    this.holdUsed = false;
    this.piece = null;

    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.clearTimer = 0;
    this.clearingRows = [];
    this.particles = [];
  }

  emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  loadBest() {
    try {
      const stored = Number.parseInt(localStorage.getItem(STORAGE.best), 10);
      this.best = Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch (error) {
      this.best = 0;
    }
  }

  saveBest() {
    try {
      localStorage.setItem(STORAGE.best, String(this.best));
    } catch (error) {
      /* modo privado */
    }
  }

  reset() {
    this.board = this.emptyBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.queue = [];
    this.bag = [];
    this.hold = null;
    this.holdUsed = false;
    this.piece = null;
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.clearTimer = 0;
    this.clearingRows = [];
    this.particles = [];
    this.fillQueue();
    this.spawn();
    this.phase = 'playing';
  }

  start() {
    this.reset();
    this.sound.play('start');
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
    return this.phase;
  }

  fillQueue() {
    while (this.queue.length < 4) {
      if (!this.bag.length) this.bag = shuffle(TESSERA_TYPES);
      this.queue.push(this.bag.pop());
    }
  }

  dropInterval() {
    return Math.max(0.075, 0.85 * Math.pow(0.84, this.level - 1));
  }

  collides(x, y, matrix) {
    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const bx = x + col;
        const by = y + row;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    }
    return false;
  }

  grounded() {
    return Boolean(
      this.piece && this.collides(this.piece.x, this.piece.y + 1, this.piece.matrix),
    );
  }

  resetLockTimer() {
    if (this.lockResets >= TIMING.maxLockResets) return;
    this.lockResets += 1;
    this.lockTimer = 0;
  }

  spawnType(type) {
    const def = TESSERAS[type];
    const matrix = def.matrix.map((row) => row.slice());
    this.piece = {
      type,
      matrix,
      x: Math.floor((COLS - matrix.length) / 2),
      y: 0,
    };
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.holdUsed = false;

    if (this.collides(this.piece.x, this.piece.y, matrix)) this.endGame();
  }

  spawn() {
    if (this.queue.length < 1) this.fillQueue();
    const type = this.queue.shift();
    this.fillQueue();
    this.spawnType(type);
  }

  move(dx) {
    if (this.phase !== 'playing' || !this.piece) return false;
    if (this.collides(this.piece.x + dx, this.piece.y, this.piece.matrix)) return false;
    this.piece.x += dx;
    if (this.grounded()) this.resetLockTimer();
    this.sound.play('move');
    return true;
  }

  rotate(dir = 1) {
    if (this.phase !== 'playing' || !this.piece) return false;
    const rotated = rotateMatrix(this.piece.matrix, dir);

    for (const [dx, dy] of KICKS) {
      const x = this.piece.x + dx;
      const y = this.piece.y + dy;
      if (this.collides(x, y, rotated)) continue;

      this.piece.matrix = rotated;
      this.piece.x = x;
      this.piece.y = y;
      if (this.grounded()) this.resetLockTimer();
      this.sound.play('rotate');
      return true;
    }
    return false;
  }

  softDrop() {
    if (this.phase !== 'playing' || !this.piece) return false;
    if (this.collides(this.piece.x, this.piece.y + 1, this.piece.matrix)) return false;

    this.piece.y += 1;
    this.addScore(SCORE.soft);
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.sound.play('soft');
    return true;
  }

  hardDrop() {
    if (this.phase !== 'playing' || !this.piece) return false;

    let distance = 0;
    while (!this.collides(this.piece.x, this.piece.y + 1, this.piece.matrix)) {
      this.piece.y += 1;
      distance += 1;
    }
    this.addScore(distance * SCORE.hard);
    this.sound.play('hard');
    this.lockPiece();
    return true;
  }

  holdPiece() {
    if (this.phase !== 'playing' || !this.piece || this.holdUsed) return false;

    const current = this.piece.type;
    if (this.hold) {
      const swap = this.hold;
      this.hold = current;
      this.spawnType(swap);
    } else {
      this.hold = current;
      this.spawn();
    }
    this.holdUsed = true;
    this.sound.play('hold');
    return true;
  }

  lockPiece() {
    if (!this.piece || this.phase !== 'playing') return;

    const { x, y, matrix, type } = this.piece;
    let above = false;

    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const bx = x + col;
        const by = y + row;
        if (by < 0) above = true;
        else this.board[by][bx] = type;
      }
    }

    this.piece = null;
    if (above) {
      this.phase = 'gameover';
      this.saveBest();
      this.sound.play('gameover');
      /* Punto centralizado: aquí se conectará el intersticial de AdSense. */
      onGameOver({ score: this.score, best: this.best, level: this.level, lines: this.lines });
      return;
    }

    this.sound.play('lock');

    const rows = [];
    for (let row = 0; row < ROWS; row += 1) {
      if (this.board[row].every((cell) => cell)) rows.push(row);
    }

    if (!rows.length) {
      this.spawn();
      return;
    }

    this.phase = 'clearing';
    this.clearingRows = rows;
    this.clearTimer = TIMING.clear;

    const table = [0, SCORE.single, SCORE.double, SCORE.triple, SCORE.quad];
    this.addScore(table[rows.length] * this.level);
    this.lines += rows.length;

    const nextLevel = Math.floor(this.lines / 10) + 1;
    const leveled = nextLevel > this.level;
    this.level = nextLevel;

    this.spawnBurst(rows);
    this.sound.play(rows.length === 4 ? 'quad' : 'clear');
    if (leveled) this.sound.play('level');
  }

  finishClear() {
    this.board = this.board.filter((row, index) => !this.clearingRows.includes(index));
    while (this.board.length < ROWS) {
      this.board.unshift(Array(COLS).fill(null));
    }
    this.clearingRows = [];
    this.phase = 'playing';
    this.spawn();
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.best) this.best = this.score;
  }

  spawnBurst(rows) {
    for (const row of rows) {
      for (let col = 0; col < COLS; col += 1) {
        const type = this.board[row][col];
        const def = TESSERAS[type];
        if (!def) continue;
        for (let i = 0; i < 2; i += 1) {
          this.particles.push({
            x: col + 0.5 + (Math.random() - 0.5) * 0.6,
            y: row + 0.5 + (Math.random() - 0.5) * 0.4,
            vx: (Math.random() - 0.5) * 7,
            vy: -1.4 - Math.random() * 4,
            life: 0.45 + Math.random() * 0.35,
            max: 0.8,
            color: Math.random() < 0.4 ? def.glare : def.color,
          });
        }
      }
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  updateParticles(dt) {
    if (!this.particles.length) return;
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 8 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  endGame() {
    this.phase = 'gameover';
    this.piece = null;
    this.saveBest();
    this.sound.play('gameover');
    /* Punto centralizado: aquí se conectará el intersticial de AdSense. */
    onGameOver({ score: this.score, best: this.best, level: this.level, lines: this.lines });
  }

  /* Vida extra: limpia cinco filas superiores y vuelve a spawnar. */
  reviveWithClear() {
    if (this.phase !== 'gameover') return false;
    this.clearingRows = Array.from({ length: RESCUE_ROWS }, (_, index) => index);
    this.clearTimer = TIMING.clear;
    this.phase = 'clearing';
    this.saveBest();
    this.sound.play('clear');
    return true;
  }

  /* Recompensa adicional: coloca una tesela Vara al frente de la cola. */
  grantVara() {
    if (this.phase !== 'playing') return false;
    this.queue.unshift('vara');
    this.fillQueue();
    this.sound.play('hold');
    return true;
  }

  update(dt) {
    if (this.phase !== 'paused' && this.phase !== 'idle') this.updateParticles(dt);

    if (this.phase === 'clearing') {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.finishClear();
      return;
    }

    if (this.phase !== 'playing' || !this.piece) return;

    if (this.grounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= TIMING.lock) this.lockPiece();
      return;
    }

    this.lockTimer = 0;
    this.gravityTimer += dt;

    const interval = this.dropInterval();
    while (this.gravityTimer >= interval) {
      this.gravityTimer -= interval;
      if (this.collides(this.piece.x, this.piece.y + 1, this.piece.matrix)) break;
      this.piece.y += 1;
    }
  }
}
