import {
  WIDTH,
  HEIGHT,
  PLAYER,
  BULLET,
  BARRIER,
  UFO,
  COLORS,
  SPRITES,
  STORAGE,
} from './config.js';
import {
  clamp,
  rand,
  randInt,
  drawSprite,
  rectsOverlap,
  formatScore,
  readNumber,
  writeNumber,
} from './utils.js';
import { Player, Formation, Barrier, Particle } from './entities.js';
import { onGameOver } from '../../../js/monetization.js';

export const GameState = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WAVE: 'wave',
  GAMEOVER: 'gameover',
});

export class Game {
  constructor(canvas, audio, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.ui = ui;
    this.dpr = 1;
    this.state = GameState.MENU;
    this.time = 0;
    this.lastTs = 0;
    this.raf = 0;
    this.input = { left: false, right: false, fire: false, pointerX: null };
    this.stars = this.createStars();
    this.highScore = readNumber(STORAGE.highScore, 0);
    this.menuTime = 0;

    this.resetSession();
    this.ui.setHighScore(this.highScore);
    this.ui.showMenu();

    this.frame = this.frame.bind(this);
  }

  createStars() {
    return Array.from({ length: 140 }, () => ({
      x: rand(0, WIDTH),
      y: rand(0, HEIGHT),
      size: rand(0, 1) > 0.82 ? 2 : 1,
      phase: rand(0, Math.PI * 2),
      twinkle: rand(0.6, 2.2),
      color: Math.random() > 0.85 ? '#a9c8ff' : '#ffffff',
    }));
  }

  resetSession() {
    this.wave = 1;
    this.score = 0;
    this.lives = PLAYER.lives;
    this.newRecord = false;
    this.player = new Player();
    this.formation = new Formation(1);
    this.barriers = this.createBarriers();
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.popups = [];
    this.ufo = null;
    this.ufoTimer = rand(UFO.minDelay, UFO.maxDelay);
    this.fireCooldown = 0;
    this.enemyFireTimer = 1.1;
    this.marchTimer = 0.6;
    this.marchStep = 0;
    this.shake = 0;
    this.flash = 0;
    this.banner = null;
    this.waveTimer = 0;
    this.clearEnemyBullets = false;
    this.input.left = false;
    this.input.right = false;
    this.input.fire = false;
    this.input.pointerX = null;
  }

  createBarriers() {
    const slot = WIDTH / BARRIER.count;
    return Array.from(
      { length: BARRIER.count },
      (_, index) => new Barrier(slot * (index + 0.5), BARRIER.top),
    );
  }

  start() {
    if (this.raf) return;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  frame(timestamp) {
    const dt = clamp((timestamp - this.lastTs) / 1000, 0, 0.05);
    this.lastTs = timestamp;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  }

  setBanner(text, sub, duration) {
    this.banner = { text, sub, time: duration, max: duration };
  }

  startGame() {
    this.resetSession();
    this.state = GameState.PLAYING;
    this.player.invuln = 1.6;
    this.audio.unlock();
    this.ui.hidePanels();
    if (typeof this.ui.onNewGame === 'function') this.ui.onNewGame();
    this.setBanner('OLEADA 1', 'ROMPE EL ENJAMBRE', 1.8);
  }

  pause() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.input.left = false;
    this.input.right = false;
    this.input.fire = false;
    this.ui.showPause();
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.audio.unlock();
    this.ui.hidePanels();
  }

  togglePause() {
    if (this.state === GameState.PLAYING) this.pause();
    else if (this.state === GameState.PAUSED) this.resume();
  }

  toMenu() {
    this.resetSession();
    this.state = GameState.MENU;
    this.banner = null;
    this.ui.setHighScore(this.highScore);
    this.ui.showMenu();
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.newRecord = true;
      writeNumber(STORAGE.highScore, this.highScore);
      this.ui.setHighScore(this.highScore);
    }
  }

  gameOver() {
    if (this.state === GameState.GAMEOVER) return;
    this.state = GameState.GAMEOVER;
    this.player.alive = false;
    this.input.left = false;
    this.input.right = false;
    this.input.fire = false;
    this.input.pointerX = null;
    this.shake = 20;
    this.flash = 0.5;
    this.spawnExplosion(this.player.x, this.player.y, COLORS.player, 34, 280);
    this.audio.gameOver();
    const summary = {
      score: this.score,
      wave: this.wave,
      highScore: this.highScore,
      isRecord: this.newRecord,
    };
    /* Punto centralizado: aquí se conectará el intersticial de AdSense. */
    this.ui.showGameOver(onGameOver(summary));
  }

  /* La recompensa de vida se canjea desde la pantalla de fin de partida. */
  reviveWithLife() {
    if (this.state !== GameState.GAMEOVER) return false;
    this.lives = 1;
    this.state = GameState.PLAYING;
    this.player.alive = true;
    this.player.respawn();
    this.enemyBullets = [];
    this.formation.offsetY = 0;
    this.formation.updatePositions();
    this.marchTimer = 0.6;
    this.shake = 0;
    this.flash = 0;
    this.banner = null;
    this.ui.hidePanels();
    this.audio.levelUp();
    this.setBanner('VIDA EXTRA', 'VUELVE AL ATAQUE', 1.5);
    return true;
  }

  /* Recompensa adicional: escudo temporal que también despeja las balas enemigas. */
  grantShield() {
    if (this.state !== GameState.PLAYING && this.state !== GameState.WAVE) return false;
    this.player.invuln = Math.max(this.player.invuln, 8);
    this.clearEnemyBullets = true;
    this.audio.levelUp();
    this.setBanner('ESCUDO DE CRISTAL', 'INVULNERABLE 8 s', 1.5);
    return true;
  }

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 34);
    this.flash = Math.max(0, this.flash - dt);

    if (this.state === GameState.PLAYING) {
      this.updatePlaying(dt);
    } else if (this.state === GameState.WAVE) {
      this.updateParticles(dt);
      this.updatePopups(dt);
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this.beginWave();
    } else if (this.state === GameState.MENU) {
      this.menuTime += dt;
      this.updateParticles(dt);
    } else if (this.state === GameState.GAMEOVER) {
      this.updateParticles(dt);
      this.updatePopups(dt);
    }

    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }
  }

  updatePlaying(dt) {
    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const targetX = dir === 0 ? this.input.pointerX : null;
    this.player.update(dt, dir, targetX);

    this.formation.update(dt);
    this.updateBullets(dt);
    this.updateUfo(dt);
    this.updateParticles(dt);
    this.updatePopups(dt);
    this.handleFiring(dt);
    this.handleEnemyFire(dt);
    this.handleCollisions();
    this.updateMarch(dt);
    this.checkWaveClear();
    this.checkInvasion();
  }

  updateBullets(dt) {
    for (const bullet of this.bullets) bullet.y += bullet.vy * dt;
    for (const bullet of this.enemyBullets) bullet.y += bullet.vy * dt;

    this.bullets = this.bullets.filter((bullet) => bullet.y > -30);
    this.enemyBullets = this.enemyBullets.filter(
      (bullet) => bullet.y < HEIGHT + 30,
    );
  }

  updateUfo(dt) {
    if (this.ufo) {
      this.ufo.x += this.ufo.vx * dt;
      if (this.ufo.x < -this.ufo.w - 40 || this.ufo.x > WIDTH + 40) {
        this.ufo = null;
      }
      return;
    }

    this.ufoTimer -= dt;
    if (this.ufoTimer > 0) return;

    const direction = Math.random() < 0.5 ? 1 : -1;
    this.ufo = {
      x: direction > 0 ? -UFO.width - 20 : WIDTH + 20,
      y: UFO.y,
      w: UFO.width,
      h: UFO.height,
      vx: direction * UFO.speed,
      points: UFO.points[randInt(0, UFO.points.length - 1)],
    };
    this.ufoTimer = rand(UFO.minDelay, UFO.maxDelay);
    this.audio.ufoAppear();
  }

  updateParticles(dt) {
    for (const particle of this.particles) particle.update(dt);
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  updatePopups(dt) {
    for (const popup of this.popups) {
      popup.y -= 26 * dt;
      popup.life -= dt;
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);
  }

  updateMarch(dt) {
    if (this.formation.aliveCount <= 0) return;
    this.marchTimer -= dt;
    if (this.marchTimer > 0) return;

    this.marchTimer = Math.max(0.1, 0.62 - this.formation.threat * 0.42);
    this.audio.march(this.marchStep);
    this.marchStep = (this.marchStep + 1) % 4;
  }

  handleFiring(dt) {
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    }
    if (!this.input.fire) return;
    if (this.fireCooldown > 0) return;
    if (this.bullets.length >= BULLET.maxPlayer) return;

    this.bullets.push({
      x: this.player.x,
      y: this.player.y - this.player.h / 2 - BULLET.height / 2,
      w: BULLET.width,
      h: BULLET.height,
      vy: -BULLET.speed,
    });
    this.fireCooldown = BULLET.cooldown;
    this.audio.shoot();
  }

  handleEnemyFire(dt) {
    if (this.enemyBullets.length >= BULLET.maxEnemy) return;

    this.enemyFireTimer -= dt;
    if (this.enemyFireTimer > 0) return;

    const shooters = new Map();
    for (const invader of this.formation.invaders) {
      if (!invader.alive) continue;
      const current = shooters.get(invader.col);
      if (!current || invader.y > current.y) shooters.set(invader.col, invader);
    }

    const list = Array.from(shooters.values());
    if (list.length === 0) return;

    const shooter = list[randInt(0, list.length - 1)];
    this.enemyBullets.push({
      x: shooter.x + shooter.w / 2,
      y: shooter.y + shooter.h + 6,
      w: 4,
      h: 14,
      vy: BULLET.enemySpeed + (this.wave - 1) * 12,
    });

    const threat = this.formation.threat;
    const base = rand(0.55, 1.45);
    this.enemyFireTimer = Math.max(
      0.18,
      (base * (1 - 0.45 * threat)) / (1 + 0.1 * (this.wave - 1)),
    );
    this.audio.enemyShoot();
  }

  bulletRect(bullet) {
    return {
      x: bullet.x - bullet.w / 2,
      y: bullet.y - bullet.h / 2,
      w: bullet.w,
      h: bullet.h,
    };
  }

  playerRect() {
    return {
      x: this.player.x - this.player.w / 2,
      y: this.player.y - this.player.h / 2,
      w: this.player.w,
      h: this.player.h,
    };
  }

  handleCollisions() {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      const rect = this.bulletRect(bullet);
      let consumed = false;

      if (this.ufo) {
        const ufoRect = { x: this.ufo.x, y: this.ufo.y, w: this.ufo.w, h: this.ufo.h };
        if (rectsOverlap(rect, ufoRect)) {
          this.addScore(this.ufo.points);
          this.popups.push({
            x: this.ufo.x + this.ufo.w / 2,
            y: this.ufo.y,
            text: String(this.ufo.points),
            life: 1,
            max: 1,
            color: COLORS.ufo,
          });
          this.spawnExplosion(
            this.ufo.x + this.ufo.w / 2,
            this.ufo.y + this.ufo.h / 2,
            COLORS.ufo,
            22,
            240,
          );
          this.audio.ufoHit();
          this.ufo = null;
          consumed = true;
        }
      }

      if (!consumed) {
        for (const barrier of this.barriers) {
          if (!barrier.hitTest(rect)) continue;
          barrier.damage(bullet.x, bullet.y - bullet.h / 2, 8);
          this.spawnExplosion(bullet.x, bullet.y, COLORS.barrier, 4, 110);
          this.audio.barrierHit();
          consumed = true;
          break;
        }
      }

      if (!consumed) {
        for (const invader of this.formation.invaders) {
          if (!invader.alive || !rectsOverlap(rect, invader)) continue;
          this.destroyInvader(invader);
          consumed = true;
          break;
        }
      }

      if (consumed) this.bullets.splice(i, 1);
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.enemyBullets[i];
      const rect = this.bulletRect(bullet);
      let consumed = false;

      for (const barrier of this.barriers) {
        if (!barrier.hitTest(rect)) continue;
        barrier.damage(bullet.x, bullet.y + bullet.h / 2, 10);
        this.spawnExplosion(bullet.x, bullet.y, COLORS.barrier, 4, 110);
        this.audio.barrierHit();
        consumed = true;
        break;
      }

      if (!consumed && this.player.invuln <= 0 && rectsOverlap(rect, this.playerRect())) {
        consumed = true;
        this.hitPlayer();
      }

      if (consumed) this.enemyBullets.splice(i, 1);
    }

    if (this.clearEnemyBullets) {
      this.enemyBullets = [];
      this.clearEnemyBullets = false;
    }
  }

  destroyInvader(invader) {
    invader.alive = false;
    this.formation.aliveCount -= 1;

    const points = invader.type === 'aguja' ? 30 : invader.type === 'cristal' ? 20 : 10;
    this.addScore(points);
    this.spawnExplosion(
      invader.x + invader.w / 2,
      invader.y + invader.h / 2,
      COLORS[invader.type],
      16,
      190,
    );
    this.popups.push({
      x: invader.x + invader.w / 2,
      y: invader.y,
      text: String(points),
      life: 0.8,
      max: 0.8,
      color: COLORS[invader.type],
    });
    this.audio.invaderHit();
  }

  hitPlayer() {
    if (this.player.invuln > 0) return;

    this.lives -= 1;
    this.shake = 18;
    this.flash = 0.55;
    this.clearEnemyBullets = true;
    this.spawnExplosion(this.player.x, this.player.y, COLORS.player, 30, 250);
    this.audio.playerHit();

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    this.player.respawn();
    this.setBanner('¡IMPACTO!', `VIDAS RESTANTES: ${this.lives}`, 1.3);
  }

  checkWaveClear() {
    if (this.state !== GameState.PLAYING) return;
    if (this.formation.aliveCount > 0) return;

    this.state = GameState.WAVE;
    this.waveTimer = 2.2;
    this.bullets = [];
    this.enemyBullets = [];
    this.ufo = null;
    const bonus = 50 * this.wave;
    this.addScore(bonus);
    this.setBanner('OLEADA SUPERADA', `BONUS +${bonus}`, 2.2);
    this.audio.levelUp();
  }

  checkInvasion() {
    if (this.state !== GameState.PLAYING) return;
    if (this.formation.aliveCount <= 0) return;
    if (this.formation.maxY() >= this.player.y - 30) this.gameOver();
  }

  beginWave() {
    this.wave += 1;
    this.formation = new Formation(this.wave);
    this.barriers = this.createBarriers();
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyFireTimer = 1.1;
    this.marchTimer = 0.6;
    this.marchStep = 0;
    this.ufoTimer = rand(UFO.minDelay, UFO.maxDelay);
    this.player.respawn();
    this.player.invuln = 1.5;
    this.state = GameState.PLAYING;
    this.setBanner(`OLEADA ${this.wave}`, 'ROMPE EL ENJAMBRE', 1.6);
  }

  spawnExplosion(x, y, color, count = 16, speed = 200) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const velocity = rand(speed * 0.25, speed);
      this.particles.push(
        new Particle(
          x,
          y,
          Math.cos(angle) * velocity,
          Math.sin(angle) * velocity,
          rand(0.25, 0.7),
          color,
          rand(2, 4),
        ),
      );
    }

    if (this.particles.length > 420) {
      this.particles.splice(0, this.particles.length - 420);
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    }

    this.drawBackground();
    if (this.state === GameState.MENU) {
      this.drawMenuScene();
    } else {
      this.drawWorld();
    }

    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 70, 110, ${(Math.min(0.35, this.flash) * 0.6).toFixed(3)})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  drawBackground() {
    const ctx = this.ctx;

    if (!this.bgGradient) {
      this.bgGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      this.bgGradient.addColorStop(0, '#05060f');
      this.bgGradient.addColorStop(0.55, '#080d20');
      this.bgGradient.addColorStop(1, '#091130');
    }

    ctx.fillStyle = this.bgGradient;
    ctx.fillRect(-40, -40, WIDTH + 80, HEIGHT + 80);

    for (const star of this.stars) {
      ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(this.time * star.twinkle + star.phase));
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    if (!this.horizonGlow) {
      this.horizonGlow = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT + 30,
        20,
        WIDTH / 2,
        HEIGHT + 30,
        460,
      );
      this.horizonGlow.addColorStop(0, 'rgba(70, 130, 255, 0.18)');
      this.horizonGlow.addColorStop(1, 'rgba(70, 130, 255, 0)');
    }
    ctx.fillStyle = this.horizonGlow;
    ctx.fillRect(0, HEIGHT - 420, WIDTH, 420);
  }

  drawMenuScene() {
    const ctx = this.ctx;
    const cols = 11;
    const cellW = 62;
    const startX = (WIDTH - ((cols - 1) * cellW + 32)) / 2;
    const bob = Math.sin(this.menuTime * 1.5) * 5;

    for (let row = 0; row < 3; row += 1) {
      const type = row === 0 ? 'aguja' : row === 1 ? 'cristal' : 'nucleo';
      const frame = Math.floor(this.menuTime * 1.8 + row) % 2;
      const sprite = SPRITES[type][frame];
      ctx.globalAlpha = 0.24;
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * cellW;
        const y =
          92 + row * 62 + bob + Math.sin(this.menuTime * 1.2 + col * 0.35 + row) * 4;
        drawSprite(ctx, sprite, x, y, 32, 24, COLORS[type]);
      }
    }
    ctx.globalAlpha = 1;

    drawSprite(ctx, SPRITES.player, WIDTH / 2 - 30, HEIGHT - 132, 60, 33, COLORS.player);
  }

  drawWorld() {
    this.drawBarriers();
    this.formation.draw(this.ctx);
    this.drawUfo();
    this.drawBullets();
    this.player.draw(this.ctx);
    this.drawParticles();
    this.drawPopups();
    this.drawHud();
    this.drawBanner();
  }

  drawBarriers() {
    for (const barrier of this.barriers) barrier.draw(this.ctx);
  }

  drawUfo() {
    if (!this.ufo) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 93, 122, 0.8)';
    ctx.shadowBlur = 18;
    drawSprite(ctx, SPRITES.ufo, this.ufo.x, this.ufo.y, this.ufo.w, this.ufo.h, COLORS.ufo);
    ctx.restore();
  }

  drawBullets() {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.bullet;
    for (const bullet of this.bullets) {
      ctx.fillRect(
        Math.round(bullet.x - bullet.w / 2),
        Math.round(bullet.y - bullet.h / 2),
        bullet.w,
        bullet.h,
      );
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = COLORS.enemyBullet;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.enemyBullet;
    for (const bullet of this.enemyBullets) {
      ctx.fillRect(
        Math.round(bullet.x - bullet.w / 2),
        Math.round(bullet.y - bullet.h / 2),
        bullet.w,
        bullet.h,
      );
    }
    ctx.restore();
  }

  drawParticles() {
    for (const particle of this.particles) particle.draw(this.ctx);
  }

  drawPopups() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px ui-monospace, Menlo, monospace';
    for (const popup of this.popups) {
      ctx.globalAlpha = clamp(popup.life / popup.max, 0, 1);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.restore();
  }

  drawHud() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '600 15px ui-monospace, Menlo, monospace';

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.accent;
    ctx.fillText('PUNTOS', 28, 18);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.fillText(formatScore(this.score), 28, 38);

    ctx.textAlign = 'center';
    ctx.font = '600 15px ui-monospace, Menlo, monospace';
    ctx.fillStyle = COLORS.accent;
    ctx.fillText('RÉCORD', WIDTH / 2, 18);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.fillText(formatScore(this.highScore), WIDTH / 2, 38);

    ctx.textAlign = 'right';
    ctx.font = '600 15px ui-monospace, Menlo, monospace';
    ctx.fillStyle = COLORS.accent;
    ctx.fillText('OLEADA', WIDTH - 28, 18);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.fillText(String(this.wave).padStart(2, '0'), WIDTH - 28, 38);

    for (let i = 0; i < this.lives; i += 1) {
      drawSprite(ctx, SPRITES.player, 28 + i * 27, HEIGHT - 36, 22, 12, COLORS.player);
    }

    ctx.textAlign = 'right';
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(129, 149, 196, 0.8)';
    ctx.fillText('P · PAUSA    M · SONIDO', WIDTH - 28, HEIGHT - 32);
    ctx.restore();
  }

  drawBanner() {
    if (!this.banner) return;

    const ctx = this.ctx;
    const elapsed = this.banner.max - this.banner.time;
    const alpha = Math.max(
      0,
      Math.min(1, elapsed / 0.18, this.banner.time / 0.3),
    );

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(91, 140, 255, 0.85)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '700 40px ui-monospace, Menlo, monospace';
    ctx.fillText(this.banner.text, WIDTH / 2, HEIGHT / 2 - 16);

    if (this.banner.sub) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.accent;
      ctx.font = '600 15px ui-monospace, Menlo, monospace';
      ctx.fillText(this.banner.sub, WIDTH / 2, HEIGHT / 2 + 30);
    }
    ctx.restore();
  }
}
