import {
  WIDTH,
  HEIGHT,
  PLAYER,
  FORMATION,
  BARRIER,
  COLORS,
  SPRITES,
} from './config.js';
import { clamp, drawSprite } from './utils.js';

export class Player {
  constructor() {
    this.w = PLAYER.width;
    this.h = PLAYER.height;
    this.alive = true;
    this.respawn();
  }

  respawn() {
    this.x = WIDTH / 2;
    this.y = HEIGHT - 74;
    this.invuln = PLAYER.invulnerability;
  }

  update(dt, dir, targetX) {
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (!this.alive) return;

    if (targetX != null) {
      const diff = targetX - this.x;
      const step = PLAYER.speed * dt;
      this.x += clamp(diff, -step, step);
    } else if (dir !== 0) {
      this.x += dir * PLAYER.speed * dt;
    }

    const half = this.w / 2;
    this.x = clamp(this.x, PLAYER.margin + half, WIDTH - PLAYER.margin - half);
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0) return;

    ctx.save();
    ctx.shadowColor = 'rgba(94, 242, 192, 0.8)';
    ctx.shadowBlur = 18;
    drawSprite(
      ctx,
      SPRITES.player,
      this.x - this.w / 2,
      this.y - this.h / 2,
      this.w,
      this.h,
      COLORS.player,
    );
    ctx.restore();
  }
}

export class Formation {
  constructor(wave = 1) {
    this.wave = wave;
    this.cols = FORMATION.cols;
    this.rows = FORMATION.rows;
    this.invaders = [];
    this.dir = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.frame = 0;
    this.animTimer = 0;
    this.originX =
      (WIDTH - (this.cols - 1) * FORMATION.cellW - FORMATION.invaderW) / 2;
    this.originY = FORMATION.top;
    this.aliveCount = 0;

    for (let row = 0; row < this.rows; row += 1) {
      const type = this.typeForRow(row);
      for (let col = 0; col < this.cols; col += 1) {
        this.invaders.push({
          col,
          row,
          type,
          alive: true,
          x: 0,
          y: 0,
          w: FORMATION.invaderW,
          h: FORMATION.invaderH,
        });
        this.aliveCount += 1;
      }
    }

    this.total = this.aliveCount;
    this.updatePositions();
  }

  typeForRow(row) {
    if (row === 0) return 'aguja';
    if (row < 3) return 'cristal';
    return 'nucleo';
  }

  get threat() {
    return 1 - this.aliveCount / this.total;
  }

  get speed() {
    return Math.min(
      FORMATION.maxSpeed,
      FORMATION.baseSpeed + this.threat * 250 + (this.wave - 1) * 14,
    );
  }

  updatePositions() {
    for (const invader of this.invaders) {
      invader.x = this.originX + invader.col * FORMATION.cellW + this.offsetX;
      invader.y = this.originY + invader.row * FORMATION.cellH + this.offsetY;
    }
  }

  bounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      if (invader.x < minX) minX = invader.x;
      if (invader.x + invader.w > maxX) maxX = invader.x + invader.w;
      if (invader.y + invader.h > maxY) maxY = invader.y + invader.h;
    }

    return { minX, maxX, maxY };
  }

  maxY() {
    return this.bounds().maxY;
  }

  update(dt) {
    if (this.aliveCount <= 0) return;

    this.offsetX += this.dir * this.speed * dt;
    this.updatePositions();

    const { minX, maxX } = this.bounds();
    const margin = FORMATION.marginX;

    if (this.dir > 0 && maxX > WIDTH - margin) {
      this.offsetX -= maxX - (WIDTH - margin);
      this.dir = -1;
      this.offsetY += FORMATION.drop;
    } else if (this.dir < 0 && minX < margin) {
      this.offsetX += margin - minX;
      this.dir = 1;
      this.offsetY += FORMATION.drop;
    }

    this.animTimer += dt;
    const interval = Math.max(0.12, 0.46 - this.threat * 0.26);
    if (this.animTimer >= interval) {
      this.animTimer -= interval;
      this.frame = this.frame === 0 ? 1 : 0;
    }

    this.updatePositions();
  }

  draw(ctx) {
    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      const sprite = SPRITES[invader.type][this.frame];
      drawSprite(
        ctx,
        sprite,
        invader.x,
        invader.y,
        invader.w,
        invader.h,
        COLORS[invader.type],
      );
    }
  }
}

export class Barrier {
  constructor(centerX, top) {
    this.cols = BARRIER.cols;
    this.rows = BARRIER.rows;
    this.cell = BARRIER.cell;
    this.w = this.cols * this.cell;
    this.h = this.rows * this.cell;
    this.x = Math.round(centerX - this.w / 2);
    this.y = top;
    this.cells = new Uint8Array(this.cols * this.rows);
    this.build();
  }

  build() {
    this.cells.fill(1);
    this.clear(0, 0);
    this.clear(this.cols - 1, 0);
    this.clear(0, this.rows - 1);
    this.clear(this.cols - 1, this.rows - 1);
    for (let col = 3; col <= 5; col += 1) this.clear(col, this.rows - 1);
    this.clear(4, this.rows - 2);
  }

  index(col, row) {
    return row * this.cols + col;
  }

  clear(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.cells[this.index(col, row)] = 0;
  }

  hitTest(rect) {
    const c0 = Math.max(0, Math.floor((rect.x - this.x) / this.cell));
    const c1 = Math.min(
      this.cols - 1,
      Math.floor((rect.x + rect.w - this.x) / this.cell),
    );
    const r0 = Math.max(0, Math.floor((rect.y - this.y) / this.cell));
    const r1 = Math.min(
      this.rows - 1,
      Math.floor((rect.y + rect.h - this.y) / this.cell),
    );

    if (c1 < c0 || r1 < r0) return false;

    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        if (this.cells[this.index(col, row)]) return true;
      }
    }
    return false;
  }

  damage(px, py, radius) {
    const c0 = Math.max(0, Math.floor((px - radius - this.x) / this.cell));
    const c1 = Math.min(
      this.cols - 1,
      Math.floor((px + radius - this.x) / this.cell),
    );
    const r0 = Math.max(0, Math.floor((py - radius - this.y) / this.cell));
    const r1 = Math.min(
      this.rows - 1,
      Math.floor((py + radius - this.y) / this.cell),
    );
    let removed = 0;

    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        if (!this.cells[this.index(col, row)]) continue;
        const cx = this.x + col * this.cell + this.cell / 2;
        const cy = this.y + row * this.cell + this.cell / 2;
        if (Math.hypot(cx - px, cy - py) <= radius) {
          this.cells[this.index(col, row)] = 0;
          removed += 1;
        }
      }
    }

    return removed;
  }

  draw(ctx) {
    const shades = ['#35d9d0', '#23b9b4', '#168f96'];
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (!this.cells[this.index(col, row)]) continue;
        ctx.fillStyle = shades[(row + col) % shades.length];
        ctx.fillRect(
          this.x + col * this.cell,
          this.y + row * this.cell,
          this.cell,
          this.cell,
        );
      }
    }
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 240 * dt;
    this.vx *= Math.max(0, 1 - 1.8 * dt);
    this.life -= dt;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      Math.round(this.x),
      Math.round(this.y),
      this.size,
      this.size,
    );
    ctx.globalAlpha = 1;
  }
}
