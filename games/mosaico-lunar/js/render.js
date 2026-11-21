import {
  CELL,
  BOARD_X,
  BOARD_Y,
  BOARD_W,
  BOARD_H,
  CANVAS_W,
  CANVAS_H,
  SIDE_X,
  SIDE_W,
  TESSERAS,
  COLORS,
} from './config.js';

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const boundsOf = (matrix) => {
  const bounds = { minX: matrix.length, maxX: -1, minY: matrix.length, maxY: -1 };
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) continue;
      bounds.minX = Math.min(bounds.minX, col);
      bounds.maxX = Math.max(bounds.maxX, col);
      bounds.minY = Math.min(bounds.minY, row);
      bounds.maxY = Math.max(bounds.maxY, row);
    }
  }
  return bounds;
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(CANVAS_W * dpr);
    this.canvas.height = Math.round(CANVAS_H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  render(game, time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.drawBackdrop();
    this.drawBoard(game, time);
    this.drawSidebar(game, time);
  }

  drawBackdrop() {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, COLORS.bgTop);
    bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const glow = ctx.createRadialGradient(
      BOARD_X + BOARD_W / 2,
      BOARD_Y + BOARD_H * 0.18,
      20,
      BOARD_X + BOARD_W / 2,
      BOARD_Y + BOARD_H * 0.18,
      BOARD_W * 0.95,
    );
    glow.addColorStop(0, 'rgba(255, 176, 102, 0.09)');
    glow.addColorStop(1, 'rgba(255, 176, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  drawBoard(game, time) {
    const ctx = this.ctx;

    const inner = ctx.createLinearGradient(0, BOARD_Y, 0, BOARD_Y + BOARD_H);
    inner.addColorStop(0, COLORS.boardTop);
    inner.addColorStop(1, COLORS.boardBottom);
    ctx.fillStyle = inner;
    roundRect(ctx, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 10);
    ctx.fill();

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let col = 1; col < BOARD_W / CELL; col += 1) {
      const x = BOARD_X + col * CELL;
      ctx.beginPath();
      ctx.moveTo(x, BOARD_Y + 2);
      ctx.lineTo(x, BOARD_Y + BOARD_H - 2);
      ctx.stroke();
    }
    for (let row = 1; row < BOARD_H / CELL; row += 1) {
      const y = BOARD_Y + row * CELL;
      ctx.beginPath();
      ctx.moveTo(BOARD_X + 2, y);
      ctx.lineTo(BOARD_X + BOARD_W - 2, y);
      ctx.stroke();
    }

    for (let row = 0; row < game.board.length; row += 1) {
      for (let col = 0; col < game.board[row].length; col += 1) {
        const type = game.board[row][col];
        if (!type) continue;
        this.drawTile(
          BOARD_X + col * CELL,
          BOARD_Y + row * CELL,
          CELL,
          TESSERAS[type],
          { glow: 0 },
        );
      }
    }

    if (game.phase === 'playing' && game.piece) this.drawGhost(game);
    if (game.piece) this.drawPiece(game, time);

    if (game.phase === 'clearing') this.drawClearing(game, time);
    this.drawParticles(game);

    ctx.save();
    ctx.shadowColor = COLORS.frameGlow;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = COLORS.frame;
    ctx.lineWidth = 1.5;
    roundRect(ctx, BOARD_X - 5.5, BOARD_Y - 5.5, BOARD_W + 11, BOARD_H + 11, 13);
    ctx.stroke();
    ctx.restore();

    this.drawCornerTicks();
  }

  drawTile(px, py, size, def, { alpha = 1, glow = 0, ghost = false } = {}) {
    if (!def) return;
    const ctx = this.ctx;
    const inset = Math.max(1, size * 0.055);
    const x = px + inset;
    const y = py + inset;
    const s = size - inset * 2;
    const radius = Math.max(3, size * 0.18);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (ghost) {
      roundRect(ctx, x, y, s, s, radius);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = alpha * 0.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (glow > 0) {
      ctx.shadowColor = def.color;
      ctx.shadowBlur = glow;
    }

    roundRect(ctx, x, y, s, s, radius);
    ctx.fillStyle = def.deep;
    ctx.fill();
    ctx.shadowBlur = 0;

    const fill = ctx.createLinearGradient(x, y, x + s, y + s);
    fill.addColorStop(0, def.glare);
    fill.addColorStop(0.46, def.color);
    fill.addColorStop(1, def.deep);
    roundRect(ctx, x + 1, y + 1, s - 2, s - 2, Math.max(2, radius - 1));
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x + s * 0.19, y + s * 0.15, s * 0.62, Math.max(1, s * 0.09), 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.32;
    ctx.fillStyle = def.glare;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + s * 0.33);
    ctx.lineTo(x + s * 0.68, y + s / 2);
    ctx.lineTo(x + s / 2, y + s * 0.67);
    ctx.lineTo(x + s * 0.32, y + s / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawPiece(game, time) {
    const { matrix, x, y, type } = game.piece;
    const def = TESSERAS[type];
    const pulse = 5 + Math.sin(time * 3.2) * 2.2;

    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const by = y + row;
        if (by < 0) continue;
        this.drawTile(
          BOARD_X + (x + col) * CELL,
          BOARD_Y + by * CELL,
          CELL,
          def,
          { glow: pulse },
        );
      }
    }
  }

  drawGhost(game) {
    const { matrix, x, y, type } = game.piece;
    let ghostY = y;
    while (!game.collides(x, ghostY + 1, matrix)) ghostY += 1;
    if (ghostY === y) return;

    const def = TESSERAS[type];
    for (let row = 0; row < matrix.length; row += 1) {
      for (let col = 0; col < matrix[row].length; col += 1) {
        if (!matrix[row][col]) continue;
        const by = ghostY + row;
        if (by < 0) continue;
        const px = BOARD_X + (x + col) * CELL;
        const py = BOARD_Y + by * CELL;
        this.ctx.save();
        this.ctx.globalAlpha = 0.34;
        roundRect(this.ctx, px + 2, py + 2, CELL - 4, CELL - 4, 5);
        this.ctx.strokeStyle = def.color;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }
  }

  drawClearing(game, time) {
    const ctx = this.ctx;
    const flash = (Math.sin(time * 30) + 1) / 2;
    for (const row of game.clearingRows) {
      ctx.save();
      ctx.globalAlpha = 0.16 + flash * 0.42;
      ctx.fillStyle = COLORS.clear;
      roundRect(ctx, BOARD_X + 2, BOARD_Y + row * CELL + 1, BOARD_W - 4, CELL - 2, 5);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(game) {
    const ctx = this.ctx;
    if (!game.particles.length) return;
    for (const particle of game.particles) {
      const life = Math.max(0, particle.life / particle.max);
      const size = 1.6 + life * 2.6;
      ctx.save();
      ctx.globalAlpha = Math.min(1, life * 1.6);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(
        BOARD_X + particle.x * CELL - size / 2,
        BOARD_Y + particle.y * CELL - size / 2,
        size,
        size,
      );
      ctx.restore();
    }
  }

  drawCornerTicks() {
    const ctx = this.ctx;
    const x0 = BOARD_X - 5.5;
    const y0 = BOARD_Y - 5.5;
    const x1 = BOARD_X + BOARD_W + 5.5;
    const y1 = BOARD_Y + BOARD_H + 5.5;
    const len = 12;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 248, 224, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + len);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0 + len, y0);
    ctx.moveTo(x1 - len, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1, y0 + len);
    ctx.moveTo(x0, y1 - len);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x0 + len, y1);
    ctx.moveTo(x1 - len, y1);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - len);
    ctx.stroke();
    ctx.restore();
  }

  drawSidebar(game, time) {
    const ctx = this.ctx;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 9px ui-monospace, "Cascadia Mono", Consolas, monospace';
    ctx.fillStyle = COLORS.label;
    ctx.fillText('SIGUIENTE', SIDE_X, 30);

    game.queue.slice(0, 3).forEach((type, index) => {
      this.drawSlot(SIDE_X, 42 + index * 58, SIDE_W, 50, type, index === 0);
    });

    ctx.fillStyle = COLORS.label;
    ctx.fillText('EN RESERVA', SIDE_X, 229);
    this.drawSlot(SIDE_X, 241, SIDE_W, 58, game.hold, false);

    ctx.strokeStyle = COLORS.sideLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SIDE_X, 316);
    ctx.lineTo(SIDE_X + SIDE_W, 316);
    ctx.stroke();

    ctx.fillStyle = COLORS.label;
    ctx.fillText('ATAJOS', SIDE_X, 338);
    ctx.font = '10px ui-monospace, "Cascadia Mono", Consolas, monospace';
    ctx.fillStyle = COLORS.faint;
    const hints = [
      ['← →', 'mover'],
      ['↑', 'girar'],
      ['↓', 'bajar'],
      ['ESPACIO', 'caer'],
      ['C', 'guardar'],
    ];
    hints.forEach(([key, label], index) => {
      const y = 358 + index * 17;
      ctx.fillStyle = COLORS.text;
      ctx.fillText(key, SIDE_X, y);
      ctx.fillStyle = COLORS.faint;
      ctx.fillText(label, SIDE_X + 58, y);
    });

    ctx.fillStyle = COLORS.label;
    ctx.font = '700 9px ui-monospace, "Cascadia Mono", Consolas, monospace';
    ctx.fillText('PROGRESO', SIDE_X, 470);
    this.drawProgress(game);

    ctx.fillStyle = COLORS.faint;
    ctx.font = '9px ui-monospace, "Cascadia Mono", Consolas, monospace';
    ctx.fillText('10 filas por nivel', SIDE_X, 505);

    const pulse = 0.55 + Math.sin(time * 2.4) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(255, 212, 121, 0.9)';
    ctx.beginPath();
    ctx.arc(SIDE_X + SIDE_W - 4, 26, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSlot(x, y, w, h, type, highlight) {
    const ctx = this.ctx;
    ctx.save();
    roundRect(ctx, x, y, w, h, 7);
    ctx.fillStyle = highlight ? 'rgba(255, 212, 121, 0.08)' : COLORS.sidePanel;
    ctx.fill();
    ctx.strokeStyle = highlight ? 'rgba(255, 212, 121, 0.36)' : COLORS.sideLine;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (type) {
      this.drawPreview(type, x + w / 2, y + h / 2, 10.5);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = COLORS.sideLine;
      ctx.setLineDash([3, 4]);
      roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = COLORS.text;
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('—', x + w / 2, y + h / 2);
    }
    ctx.restore();
  }

  drawPreview(type, cx, cy, cell) {
    const def = TESSERAS[type];
    if (!def) return;
    const bounds = boundsOf(def.matrix);
    const width = (bounds.maxX - bounds.minX + 1) * cell;
    const height = (bounds.maxY - bounds.minY + 1) * cell;
    const ox = cx - width / 2 - bounds.minX * cell;
    const oy = cy - height / 2 - bounds.minY * cell;

    for (let row = 0; row < def.matrix.length; row += 1) {
      for (let col = 0; col < def.matrix[row].length; col += 1) {
        if (!def.matrix[row][col]) continue;
        this.drawTile(ox + col * cell, oy + row * cell, cell, def, { glow: 0 });
      }
    }
  }

  drawProgress(game) {
    const ctx = this.ctx;
    const segments = 10;
    const gap = 2;
    const width = (SIDE_W - (segments - 1) * gap) / segments;
    const filled = game.lines % 10;

    for (let index = 0; index < segments; index += 1) {
      const x = SIDE_X + index * (width + gap);
      roundRect(ctx, x, 478, width, 6, 2);
      ctx.fillStyle = index < filled ? 'rgba(255, 212, 121, 0.85)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
    }
  }
}
