/* Lógica de Asteroids: nave, disparos, asteroides, niveles y vidas. */

import { WIDTH, HEIGHT, CONFIG, STORAGE } from './config.js';
import { onGameOver } from '../../../js/monetization.js';

const random = (min, max) => min + Math.random() * (max - min);

function wrap(body) {
  if (body.x < 0) body.x += WIDTH;
  else if (body.x >= WIDTH) body.x -= WIDTH;
  if (body.y < 0) body.y += HEIGHT;
  else if (body.y >= HEIGHT) body.y -= HEIGHT;
}

function makeAsteroid(x, y, size) {
  const angle = random(0, Math.PI * 2);
  const speed = CONFIG.speed[size] * random(0.7, 1.35);
  const points = 8 + Math.floor(Math.random() * 5);
  return {
    x,
    y,
    size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle: random(0, Math.PI * 2),
    spin: random(-1.1, 1.1),
    shape: Array.from({ length: points }, () => random(0.7, 1.16)),
  };
}

function makeShip() {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    invuln: 2.2,
  };
}

export class Game {
  constructor({ sound } = {}) {
    this.sound = sound || { play() {}, ensure() {} };
    this.phase = 'idle';
    this.score = 0;
    this.best = 0;
    this.level = 1;
    this.lives = CONFIG.lives;
    this.ship = null;
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.fireCooldown = 0;
    this.thrustSound = 0;
    this.shield = 0;
    this.respawn = 0;
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
    this.phase = 'playing';
    this.score = 0;
    this.level = 1;
    this.lives = CONFIG.lives;
    this.ship = makeShip();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.fireCooldown = 0;
    this.thrustSound = 0;
    this.shield = 0;
    this.respawn = 0;
    this.spawnWave();
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

  spawnWave() {
    const count = Math.min(3 + this.level, 11);
    for (let i = 0; i < count; i += 1) {
      let x;
      let y;
      if (i % 4 === 0) {
        x = random(0, WIDTH);
        y = 20;
      } else if (i % 4 === 1) {
        x = WIDTH - 20;
        y = random(0, HEIGHT);
      } else if (i % 4 === 2) {
        x = random(0, WIDTH);
        y = HEIGHT - 20;
      } else {
        x = 20;
        y = random(0, HEIGHT);
      }
      if (this.ship && Math.hypot(x - this.ship.x, y - this.ship.y) < 170) {
        x = (x + WIDTH / 2) % WIDTH;
        y = (y + HEIGHT / 2) % HEIGHT;
      }
      this.asteroids.push(makeAsteroid(x, y, 3));
    }
  }

  burst(x, y, size) {
    const count = 8 + size * 4;
    for (let i = 0; i < count; i += 1) {
      const angle = random(0, Math.PI * 2);
      const speed = random(30, 40 + size * 38);
      const life = random(0.25, 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
      });
    }
  }

  splitAsteroid(index) {
    const asteroid = this.asteroids[index];
    this.asteroids.splice(index, 1);
    this.score += CONFIG.points[asteroid.size];
    this.sound.play('boom');
    this.burst(asteroid.x, asteroid.y, asteroid.size);

    if (asteroid.size > 1) {
      for (let i = 0; i < 2; i += 1) {
        const angle = random(0, Math.PI * 2);
        const speed = CONFIG.speed[asteroid.size - 1] * random(0.8, 1.3);
        const child = makeAsteroid(asteroid.x, asteroid.y, asteroid.size - 1);
        child.vx = Math.cos(angle) * speed;
        child.vy = Math.sin(angle) * speed;
        this.asteroids.push(child);
      }
    }

    if (this.score > this.best) {
      this.best = this.score;
      this.saveBest();
    }
    if (!this.asteroids.length) {
      this.level += 1;
      this.sound.play('level');
      this.spawnWave();
    }
  }

  loseLife() {
    this.lives -= 1;
    this.sound.play('boom');
    this.burst(this.ship.x, this.ship.y, 3);
    this.ship = null;
    this.respawn = CONFIG.respawn;
  }

  endGame() {
    this.phase = 'gameover';
    this.sound.play('over');
    onGameOver({
      score: this.score,
      best: this.best,
      level: this.level,
      asteroids: this.asteroids.length,
    });
  }

  revive() {
    if (this.phase !== 'gameover') return false;
    this.phase = 'playing';
    this.lives = 1;
    this.shield = CONFIG.shieldTime;
    this.ship = makeShip();
    this.asteroids = this.asteroids.filter(
      (asteroid) => Math.hypot(asteroid.x - this.ship.x, asteroid.y - this.ship.y) > 170,
    );
    this.sound.play('start');
    return true;
  }

  grantShield() {
    if (this.phase !== 'playing') return false;
    this.shield = CONFIG.shieldTime;
    this.sound.play('level');
    return true;
  }

  update(dt, input) {
    if (this.phase !== 'playing') return;

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.thrustSound -= dt;
    this.shield = Math.max(0, this.shield - dt);

    if (this.ship) {
      const ship = this.ship;
      ship.invuln = Math.max(0, ship.invuln - dt);

      if (input.left) ship.angle -= CONFIG.rotate * dt;
      if (input.right) ship.angle += CONFIG.rotate * dt;

      if (input.thrust) {
        ship.vx += Math.cos(ship.angle) * CONFIG.thrust * dt;
        ship.vy += Math.sin(ship.angle) * CONFIG.thrust * dt;
        if (this.thrustSound <= 0) {
          this.sound.play('thrust');
          this.thrustSound = 0.16;
        }
      }

      const drag = CONFIG.drag ** (dt * 60);
      ship.vx *= drag;
      ship.vy *= drag;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > CONFIG.maxSpeed) {
        ship.vx = (ship.vx / speed) * CONFIG.maxSpeed;
        ship.vy = (ship.vy / speed) * CONFIG.maxSpeed;
      }

      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      wrap(ship);

      if (input.fire && this.fireCooldown <= 0) {
        this.bullets.push({
          x: ship.x + Math.cos(ship.angle) * 18,
          y: ship.y + Math.sin(ship.angle) * 18,
          vx: Math.cos(ship.angle) * CONFIG.bulletSpeed + ship.vx * 0.4,
          vy: Math.sin(ship.angle) * CONFIG.bulletSpeed + ship.vy * 0.4,
          life: CONFIG.bulletLife,
        });
        this.fireCooldown = CONFIG.fireDelay;
        this.sound.play('fire');
      }
    } else {
      this.respawn -= dt;
      if (this.respawn <= 0) {
        if (this.lives > 0) this.ship = makeShip();
        else this.endGame();
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      wrap(bullet);
      if (bullet.life <= 0) this.bullets.splice(i, 1);
    }

    for (const asteroid of this.asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.angle += asteroid.spin * dt;
      wrap(asteroid);
    }

    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      const hit = this.asteroids.findIndex(
        (asteroid) =>
          Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) <
          CONFIG.radius[asteroid.size],
      );
      if (hit >= 0) {
        this.bullets.splice(i, 1);
        this.splitAsteroid(hit);
      }
    }

    if (this.ship && this.ship.invuln <= 0 && this.shield <= 0) {
      const crash = this.asteroids.some(
        (asteroid) =>
          Math.hypot(this.ship.x - asteroid.x, this.ship.y - asteroid.y) <
          CONFIG.radius[asteroid.size] + 9,
      );
      if (crash) this.loseLife();
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }
  }
}
