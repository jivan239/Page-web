export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const chance = (probability) => Math.random() < probability;

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function drawSprite(ctx, sprite, x, y, width, height, color) {
  const cols = sprite[0].length;
  const rows = sprite.length;
  const px = width / cols;
  const py = height / rows;
  const ox = Math.round(x);
  const oy = Math.round(y);

  ctx.fillStyle = color;
  for (let row = 0; row < rows; row += 1) {
    const line = sprite[row];
    for (let col = 0; col < cols; col += 1) {
      if (line[col] !== 'X') continue;
      ctx.fillRect(
        Math.round(ox + col * px),
        Math.round(oy + row * py),
        Math.ceil(px),
        Math.ceil(py),
      );
    }
  }
}

export function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

export function readNumber(key, fallback = 0) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Almacenamiento no disponible (modo privado, permisos, etc.).
  }
}
