/* Constantes del 2048 de Playkora. */

export const SIZE = 4;

export const STORAGE = Object.freeze({
  best: 'dosMil48:best',
  muted: 'dosMil48:muted',
});

/* Fondo y tinta de cada ficha. La última entrada también cubre valores > 2048. */
export const PALETTE = Object.freeze({
  0: ['rgba(140, 170, 230, 0.10)', '#7e8db0'],
  2: ['#26365c', '#dbe7ff'],
  4: ['#2c4f7c', '#e8f3ff'],
  8: ['#2f8f8f', '#eafffb'],
  16: ['#3f9f64', '#f0fff4'],
  32: ['#7a9f3f', '#f7ffe0'],
  64: ['#b58a37', '#fff8dd'],
  128: ['#c46d3c', '#fff1e6'],
  256: ['#c24f52', '#fff0f0'],
  512: ['#a3427f', '#fff0fa'],
  1024: ['#6f4fbf', '#f4efff'],
  2048: ['#d9a72c', '#2a1a00'],
});

export const TIMING = Object.freeze({
  slide: 120,
  pop: 200,
});
