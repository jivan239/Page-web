import {
  BASE_HP,
  BUILDABLE_CELLS,
  CORE,
  PATH,
  START_MARKER,
  TOWERS,
  WORLD,
  towerStats,
} from './config.js';

function rounded(ctx, x, y, w, h, r) {
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
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(WORLD.width * dpr);
    this.canvas.height = Math.round(WORLD.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  strokePath() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(PATH.points[0].x, PATH.points[0].y);
    for (let i = 1; i < PATH.points.length; i += 1) {
      ctx.lineTo(PATH.points[i].x, PATH.points[i].y);
    }
    ctx.stroke();
  }

  render(game, time) {
    const ctx = this.ctx;
    ctx.save();
    if (game.shake > 0) {
      const amount = game.shake * 3;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    this.drawBackground(time);
    this.drawCells(game);
    this.drawPath(time);
    this.drawStart(time);
    this.drawCore(game, time);

    if (game.selectedTower) this.drawRange(game.selectedTower);
    for (const tower of game.towers) this.drawTower(tower, time);
    for (const enemy of game.enemies) this.drawEnemy(enemy, time);
    for (const shot of game.projectiles) this.drawProjectile(shot);
    this.drawEffects(game.effects);
    this.drawGhost(game);
    this.drawFloaters(game.floaters);

    ctx.restore();
  }

  drawBackground(time) {
    const ctx = this.ctx;
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    const glow = ctx.createRadialGradient(CORE.x, CORE.y, 10, CORE.x, CORE.y, 300);
    glow.addColorStop(0, 'rgba(91,140,255,0.10)');
    glow.addColorStop(1, 'rgba(91,140,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.strokeStyle = 'rgba(140,170,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = WORLD.cell; x < WORLD.width; x += WORLD.cell) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, WORLD.height);
    }
    for (let y = WORLD.cell; y < WORLD.height; y += WORLD.cell) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(WORLD.width, y + 0.5);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 30; i += 1) {
      const x = (i * 137 + 41) % WORLD.width;
      const y = (i * 211 + 73) % WORLD.height;
      const twinkle = 0.5 + 0.5 * Math.sin(time * 1.6 + i);
      ctx.globalAlpha = 0.3 + twinkle * 0.7;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  drawCells(game) {
    if (!game.buildType || game.phase !== 'playing') return;
    const ctx = this.ctx;
    const def = TOWERS[game.buildType];
    const affordable = game.gold >= def.cost;
    ctx.lineWidth = 1;

    for (const cell of BUILDABLE_CELLS) {
      if (game.occupied.has(cell.key)) continue;
      rounded(ctx, cell.x - 18, cell.y - 18, 36, 36, 9);
      ctx.fillStyle = affordable ? 'rgba(125,255,176,0.10)' : 'rgba(255,107,138,0.08)';
      ctx.fill();
      ctx.strokeStyle = affordable ? 'rgba(125,255,176,0.24)' : 'rgba(255,107,138,0.20)';
      ctx.stroke();
    }
  }

  drawPath(time) {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#0a1024';
    ctx.lineWidth = 48;
    this.strokePath();

    ctx.strokeStyle = '#182a55';
    ctx.lineWidth = 38;
    this.strokePath();

    ctx.strokeStyle = 'rgba(124,247,255,0.10)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);
    ctx.lineDashOffset = -time * 26;
    this.strokePath();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  drawStart(time) {
    const ctx = this.ctx;
    const { x, y } = START_MARKER;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);

    ctx.strokeStyle = `rgba(125,255,176,${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 17 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0b2a22';
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7dffb0';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(125,255,176,0.75)';
    ctx.font = '700 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTRADA', x + 4, y - 26);
  }

  drawCore(game, time) {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    const ratio = game.hp / BASE_HP;

    ctx.save();
    ctx.translate(CORE.x, CORE.y);
    ctx.shadowColor = ratio > 0.35 ? 'rgba(111,233,255,0.6)' : 'rgba(255,107,138,0.7)';
    ctx.shadowBlur = 18 + pulse * 10;

    ctx.fillStyle = '#0c1733';
    ctx.strokeStyle = ratio > 0.35 ? '#6fe9ff' : '#ff6b8a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * 24;
      const py = Math.sin(angle) * 24;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = ratio > 0.35 ? '#6fe9ff' : '#ff6b8a';
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ratio > 0.35 ? '#7dffb0' : '#ff6b8a';
    ctx.beginPath();
    ctx.arc(0, 0, 31, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = 'rgba(232,240,255,0.8)';
    ctx.font = '700 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NÚCLEO', CORE.x, CORE.y + 46);
  }

  drawRange(tower) {
    const ctx = this.ctx;
    const stats = towerStats(tower.def, tower.level);
    ctx.save();
    ctx.strokeStyle = tower.def.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = tower.def.color;
    ctx.globalAlpha = 0.05;
    ctx.fill();
    ctx.restore();
  }

  drawTower(tower, time) {
    const ctx = this.ctx;
    const recoil = tower.recoil * 3;
    ctx.save();
    ctx.translate(tower.x, tower.y);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rounded(ctx, -16, -14, 32, 30, 9);
    ctx.fill();

    ctx.fillStyle = '#111b38';
    ctx.strokeStyle = tower.def.color;
    ctx.lineWidth = 2;
    rounded(ctx, -15, -15, 30, 30, 9);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(tower.angle);
    ctx.translate(-recoil, 0);
    ctx.fillStyle = tower.def.color;
    if (tower.type === 'heavy') {
      rounded(ctx, 2, -7, 20, 14, 4);
    } else if (tower.type === 'rapid') {
      rounded(ctx, 2, -4, 21, 8, 3);
    } else {
      rounded(ctx, 2, -5, 19, 10, 3);
    }
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = tower.def.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    for (let i = 0; i < tower.level; i += 1) {
      ctx.fillStyle = '#ffd479';
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 3 + i);
      ctx.fillRect(-11 + i * 6, 16, 4, 3);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawEnemy(enemy, time) {
    const ctx = this.ctx;
    const r = enemy.def.radius;
    const bob = Math.sin(time * 6 + enemy.phase) * 1.2;

    ctx.save();
    ctx.translate(enemy.x, enemy.y + bob);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, r * 0.8, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = enemy.def.color;
    ctx.shadowBlur = enemy.type === 'boss' ? 16 : 7;
    ctx.fillStyle = enemy.hit > 0 ? '#ffffff' : enemy.def.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(5,7,15,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.slow > 0) {
      ctx.strokeStyle = '#ffb066';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, time * 3, time * 3 + Math.PI);
      ctx.stroke();
    }

    if (enemy.type === 'boss') {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(-8, -r - 4);
      ctx.lineTo(-4, -r - 12);
      ctx.lineTo(0, -r - 5);
      ctx.lineTo(4, -r - 12);
      ctx.lineTo(8, -r - 4);
      ctx.closePath();
      ctx.fill();
    }

    const width = r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-width / 2, -r - 11, width, 4);
    ctx.fillStyle = enemy.hp / enemy.maxHp > 0.35 ? '#7dffb0' : '#ff6b8a';
    ctx.fillRect(-width / 2, -r - 11, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
    ctx.restore();
  }

  drawProjectile(shot) {
    const ctx = this.ctx;
    ctx.strokeStyle = shot.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = shot.aoe > 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(shot.px, shot.py);
    ctx.lineTo(shot.x, shot.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.aoe > 0 ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEffects(effects) {
    const ctx = this.ctx;
    for (const effect of effects) {
      const progress = 1 - effect.life / effect.max;
      ctx.globalAlpha = (1 - progress) * 0.8;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.type === 'blast' ? 3 : 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (0.3 + progress * 0.9), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawGhost(game) {
    if (!game.buildType || !game.hover || game.phase !== 'playing') return;
    const cell = game.nearestBuildCell(game.hover.x, game.hover.y);
    if (!cell) return;

    const ctx = this.ctx;
    const def = TOWERS[game.buildType];
    const stats = towerStats(def, 1);
    const canAfford = game.gold >= def.cost;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = canAfford ? def.color : '#ff6b8a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, stats.range, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = canAfford ? def.color : '#ff6b8a';
    rounded(ctx, cell.x - 14, cell.y - 14, 28, 28, 8);
    ctx.fill();
    ctx.restore();
  }

  drawFloaters(floaters) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = '800 12px ui-monospace, monospace';
    for (const item of floaters) {
      const progress = 1 - item.life / item.max;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y - 14 - progress * 26);
    }
    ctx.globalAlpha = 1;
  }
}
