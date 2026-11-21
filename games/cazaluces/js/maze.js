import { COLS, ROWS, MAZE, TUNNEL_ROW } from './config.js';

export const wrapX = (x) => ((x % COLS) + COLS) % COLS;

export class Maze {
  constructor() {
    this.reset();
  }

  reset() {
    this.grid = MAZE.map((row) => row.split(''));
    this.pellets = new Set();
    this.power = new Set();

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = this.grid[y][x];
        if (cell === '.') this.pellets.add(`${x},${y}`);
        else if (cell === 'o') this.power.add(`${x},${y}`);
      }
    }

    this.totalCount = this.pellets.size + this.power.size;
  }

  get remaining() {
    return this.pellets.size + this.power.size;
  }

  get total() {
    return this.totalCount;
  }

  cellAt(x, y) {
    if (y < 0 || y >= ROWS) return '#';
    return this.grid[y][wrapX(x)];
  }

  isWall(x, y) {
    return this.cellAt(x, y) === '#';
  }

  isDoor(x, y) {
    return this.cellAt(x, y) === '=';
  }

  isWalkable(x, y, allowDoor = false) {
    if (y < 0 || y >= ROWS) return false;
    const cell = this.cellAt(x, y);
    if (cell === '#') return false;
    if (cell === '=') return allowDoor;
    return true;
  }

  isTunnel(x, y) {
    return y === TUNNEL_ROW && (x <= 5 || x >= 22);
  }

  at(x, y) {
    return `${wrapX(x)},${y}`;
  }

  eat(x, y) {
    const key = this.at(x, y);
    if (this.power.delete(key)) return 'power';
    if (this.pellets.delete(key)) return 'pellet';
    return null;
  }
}
