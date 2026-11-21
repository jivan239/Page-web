import {
  AUTO_NEXT,
  BASE_HP,
  BUILDABLE_CELLS,
  CORE,
  ENEMIES,
  MAX_LEVEL,
  MAX_REWARDS,
  PATH,
  REWARD_GOLD,
  REWARD_HEAL,
  START_GOLD,
  STORAGE,
  TOWERS,
  VICTORY_WAVE,
  WORLD,
  pointAt,
  sellValue,
  towerStats,
  upgradeCost,
  wavePlan,
} from './config.js';
import { REWARDS, onGameOver } from './monetization.js';

function readBest() {
  try {
    const value = Number(localStorage.getItem(STORAGE.best));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    return 0;
  }
}

export class Game {
  constructor({ sound }) {
    this.sound = sound;
    this.best = readBest();
    this.reset();
  }

  /* ---------- Ciclo de partida ---------- */

  reset() {
    this.phase = 'idle';
    this.paused = false;
    this.endless = false;
    this.speed = 1;
    this.time = 0;
    this.shake = 0;

    this.gold = START_GOLD;
    this.hp = BASE_HP;
    this.wave = 0;
    this.wavesCleared = 0;
    this.defeated = 0;
    this.leaked = 0;
    this.rewardsUsed = 0;

    this.plan = null;
    this.spawnIndex = 0;
    this.spawnTimer = 0;
    this.countdown = AUTO_NEXT;

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.floaters = [];
    this.occupied = new Set();

    this.buildType = null;
    this.selectedId = null;
    this.hover = null;
    this.summary = null;
    this.nextId = 1;
  }

  start() {
    const best = this.best;
    this.reset();
    this.best = best;
    this.phase = 'playing';
    this.sound.play('start');
  }

  saveBest() {
    try {
      localStorage.setItem(STORAGE.best, String(this.best));
    } catch (error) {
      /* modo privado */
    }
  }

  togglePause() {
    if (this.phase !== 'playing') return;
    this.paused = !this.paused;
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
  }

  continueEndless() {
    if (this.phase !== 'victory') return;
    this.endless = true;
    this.phase = 'playing';
    this.countdown = AUTO_NEXT;
  }

  get selectedTower() {
    if (this.selectedId === null) return null;
    return this.towers.find((tower) => tower.id === this.selectedId) || null;
  }

  get waveActive() {
    return Boolean(this.plan) && (this.spawnIndex < this.plan.types.length || this.enemies.length > 0);
  }

  /* ---------- Oleadas ---------- */

  startWave() {
    if (this.phase !== 'playing' || this.paused || this.waveActive) return false;

    this.wave += 1;
    this.plan = wavePlan(this.wave);
    this.spawnIndex = 0;
    this.spawnTimer = 0.3;
    this.countdown = 0;

    if (this.wave > this.best) {
      this.best = this.wave;
      this.saveBest();
    }

    this.floatText(CORE.x - 40, CORE.y - 48, `Oleada ${this.wave}`, '#ffd479', 1.4);
    this.sound.play(this.plan.boss ? 'boss' : 'wave');
    return true;
  }

  updateWave(dt) {
    if (this.plan) {
      this.spawnTimer -= dt;
      while (this.spawnTimer <= 0 && this.spawnIndex < this.plan.types.length) {
        this.spawnEnemy(this.plan.types[this.spawnIndex]);
        this.spawnIndex += 1;
        this.spawnTimer += this.plan.interval;
      }
      return;
    }

    if (this.countdown > 0) {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.startWave();
      }
    }
  }

  finishWave() {
    const done = this.plan;
    this.plan = null;
    this.wavesCleared += 1;
    this.gold += done.bonus;
    this.floatText(CORE.x - 40, CORE.y - 48, `+${done.bonus} oro`, '#7dffb0', 1.3);

    if (this.wave >= VICTORY_WAVE && !this.endless) {
      this.phase = 'victory';
      this.sound.play('victory');
    } else {
      this.countdown = AUTO_NEXT;
      this.sound.play('waveClear');
    }
  }

  spawnEnemy(type) {
    const def = ENEMIES[type];
    const hp = Math.round(this.plan.hp * def.hp);
    const start = PATH.points[0];
    this.enemies.push({
      id: this.nextId++,
      type,
      def,
      hp,
      maxHp: hp,
      speed: this.plan.speed * def.speed,
      dist: 0,
      x: start.x,
      y: start.y,
      dx: 1,
      dy: 0,
      slow: 0,
      hit: 0,
      phase: Math.random() * Math.PI * 2,
    });
  }

  /* ---------- Actualización ---------- */

  update(dt) {
    if (this.phase !== 'playing' || this.paused) return;

    const step = Math.min(dt, 0.05) * this.speed;
    this.time += step;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - step * 2.5);

    this.updateWave(step);
    this.updateEnemies(step);
    if (this.phase !== 'playing') return;
    this.updateTowers(step);
    this.updateProjectiles(step);
    this.updateEffects(step);

    if (this.plan && this.spawnIndex >= this.plan.types.length && this.enemies.length === 0) {
      this.finishWave();
    }
  }

  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const factor = enemy.slow > 0 ? 0.58 : 1;
      if (enemy.slow > 0) enemy.slow = Math.max(0, enemy.slow - dt);
      if (enemy.hit > 0) enemy.hit = Math.max(0, enemy.hit - dt);

      enemy.dist += enemy.speed * factor * dt;
      if (enemy.dist >= PATH.total) {
        this.hp = Math.max(0, this.hp - enemy.def.leak);
        this.leaked += 1;
        this.shake = 1;
        this.floatText(CORE.x, CORE.y - 30, `-${enemy.def.leak}`, '#ff6b8a');
        this.sound.play('leak');
        this.enemies.splice(i, 1);
        if (this.hp <= 0) {
          this.gameOver();
          return;
        }
        continue;
      }

      const point = pointAt(enemy.dist);
      enemy.x = point.x;
      enemy.y = point.y;
      enemy.dx = point.dx;
      enemy.dy = point.dy;
    }
  }

  updateTowers(dt) {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.recoil > 0) tower.recoil = Math.max(0, tower.recoil - dt * 6);

      const stats = towerStats(tower.def, tower.level);
      let target = null;
      let farthest = -1;

      /* Prioriza al enemigo más cercano al núcleo. */
      for (const enemy of this.enemies) {
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        if (dx * dx + dy * dy <= stats.range * stats.range && enemy.dist > farthest) {
          target = enemy;
          farthest = enemy.dist;
        }
      }

      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) {
        this.fire(tower, target, stats);
        tower.cooldown = 1 / stats.rate;
        tower.recoil = 1;
      }
    }
  }

  fire(tower, target, stats) {
    const offset = 17;
    const x = tower.x + Math.cos(tower.angle) * offset;
    const y = tower.y + Math.sin(tower.angle) * offset;
    this.projectiles.push({
      id: this.nextId++,
      x,
      y,
      px: x,
      py: y,
      target,
      damage: stats.damage,
      aoe: stats.aoe,
      speed: tower.def.shotSpeed,
      color: tower.def.color,
      life: 2.5,
    });
    this.sound.play(`shoot_${tower.def.id}`);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const shot = this.projectiles[i];
      const target = shot.target;

      /* Si el objetivo murió, el proyectil se descarta: nunca queda suelto. */
      if (!target || target.hp <= 0 || !this.enemies.includes(target)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      shot.px = shot.x;
      shot.py = shot.y;
      const dx = target.x - shot.x;
      const dy = target.y - shot.y;
      const distance = Math.hypot(dx, dy);
      const travel = shot.speed * dt;

      /* El umbral incluye el radio: no hay saltos por encima del objetivo. */
      if (distance <= travel + target.def.radius * 0.7) {
        this.impact(shot, target);
        this.projectiles.splice(i, 1);
        continue;
      }

      shot.x += (dx / distance) * travel;
      shot.y += (dy / distance) * travel;
      shot.life -= dt;
      if (
        shot.life <= 0 ||
        shot.x < -40 || shot.x > WORLD.width + 40 ||
        shot.y < -40 || shot.y > WORLD.height + 40
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  impact(shot, target) {
    if (shot.aoe > 0) {
      this.effects.push({ type: 'blast', x: target.x, y: target.y, radius: shot.aoe, life: 0.36, max: 0.36, color: shot.color });
      this.sound.play('impact');
      for (const enemy of [...this.enemies]) {
        const dx = enemy.x - target.x;
        const dy = enemy.y - target.y;
        if (dx * dx + dy * dy <= shot.aoe * shot.aoe) {
          this.damage(enemy, enemy === target ? shot.damage : shot.damage * 0.7, true);
        }
      }
    } else {
      this.effects.push({ type: 'spark', x: target.x, y: target.y, radius: 12, life: 0.18, max: 0.18, color: shot.color });
      this.sound.play('hit');
      this.damage(target, shot.damage);
    }
  }

  damage(enemy, amount, area = false) {
    if (enemy.hp <= 0) return;
    enemy.hp -= amount;
    enemy.hit = 0.12;
    if (area && enemy.type !== 'boss') enemy.slow = Math.max(enemy.slow, 1.1);

    if (enemy.hp > 0) return;

    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);

    const reward = Math.max(2, Math.round((4 + this.wave * 0.8) * enemy.def.reward));
    this.gold += reward;
    this.defeated += 1;
    this.floatText(enemy.x, enemy.y, `+${reward}`, '#ffd479');
    this.sound.play('coin');
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      this.floaters[i].life -= dt;
      if (this.floaters[i].life <= 0) this.floaters.splice(i, 1);
    }
  }

  floatText(x, y, text, color, life = 0.9) {
    this.floaters.push({ x, y, text, color, life, max: life });
  }

  /* ---------- Construcción y mejoras ---------- */

  setBuildType(type) {
    if (this.phase !== 'playing') return;
    this.buildType = this.buildType === type ? null : type;
    if (this.buildType) this.selectedId = null;
  }

  selectTower(tower) {
    this.selectedId = tower ? tower.id : null;
    if (this.selectedId) this.buildType = null;
  }

  /**
   * Celda más cercana al toque. El radio no puede superar media celda (20)
   * para no confundir una casilla vecina con la que se quiere construir.
   */
  nearestCell(x, y, includeOccupied = false) {
    let best = null;
    let bestDistance = 28;
    for (const cell of BUILDABLE_CELLS) {
      if (!includeOccupied && this.occupied.has(cell.key)) continue;
      const distance = Math.hypot(cell.x - x, cell.y - y);
      if (distance < bestDistance) {
        best = cell;
        bestDistance = distance;
      }
    }
    return best;
  }

  nearestBuildCell(x, y) {
    return this.nearestCell(x, y, false);
  }

  /** Celda visual más cercana, ocupada o no, para avisar en lugar de seleccionar. */
  cellAt(x, y) {
    return this.nearestCell(x, y, true);
  }

  towerAt(x, y) {
    let best = null;
    let bestDistance = 18;
    for (const tower of this.towers) {
      const distance = Math.hypot(tower.x - x, tower.y - y);
      if (distance < bestDistance) {
        best = tower;
        bestDistance = distance;
      }
    }
    return best;
  }

  placeTower(type, cell) {
    const def = TOWERS[type];
    if (!def || !cell || this.phase !== 'playing') return { ok: false, reason: 'idle' };
    if (this.occupied.has(cell.key)) return { ok: false, reason: 'ocupada' };
    if (this.gold < def.cost) {
      this.sound.play('deny');
      return { ok: false, reason: 'oro' };
    }

    const tower = {
      id: this.nextId++,
      def,
      type,
      x: cell.x,
      y: cell.y,
      col: cell.col,
      row: cell.row,
      key: cell.key,
      level: 1,
      invested: def.cost,
      cooldown: 0.12,
      angle: -Math.PI / 2,
      recoil: 0,
    };
    this.towers.push(tower);
    this.occupied.add(cell.key);
    this.gold -= def.cost;
    this.sound.play('build');
    return { ok: true, tower };
  }

  upgrade(tower) {
    if (!tower || tower.level >= MAX_LEVEL) return { ok: false, reason: 'max' };
    const cost = upgradeCost(tower.def, tower.level);
    if (this.gold < cost) {
      this.sound.play('deny');
      return { ok: false, reason: 'oro', cost };
    }
    this.gold -= cost;
    tower.invested += cost;
    tower.level += 1;
    this.sound.play('upgrade');
    this.floatText(tower.x, tower.y - 18, `NV ${tower.level}`, tower.def.color);
    return { ok: true, cost };
  }

  sell(tower) {
    if (!tower) return { ok: false };
    const refund = sellValue(tower);
    const index = this.towers.indexOf(tower);
    if (index < 0) return { ok: false };
    this.towers.splice(index, 1);
    this.occupied.delete(tower.key);
    if (this.selectedId === tower.id) this.selectedId = null;
    this.gold += refund;
    this.sound.play('sell');
    this.floatText(tower.x, tower.y, `+${refund}`, '#ffd479');
    return { ok: true, refund };
  }

  /* ---------- Recompensas simuladas ---------- */

  /* El anuncio se valida fuera (RewardManager -> onRewardAction); aquí solo se
   * aplica el efecto, para no regalar recompensas si el anuncio falla. */
  applyReward(type) {
    if (this.phase !== 'playing') return { ok: false, reason: 'idle' };
    if (this.rewardsUsed >= MAX_REWARDS) return { ok: false, reason: 'limite' };

    this.rewardsUsed += 1;
    if (type === REWARDS.BONUS) {
      this.gold += REWARD_GOLD;
      this.floatText(CORE.x - 60, CORE.y - 50, `+${REWARD_GOLD} oro`, '#ffd479', 1.2);
    } else if (type === REWARDS.LIFE) {
      this.hp = Math.min(BASE_HP, this.hp + REWARD_HEAL);
      this.floatText(CORE.x, CORE.y - 50, `+${REWARD_HEAL} HP`, '#7dffb0', 1.2);
    } else {
      this.rewardsUsed -= 1;
      return { ok: false, reason: 'tipo' };
    }

    this.sound.play('reward');
    return { ok: true, type };
  }

  /* ---------- Fin de partida ---------- */

  gameOver() {
    this.phase = 'gameover';
    this.paused = false;
    this.buildType = null;
    this.selectedId = null;
    this.sound.play('gameover');

    const summary = {
      cleared: this.wavesCleared,
      reached: this.wave,
      defeated: this.defeated,
      leaked: this.leaked,
      best: this.best,
    };

    /* Punto centralizado: aquí se conectará el intersticial de AdSense. */
    this.summary = onGameOver(summary);
    return this.summary;
  }
}
