/* Constantes de Asteroids en Playkora. */

export const WIDTH = 960;
export const HEIGHT = 720;

export const STORAGE = Object.freeze({
  best: 'asteroides:best',
  muted: 'asteroides:muted',
});

export const CONFIG = Object.freeze({
  rotate: 4.2,
  thrust: 300,
  drag: 0.992,
  maxSpeed: 420,
  bulletSpeed: 540,
  bulletLife: 1.1,
  fireDelay: 0.15,
  lives: 3,
  respawn: 1.2,
  shieldTime: 8,
  radius: Object.freeze({ 3: 46, 2: 28, 1: 16 }),
  speed: Object.freeze({ 3: 42, 2: 74, 1: 118 }),
  points: Object.freeze({ 3: 20, 2: 50, 1: 100 }),
});
