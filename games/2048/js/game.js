/* Lógica del 2048: tablero 4x4, fusiones, puntuación y recompensas. */

import { SIZE, STORAGE, RESCUE } from './config.js';
import { onGameOver } from '../../../js/monetization.js';

const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
const cloneBoard = (board) => board.map((row) => row.slice());

function linesFor(direction) {
  const lines = [];
  for (let i = 0; i < SIZE; i += 1) {
    const line = [];
    for (let j = 0; j < SIZE; j += 1) {
      if (direction === 'left') line.push({ r: i, c: j });
      else if (direction === 'right') line.push({ r: i, c: SIZE - 1 - j });
      else if (direction === 'up') line.push({ r: j, c: i });
      else line.push({ r: SIZE - 1 - j, c: i });
    }
    lines.push(line);
  }
  return lines;
}

export class Game {
  constructor({ sound } = {}) {
    this.sound = sound || { play() {}, ensure() {} };
    this.board = emptyBoard();
    this.phase = 'idle';
    this.score = 0;
    this.moves = 0;
    this.best = 0;
    this.won = false;
    this.snapshot = null;
    this.anim = null;
    this.lastCell = null;
    this.lastRescue = 0;
    this.loadBest();
  }

  loadBest() {
    try {
      const value = Number.parseInt(window.localStorage.getItem(STORAGE.best), 10);
      this.best = Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      this.best = 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem(STORAGE.best, String(this.best));
    } catch {
      /* modo privado */
    }
  }

  reset() {
    this.board = emptyBoard();
    this.phase = 'playing';
    this.score = 0;
    this.moves = 0;
    this.won = false;
    this.snapshot = null;
    this.anim = null;
    this.lastCell = null;
    this.lastRescue = 0;
    this.spawn(2);
    this.spawn(2);
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

  emptyCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (this.board[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  spawn(value = Math.random() < 0.9 ? 2 : 4) {
    const cells = this.emptyCells();
    if (!cells.length) return false;
    const cell = cells[Math.floor(Math.random() * cells.length)];
    this.board[cell.r][cell.c] = value;
    this.lastCell = cell;
    return true;
  }

  maxTile() {
    let max = 0;
    for (const row of this.board) {
      for (const value of row) if (value > max) max = value;
    }
    return max;
  }

  saveSnapshot() {
    this.snapshot = {
      board: cloneBoard(this.board),
      score: this.score,
      moves: this.moves,
    };
  }

  undo() {
    if (this.phase !== 'playing' || !this.snapshot) return false;
    this.board = cloneBoard(this.snapshot.board);
    this.score = this.snapshot.score;
    this.moves = this.snapshot.moves;
    this.snapshot = null;
    this.anim = null;
    this.lastCell = null;
    this.sound.play('move');
    return true;
  }

  /* Quita las fichas más pequeñas para no volver a perder al primer movimiento. */
  clearSmallTiles() {
    const max = this.maxTile();
    const smallest = [];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const value = this.board[r][c];
        if (value > 0 && value < max) smallest.push({ r, c, value });
      }
    }
    smallest.sort((a, b) => a.value - b.value);

    const needed = Math.max(0, RESCUE.freeCells - this.emptyCells().length);
    const count = Math.min(
      Math.max(needed, RESCUE.removeAtLeast),
      RESCUE.removeAtMost,
      smallest.length,
    );
    for (let i = 0; i < count; i += 1) {
      const { r, c } = smallest[i];
      this.board[r][c] = 0;
    }
    this.lastRescue = count;
    return count;
  }

  revive() {
    if (this.phase !== 'gameover' || !this.snapshot) return false;
    this.board = cloneBoard(this.snapshot.board);
    this.score = this.snapshot.score;
    this.moves = this.snapshot.moves;
    this.snapshot = null;
    this.phase = 'playing';
    this.anim = null;
    this.lastCell = null;
    this.clearSmallTiles();
    this.sound.play('start');
    return true;
  }

  grantTile() {
    if (this.phase !== 'playing') return false;
    const ok = this.spawn(4);
    if (ok) this.sound.play('bonus');
    return ok;
  }

  isGameOver() {
    if (this.emptyCells().length) return false;
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const value = this.board[r][c];
        if (c + 1 < SIZE && value === this.board[r][c + 1]) return false;
        if (r + 1 < SIZE && value === this.board[r + 1][c]) return false;
      }
    }
    return true;
  }

  move(direction) {
    if (this.phase !== 'playing') return false;

    this.saveSnapshot();
    const animation = { start: performance.now(), cells: [] };
    let changed = false;
    let gained = 0;

    for (const line of linesFor(direction)) {
      const filled = line.filter(({ r, c }) => this.board[r][c] > 0);
      const values = filled.map(({ r, c }) => this.board[r][c]);
      const results = [];

      for (let i = 0; i < values.length; ) {
        if (i + 1 < values.length && values[i] === values[i + 1]) {
          const value = values[i] * 2;
          results.push({ value, merged: true, from: filled[i] });
          gained += value;
          i += 2;
        } else {
          results.push({ value: values[i], merged: false, from: filled[i] });
          i += 1;
        }
      }

      line.forEach((cell, index) => {
        const result = results[index];
        const value = result ? result.value : 0;
        if (this.board[cell.r][cell.c] !== value) changed = true;
        this.board[cell.r][cell.c] = value;
        if (result) {
          animation.cells.push({
            r: cell.r,
            c: cell.c,
            fromR: result.from.r,
            fromC: result.from.c,
            merged: result.merged,
            value,
          });
        }
      });
    }

    if (!changed) {
      this.snapshot = null;
      return false;
    }

    this.score += gained;
    this.moves += 1;
    if (this.score > this.best) {
      this.best = this.score;
      this.saveBest();
    }
    if (!this.won && this.maxTile() >= 2048) this.won = true;

    this.anim = animation.cells.length ? animation : null;
    this.lastCell = null;
    this.spawn();

    if (this.isGameOver()) {
      this.phase = 'gameover';
      this.sound.play('over');
      onGameOver({ score: this.score, best: this.best, moves: this.moves, maxTile: this.maxTile() });
    } else {
      this.sound.play(gained ? 'merge' : 'move');
    }
    return true;
  }
}
