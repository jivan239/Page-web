/* Dibujo del tablero 2048 en canvas. */

import { SIZE, PALETTE, TIMING } from './config.js';

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round((rect.width || 520) * dpr));
    this.canvas.height = Math.max(1, Math.round((rect.height || 520) * dpr));
  }

  drawTile(value, cx, cy, cell, scale) {
    const ctx = this.ctx;
    const [background, foreground] = PALETTE[value] || PALETTE[2048];
    const size = cell * scale;

    ctx.save();
    ctx.translate(cx, cy);
    roundRect(ctx, -size / 2, -size / 2, size, size, cell * 0.10);
    ctx.fillStyle = background;
    ctx.fill();

    const digits = String(value).length;
    const ratio = digits >= 4 ? 0.26 : digits === 3 ? 0.33 : 0.42;
    ctx.fillStyle = foreground;
    ctx.font = `700 ${Math.round(size * ratio)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 0, 1);
    ctx.restore();
  }

  render(game, now) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const side = Math.min(width, height);
    const padding = side * 0.045;
    const gap = side * 0.018;
    const cell = (side - padding * 2 - gap * (SIZE - 1)) / SIZE;
    const grid = cell * SIZE + gap * (SIZE - 1);
    const originX = (width - grid) / 2;
    const originY = (height - grid) / 2;

    const [emptyFill] = PALETTE[0];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        roundRect(
          ctx,
          originX + c * (cell + gap),
          originY + r * (cell + gap),
          cell,
          cell,
          cell * 0.10,
        );
        ctx.fillStyle = emptyFill;
        ctx.fill();
      }
    }

    const slide = game.anim ? Math.min(1, (now - game.anim.start) / TIMING.slide) : 1;
    const eased = 1 - (1 - slide) ** 3;
    const pop = Math.min(1, game.anim ? (now - game.anim.start) / TIMING.pop : 1);

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const value = game.board[r][c];
        if (!value) continue;

        const moving = game.anim
          ? game.anim.cells.find((tile) => tile.r === r && tile.c === c)
          : null;
        const fromR = moving ? moving.fromR : r;
        const fromC = moving ? moving.fromC : c;
        const row = fromR + (r - fromR) * eased;
        const col = fromC + (c - fromC) * eased;
        const cx = originX + col * (cell + gap) + cell / 2;
        const cy = originY + row * (cell + gap) + cell / 2;

        let scale = 1;
        if (moving && moving.merged) scale = 1 + 0.13 * Math.sin(Math.PI * pop);
        else if (game.lastCell && game.lastCell.r === r && game.lastCell.c === c) {
          scale = 1 + 0.08 * Math.sin(Math.PI * Math.min(1, pop));
        }

        this.drawTile(value, cx, cy, cell, scale);
      }
    }
  }
}
