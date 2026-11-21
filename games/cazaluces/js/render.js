import {
  TILE,
  COLS,
  ROWS,
  DIRS,
  COLORS,
  TIMING,
} from './config.js';

const W = COLS * TILE;
const H = ROWS * TILE;
const TAU = Math.PI * 2;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  render(game, time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#020a12';
    ctx.fillRect(0, 0, W, H);

    this.drawMaze(game.maze);
    this.drawPellets(game.maze, time);

    if (game.phase !== 'dying') {
      for (const shade of game.ghosts) this.drawShade(shade, game, time);
    }

    const deathProgress = game.phase === 'dying'
      ? Math.min(1, Math.max(0, 1 - game.deathTimer / TIMING.death))
      : 0;

    this.drawSpark(game.spark, time, deathProgress);

    if (game.phase === 'ready') this.drawCentreText('¡LISTO!', COLORS.spark, time);
    if (game.phase === 'levelclear') {
      ctx.fillStyle = 'rgba(2, 10, 18, 0.74)';
      ctx.fillRect(0, 0, W, H);
      this.drawCentreText('¡NIVEL COMPLETO!', '#5ef2c0', time);
      ctx.font = '700 11px ui-monospace, monospace';
      ctx.fillStyle = '#9fe9c8';
      ctx.textAlign = 'center';
      ctx.fillText(`PREPARANDO NIVEL ${game.level + 1}`, W / 2, H / 2 + 20);
    }
  }

  drawMaze(maze) {
    const ctx = this.ctx;

    ctx.fillStyle = COLORS.wallFill;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (maze.isWall(x, y)) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    const isWall = (x, y) => (
      x >= 0 && x < COLS && y >= 0 && y < ROWS && maze.isWall(x, y)
    );

    ctx.save();
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(17, 214, 201, 0.8)';
    ctx.shadowBlur = 7;
    ctx.beginPath();

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!maze.isWall(x, y)) continue;
        const left = x * TILE;
        const top = y * TILE;
        const right = left + TILE;
        const bottom = top + TILE;

        if (!isWall(x, y - 1)) {
          ctx.moveTo(left + 1, top + 1);
          ctx.lineTo(right - 1, top + 1);
        }
        if (!isWall(x, y + 1)) {
          ctx.moveTo(left + 1, bottom - 1);
          ctx.lineTo(right - 1, bottom - 1);
        }
        if (!isWall(x - 1, y)) {
          ctx.moveTo(left + 1, top + 1);
          ctx.lineTo(left + 1, bottom - 1);
        }
        if (!isWall(x + 1, y)) {
          ctx.moveTo(right - 1, top + 1);
          ctx.lineTo(right - 1, bottom - 1);
        }
      }
    }

    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = COLORS.door;
    ctx.shadowColor = COLORS.door;
    ctx.shadowBlur = 8;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (maze.isDoor(x, y)) {
          ctx.fillRect(x * TILE + 1, y * TILE + TILE * 0.38, TILE - 2, TILE * 0.24);
        }
      }
    }
    ctx.restore();
  }

  drawPellets(maze, time) {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(time * 4) * 0.18;

    ctx.save();
    ctx.fillStyle = COLORS.pellet;
    ctx.shadowColor = COLORS.pellet;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    for (const key of maze.pellets) {
      const [x, y] = key.split(',').map(Number);
      const cx = (x + 0.5) * TILE;
      const cy = (y + 0.5) * TILE;
      ctx.moveTo(cx + 1.4 * pulse, cy);
      ctx.arc(cx, cy, 1.4 * pulse, 0, TAU);
    }
    ctx.fill();
    ctx.restore();

    const radius = 3.4 + Math.sin(time * 5) * 0.7;
    ctx.save();
    ctx.fillStyle = COLORS.power;
    ctx.shadowColor = COLORS.power;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (const key of maze.power) {
      const [x, y] = key.split(',').map(Number);
      const cx = (x + 0.5) * TILE;
      const cy = (y + 0.5) * TILE;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, TAU);
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
    ctx.lineWidth = 1;
    for (const key of maze.power) {
      const [x, y] = key.split(',').map(Number);
      const cx = (x + 0.5) * TILE;
      const cy = (y + 0.5) * TILE;
      ctx.beginPath();
      ctx.arc(cx, cy, 5.5 + Math.sin(time * 5) * 0.6, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSpark(spark, time, deathProgress) {
    const ctx = this.ctx;
    const r = TILE * 0.36;
    const d = DIRS[spark.dir || spark.lastDir] || DIRS.right;
    const angle = Math.atan2(d.y, d.x);
    const pulse = 1 + Math.sin(time * 8) * 0.08;
    const shrink = deathProgress > 0 ? 1 - deathProgress * 0.65 : 1;
    const alpha = deathProgress > 0 ? 1 - deathProgress * 0.4 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(spark.px, spark.py);
    ctx.rotate(angle);

    ctx.fillStyle = COLORS.sparkTail;
    ctx.shadowColor = COLORS.spark;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.8);
    ctx.lineTo(-r * (1.9 + Math.sin(time * 10) * 0.25), 0);
    ctx.lineTo(-r * 0.4, r * 0.8);
    ctx.closePath();
    ctx.fill();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6 * pulse);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.35, COLORS.spark);
    gradient.addColorStop(1, 'rgba(124, 247, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6 * pulse * shrink, 0, TAU);
    ctx.fill();

    ctx.fillStyle = COLORS.sparkCore;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55 * shrink, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = COLORS.sparkRing;
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12 * pulse, 0, TAU);
    ctx.stroke();
    ctx.restore();

    if (deathProgress > 0) {
      ctx.save();
      ctx.globalAlpha = 1 - deathProgress;
      ctx.strokeStyle = COLORS.spark;
      ctx.lineWidth = 2;
      ctx.shadowColor = COLORS.spark;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(spark.px, spark.py, r + deathProgress * 24, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawShade(shade, game, time) {
    const ctx = this.ctx;
    const bob = shade.state === 'house' ? Math.sin(time * 4 + shade.bobPhase) * 2 : 0;
    const x = shade.px;
    const y = shade.py + bob;
    const r = TILE * 0.44;
    const shape = shade.def.shape || 'hex';

    ctx.save();

    if (shade.state === 'eaten' || shade.state === 'reviving') {
      this.drawCore(x, y, r * 0.62, shade.def.color, shade.dir || 'left', time);
      ctx.restore();
      return;
    }

    if (shade.state === 'frightened') {
      const flashing = game.frightTimer < 2.2 && Math.floor(time * 8) % 2 === 0;
      const color = flashing ? COLORS.frightenedFlash : COLORS.frightened;
      this.drawShadeBody(x, y, r, color, shape);
      this.drawOrbit(x, y, r, color, time, shade.bobPhase);
      this.drawFrightFace(x, y, r, flashing ? '#2737ff' : '#ffffff');
      ctx.restore();
      return;
    }

    this.drawShadeBody(x, y, r, shade.def.color, shape);
    this.drawOrbit(x, y, r, shade.def.color, time, shade.bobPhase);
    this.drawShadeEye(x, y, r, shade.dir || 'left');
    ctx.restore();
  }

  drawShadeBody(x, y, r, color, shape) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    if (shape === 'round') {
      ctx.arc(x, y, r, 0, TAU);
    } else if (shape === 'diamond') {
      ctx.moveTo(x, y - r * 1.12);
      ctx.lineTo(x + r * 0.94, y);
      ctx.lineTo(x, y + r * 1.12);
      ctx.lineTo(x - r * 0.94, y);
    } else if (shape === 'shard') {
      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI / 2 + (i * TAU) / 6;
        const radius = i % 2 === 0 ? r * 1.16 : r * 0.76;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    } else {
      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI / 2 + (i * TAU) / 6;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(4, 10, 24, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.68, 0, TAU);
    ctx.fill();
  }

  drawOrbit(x, y, r, color, time, phase) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    for (let i = 0; i < 3; i += 1) {
      const angle = time * 1.8 + phase + (i * TAU) / 3;
      const px = x + Math.cos(angle) * r * 1.3;
      const py = y + Math.sin(angle) * r * 1.3;
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawShadeEye(x, y, r, dirName) {
    const ctx = this.ctx;
    const d = DIRS[dirName] || DIRS.left;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(4, 10, 24, 0.75)';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.06, r * 0.44, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + d.x * r * 0.1, y - r * 0.06 + d.y * r * 0.1, r * 0.29, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#10182e';
    ctx.beginPath();
    ctx.arc(x + d.x * r * 0.22, y - r * 0.06 + d.y * r * 0.22, r * 0.13, 0, TAU);
    ctx.fill();
  }

  drawCore(x, y, r, color, dirName, time) {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(time * 10) * 0.08;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.46, 0, TAU);
    ctx.fill();

    const d = DIRS[dirName] || DIRS.left;
    ctx.fillStyle = '#10182e';
    ctx.beginPath();
    ctx.arc(x + d.x * r * 0.2, y + d.y * r * 0.2, r * 0.2, 0, TAU);
    ctx.fill();
  }

  drawFrightFace(x, y, r, ink) {
    const ctx = this.ctx;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r * 0.34, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();

    ctx.beginPath();
    const start = x - r * 0.42;
    const end = x + r * 0.42;
    const steps = 4;
    for (let i = 0; i <= steps; i += 1) {
      const px = start + ((end - start) * i) / steps;
      const py = y + r * 0.34 + (i % 2 === 0 ? 0 : r * 0.16);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  drawCentreText(text, color, time) {
    const ctx = this.ctx;
    const pulse = 0.75 + 0.25 * Math.abs(Math.sin(time * 4));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.font = '700 16px ui-monospace, "Cascadia Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillText(text, W / 2, 17.2 * TILE);
    ctx.restore();
  }
}
