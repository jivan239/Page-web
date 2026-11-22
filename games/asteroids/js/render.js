/* Dibujo de Asteroids en canvas. */

import { WIDTH, HEIGHT, CONFIG } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: Math.random() < 0.85 ? 1 : 2,
      alpha: 0.2 + Math.random() * 0.6,
    }));
  }

  drawAsteroid(asteroid) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.beginPath();
    asteroid.shape.forEach((scale, index) => {
      const angle = (index / asteroid.shape.length) * Math.PI * 2;
      const radius = CONFIG.radius[asteroid.size] * scale;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#c8d6f5';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  drawShip(ship, thrust, shield, now) {
    if (!ship) return;
    const ctx = this.ctx;

    if (shield > 0) {
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(109, 247, 200, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (ship.invuln > 0 && Math.floor(now * 8) % 2 === 0 && shield <= 0) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    if (thrust) {
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(-24 - Math.random() * 8, 0);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fillStyle = '#ffb066';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-13, 11);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-13, -11);
    ctx.closePath();
    ctx.strokeStyle = '#6fe9ff';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  render(game, now, input) {
    const ctx = this.ctx;
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const star of this.stars) {
      ctx.fillStyle = `rgba(220, 235, 255, ${star.alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    for (const asteroid of game.asteroids) this.drawAsteroid(asteroid);

    ctx.fillStyle = '#fff8e0';
    for (const bullet of game.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const particle of game.particles) {
      ctx.fillStyle = `rgba(255, 176, 102, ${Math.max(0, particle.life / particle.maxLife)})`;
      ctx.fillRect(particle.x, particle.y, 2.5, 2.5);
    }

    this.drawShip(game.ship, input.thrust, game.shield, now);
  }
}
