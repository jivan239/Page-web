import {
  TILE,
  DIRS,
  OPPOSITE,
  DIR_ORDER,
  GHOST_DEFS,
  GHOST_ORDER,
  SPARK_START,
  HOUSE_CENTER,
  DOOR_EXIT,
  SPEED,
  TIMING,
  MODE_SCHEDULE,
  POINTS,
  STORAGE_KEY,
} from './config.js';
import { Maze, wrapX } from './maze.js';
import { onGameOver } from '../../../js/monetization.js';

const levelScaleFor = (level) => Math.min(1.35, 1 + (level - 1) * 0.055);

class Mover {
  constructor(tile, dir) {
    this.tile = { ...tile };
    this.dir = dir || null;
    this.lastDir = dir || 'left';
    this.progress = 0;
    this.speed = 0;
  }

  get px() {
    const d = this.dir ? DIRS[this.dir] : { x: 0, y: 0 };
    return (this.tile.x + 0.5 + d.x * this.progress) * TILE;
  }

  get py() {
    const d = this.dir ? DIRS[this.dir] : { x: 0, y: 0 };
    return (this.tile.y + 0.5 + d.y * this.progress) * TILE;
  }

  reverse() {
    if (!this.dir) return;
    if (this.progress > 0) {
      const d = DIRS[this.dir];
      this.tile = { x: this.tile.x + d.x, y: this.tile.y + d.y };
      this.progress = 1 - this.progress;
    }
    this.dir = OPPOSITE[this.dir];
    this.lastDir = this.dir;
  }

  canWalk(maze, dirName, allowDoor = false) {
    const d = DIRS[dirName];
    return maze.isWalkable(wrapX(this.tile.x + d.x), this.tile.y + d.y, allowDoor);
  }

  advance(dt, maze, allowDoor, onArrive) {
    let remaining = this.speed * dt;
    let guard = 0;

    while (remaining > 1e-9 && guard < 12) {
      guard += 1;

      if (this.progress < 1e-9) {
        this.progress = 0;
        const next = this.pickDirection(maze, allowDoor);
        if (next) {
          this.dir = next;
          this.lastDir = next;
        }
        if (!this.dir || !this.canWalk(maze, this.dir, allowDoor)) break;
      }

      const step = Math.min(remaining, 1 - this.progress);
      this.progress += step;
      remaining -= step;

      if (this.progress >= 1 - 1e-9) {
        const d = this.dir ? DIRS[this.dir] : null;
        if (!d) {
          this.progress = 0;
          break;
        }
        this.tile = {
          x: wrapX(this.tile.x + d.x),
          y: this.tile.y + d.y,
        };
        this.progress = 0;
        if (onArrive) onArrive(this.tile, this);
        /* Al llegar a la casa el núcleo se detiene a revivir. */
        if (!this.dir) break;
      }
    }
  }

  pickDirection() {
    return this.dir;
  }
}

class Spark extends Mover {
  constructor() {
    super(SPARK_START, 'left');
    this.nextDir = 'left';
    this.speed = SPEED.spark;
  }

  update(dt, maze, onEat) {
    if (this.nextDir && this.dir && this.nextDir === OPPOSITE[this.dir]) {
      this.reverse();
      this.dir = this.nextDir;
      this.nextDir = null;
    }

    let remaining = this.speed * dt;
    let guard = 0;

    while (remaining > 1e-9 && guard < 12) {
      guard += 1;

      if (this.progress < 1e-9) {
        this.progress = 0;
        if (this.nextDir && this.canWalk(maze, this.nextDir)) {
          this.dir = this.nextDir;
          this.lastDir = this.dir;
          this.nextDir = null;
        }
        if (!this.dir || !this.canWalk(maze, this.dir)) {
          this.dir = null;
          break;
        }
      }

      const step = Math.min(remaining, 1 - this.progress);
      this.progress += step;
      remaining -= step;

      if (this.progress >= 1 - 1e-9) {
        const d = DIRS[this.dir];
        this.tile = {
          x: wrapX(this.tile.x + d.x),
          y: this.tile.y + d.y,
        };
        this.progress = 0;
        this.lastDir = this.dir;
        onEat(this.tile);
      }
    }
  }
}

class Ghost extends Mover {
  constructor(name, def) {
    super(def.start, 'left');
    this.name = name;
    this.def = def;
    this.state = 'house';
    this.houseTimer = def.releaseDelay;
    this.reviveTimer = 0;
    this.speed = SPEED.ghost;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  get allowDoor() {
    return this.state === 'exiting' || this.state === 'eaten' || this.state === 'reviving';
  }

  getTarget(game) {
    if (this.state === 'eaten') return HOUSE_CENTER;
    if (this.state === 'exiting' || this.state === 'reviving') return DOOR_EXIT;
    if (this.state === 'frightened') return null;
    if (this.state === 'scatter') return this.def.scatter;

    const spark = game.spark;
    const tile = spark.tile;
    const heading = DIRS[spark.lastDir] || DIRS.right;

    if (this.name === 'brasa') {
      return { x: tile.x, y: tile.y };
    }

    if (this.name === 'eco') {
      let tx = tile.x + heading.x * 4;
      let ty = tile.y + heading.y * 4;
      /* Eco apunta cuatro casillas por delante; al mirar arriba también se desplaza a la izquierda. */
      if (spark.lastDir === 'up') tx -= 4;
      return { x: tx, y: ty };
    }

    if (this.name === 'cierzo') {
      let px = tile.x + heading.x * 2;
      let py = tile.y + heading.y * 2;
      if (spark.lastDir === 'up') px -= 2;
      const brasa = game.ghosts.find((ghost) => ghost.name === 'brasa');
      const bx = brasa ? brasa.tile.x : 0;
      const by = brasa ? brasa.tile.y : 0;
      return { x: px * 2 - bx, y: py * 2 - by };
    }

    /* Musgo: cobarde a menos de 8 casillas. */
    const dx = tile.x - this.tile.x;
    const dy = tile.y - this.tile.y;
    if (dx * dx + dy * dy > 64) return { x: tile.x, y: tile.y };
    return this.def.scatter;
  }

  /**
   * Primer paso del camino más corto hasta `target` (BFS).
   * Se usa para el núcleo que regresa y para salir de la casa: la persecución voraz
   * puede quedar atrapada en mínimos locales en algunas zonas del laberinto.
   */
  findStepTo(maze, target) {
    const goalKey = `${wrapX(target.x)},${target.y}`;
    const startKey = `${wrapX(this.tile.x)},${this.tile.y}`;
    if (startKey === goalKey) return null;

    const queue = [{ x: this.tile.x, y: this.tile.y, first: null }];
    const seen = new Set([startKey]);
    let head = 0;

    while (head < queue.length) {
      const current = queue[head];
      head += 1;

      for (const name of DIR_ORDER) {
        const d = DIRS[name];
        const nx = wrapX(current.x + d.x);
        const ny = current.y + d.y;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !maze.isWalkable(nx, ny, true)) continue;

        const first = current.first || name;
        if (key === goalKey) return first;

        seen.add(key);
        queue.push({ x: nx, y: ny, first });
      }
    }

    return null;
  }

  pickDirection(maze) {
    if (this.state === 'eaten') {
      const step = this.findStepTo(maze, HOUSE_CENTER);
      if (step) return step;
    }

    if (this.state === 'exiting' || this.state === 'reviving') {
      const step = this.findStepTo(maze, DOOR_EXIT);
      if (step) return step;
    }

    const reverse = this.dir ? OPPOSITE[this.dir] : null;
    const options = [];

    for (const name of DIR_ORDER) {
      if (name === reverse) continue;
      const d = DIRS[name];
      const nx = wrapX(this.tile.x + d.x);
      const ny = this.tile.y + d.y;
      if (!maze.isWalkable(nx, ny, this.allowDoor)) continue;
      options.push({ name, nx, ny });
    }

    if (options.length === 0) {
      if (reverse) {
        const d = DIRS[reverse];
        if (maze.isWalkable(wrapX(this.tile.x + d.x), this.tile.y + d.y, this.allowDoor)) {
          return reverse;
        }
      }
      return this.dir;
    }

    if (this.state === 'frightened') {
      return options[Math.floor(Math.random() * options.length)].name;
    }

    const target = this.getTarget(this.game);
    if (!target) return options[Math.floor(Math.random() * options.length)].name;

    let best = options[0];
    let bestDistance = Infinity;
    for (const option of options) {
      const dx = option.nx - target.x;
      const dy = option.ny - target.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance - 1e-9) {
        bestDistance = distance;
        best = option;
      }
    }
    return best.name;
  }

  update(dt, game) {
    this.game = game;
    if (this.state === 'house' || this.state === 'reviving') return;
    this.advance(dt, game.maze, this.allowDoor, (tile) => this.onArrive(tile, game));
  }

  onArrive(tile, game) {
    if (this.state === 'exiting' && tile.x === DOOR_EXIT.x && tile.y === DOOR_EXIT.y) {
      this.state = game.frightTimer > 0 ? 'frightened' : game.mode;
      return;
    }

    if (this.state === 'eaten' && tile.x === HOUSE_CENTER.x && tile.y === HOUSE_CENTER.y) {
      this.state = 'reviving';
      this.reviveTimer = TIMING.revive;
      this.dir = null;
    }
  }
}

export class Game {
  constructor({ sound }) {
    this.sound = sound;
    this.maze = new Maze();
    this.phase = 'idle';
    this.score = 0;
    this.best = this.readBest();
    this.level = 1;
    this.lives = 3;
    this.extraLifeGiven = false;
    this.readyTimer = 0;
    this.deathTimer = 0;
    this.levelTimer = 0;
    this.frightTimer = 0;
    this.ghostCombo = 0;
    this.dotsEaten = 0;
    this.dotsThisLife = 0;
    this.mode = 'scatter';
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.lastPhase = '';
    this.resetPositions();
  }

  readBest() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  saveBest() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.best));
    } catch (error) {
      /* modo privado */
    }
  }

  resetPositions() {
    this.spark = new Spark();

    this.ghosts = GHOST_ORDER.map((name) => {
      const ghost = new Ghost(name, GHOST_DEFS[name]);
      if (name === 'brasa') {
        ghost.state = this.mode;
        ghost.dir = 'left';
      } else {
        ghost.state = 'house';
        ghost.houseTimer = GHOST_DEFS[name].releaseDelay;
        ghost.dir = 'left';
      }
      return ghost;
    });

    this.frightTimer = 0;
    this.ghostCombo = 0;
    this.dotsThisLife = 0;
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.extraLifeGiven = false;
    this.maze.reset();
    this.dotsEaten = 0;
    this.dotsThisLife = 0;
    this.mode = 'scatter';
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.resetPositions();
    this.phase = 'ready';
    this.readyTimer = TIMING.ready;
    this.sound.start();
  }

  togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.saveBest();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
    }
  }

  setDirection(dir) {
    if (this.phase === 'playing' || this.phase === 'ready') {
      this.spark.nextDir = dir;
    }
  }

  update(dt) {
    if (this.phase === 'ready') {
      this.readyTimer -= dt;
      if (this.readyTimer <= 0) this.phase = 'playing';
      return;
    }

    if (this.phase === 'dying') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) {
          this.phase = 'gameover';
          this.saveBest();
          /* Punto centralizado: aquí se conectará el intersticial de AdSense. */
          onGameOver({
            score: this.score,
            best: this.best,
            level: this.level,
            defeated: this.ghostCombo,
          });
        } else {
          this.resetPositions();
          this.phase = 'ready';
          this.readyTimer = TIMING.ready;
        }
      }
      return;
    }

    if (this.phase === 'levelclear') {
      this.levelTimer -= dt;
      if (this.levelTimer <= 0) this.nextLevel();
      return;
    }

    if (this.phase !== 'playing') return;

    this.updateModes(dt);
    this.updateFright(dt);
    this.updateHouse(dt);

    const scale = levelScaleFor(this.level);
    const inTunnel = this.maze.isTunnel(this.spark.tile.x, this.spark.tile.y);
    this.spark.speed = SPEED.spark * scale * (inTunnel ? 0.82 : 1);
    this.spark.update(dt, this.maze, (tile) => this.eatAt(tile));

    for (const ghost of this.ghosts) {
      ghost.speed = this.getGhostSpeed(ghost, scale);
      ghost.update(dt, this);
    }

    this.checkCollisions();
    this.checkLevelClear();
  }

  updateModes(dt) {
    if (this.frightTimer > 0) return;

    this.modeTimer += dt;
    const segment = MODE_SCHEDULE[this.modeIndex];
    if (this.modeTimer < segment.time) return;

    this.modeTimer = 0;
    if (this.modeIndex < MODE_SCHEDULE.length - 1) {
      this.modeIndex += 1;
      this.mode = MODE_SCHEDULE[this.modeIndex].mode;
      for (const ghost of this.ghosts) {
        if (ghost.state === 'scatter' || ghost.state === 'chase') {
          ghost.state = this.mode;
          ghost.reverse();
        }
      }
    }
  }

  updateFright(dt) {
    if (this.frightTimer <= 0) return;
    this.frightTimer -= dt;
    if (this.frightTimer > 0) return;

    this.frightTimer = 0;
    for (const ghost of this.ghosts) {
      if (ghost.state === 'frightened') ghost.state = this.mode;
    }
  }

  updateHouse(dt) {
    for (const ghost of this.ghosts) {
      if (ghost.state === 'house') {
        ghost.houseTimer -= dt;
        const byDots = ghost.def.releaseDots > 0 && this.dotsThisLife >= ghost.def.releaseDots;
        if (ghost.houseTimer <= 0 || byDots) {
          ghost.state = 'exiting';
          ghost.dir = null;
        }
      } else if (ghost.state === 'reviving') {
        ghost.reviveTimer -= dt;
        if (ghost.reviveTimer <= 0) {
          ghost.state = 'exiting';
          ghost.dir = null;
        }
      }
    }
  }

  getGhostSpeed(ghost, scale) {
    if (ghost.state === 'eaten') return SPEED.eaten * scale;
    if (ghost.state === 'frightened') return SPEED.frightened * scale;
    if (ghost.state === 'exiting') return SPEED.exiting * scale;

    let speed = SPEED.ghost;
    if (this.maze.isTunnel(ghost.tile.x, ghost.tile.y)) speed *= SPEED.tunnel;

    if (ghost.name === 'brasa') {
      const remaining = this.maze.remaining;
      if (remaining <= 10) speed *= 1 + SPEED.elroy2;
      else if (remaining <= 20) speed *= 1 + SPEED.elroy1;
    }

    return speed * scale;
  }

  eatAt(tile) {
    const kind = this.maze.eat(tile.x, tile.y);
    if (!kind) return;

    this.dotsEaten += 1;
    this.dotsThisLife += 1;

    if (kind === 'power') {
      this.addScore(POINTS.power);
      this.sound.power();
      this.triggerFright();
    } else {
      this.addScore(POINTS.pellet);
      this.sound.chomp();
    }
  }

  triggerFright() {
    this.frightTimer = Math.max(
      TIMING.frightMin,
      TIMING.frightBase - (this.level - 1) * TIMING.frightStep,
    );
    this.ghostCombo = 0;

    for (const ghost of this.ghosts) {
      if (ghost.state === 'scatter' || ghost.state === 'chase') {
        ghost.reverse();
        ghost.state = 'frightened';
      }
    }
  }

  addScore(points) {
    this.score += points;
    if (!this.extraLifeGiven && this.score >= POINTS.extraLife) {
      this.extraLifeGiven = true;
      this.lives += 1;
      this.sound.extraLife();
    }
    if (this.score > this.best) this.best = this.score;
  }

  eatGhost(ghost) {
    const value = POINTS.ghosts[Math.min(this.ghostCombo, POINTS.ghosts.length - 1)];
    this.ghostCombo += 1;
    this.addScore(value);
    ghost.state = 'eaten';
    ghost.dir = ghost.dir || 'left';
    this.sound.eatGhost();
  }

  hitSpark() {
    this.lives -= 1;
    this.phase = 'dying';
    this.deathTimer = TIMING.death;
    this.frightTimer = 0;
    this.sound.death();
  }

  /* Recompensa de vida: se puede pedir en partida o desde el fin de partida. */
  grantLife() {
    if (this.phase !== 'playing') return false;
    this.lives += 1;
    this.sound.extraLife();
    return true;
  }

  reviveWithLife() {
    if (this.phase !== 'gameover') return false;
    this.lives = 1;
    this.resetPositions();
    this.phase = 'ready';
    this.readyTimer = TIMING.ready;
    this.sound.extraLife();
    return true;
  }

  /* Recompensa adicional: asusta a todas las sombras activas. */
  scareGhosts() {
    if (this.phase !== 'playing' && this.phase !== 'ready') return false;
    this.triggerFright();
    this.sound.power();
    return true;
  }

  checkCollisions() {
    if (this.phase !== 'playing') return;

    const radius = TILE * 0.72;
    const radiusSq = radius * radius;

    for (const ghost of this.ghosts) {
      if (ghost.state === 'house' || ghost.state === 'eaten' || ghost.state === 'reviving') {
        continue;
      }
      if (ghost.state === 'exiting' && ghost.tile.y >= 12) continue;

      const dx = ghost.px - this.spark.px;
      const dy = ghost.py - this.spark.py;
      if (dx * dx + dy * dy > radiusSq) continue;

      if (ghost.state === 'frightened') {
        this.eatGhost(ghost);
      } else {
        this.hitSpark();
        return;
      }
    }
  }

  checkLevelClear() {
    if (this.phase !== 'playing' || this.maze.remaining > 0) return;
    this.phase = 'levelclear';
    this.levelTimer = TIMING.levelClear;
    this.sound.levelClear();
  }

  nextLevel() {
    this.level += 1;
    this.maze.reset();
    this.dotsEaten = 0;
    this.dotsThisLife = 0;
    this.mode = 'scatter';
    this.modeIndex = 0;
    this.modeTimer = 0;
    this.resetPositions();
    this.phase = 'ready';
    this.readyTimer = TIMING.ready;
  }
}
