/*
 * Puntos ÚNICOS de conexión con la monetización de Playkora.
 *
 * ---------------------------------------------------------------------------
 * TODO(ADS) — Intersticial al terminar la partida
 *   onGameOver(summary) se llama cuando el juego termina, justo después de
 *   guardar el resumen y mostrar la pantalla correspondiente.
 *   Aquí se pedirá el intersticial cuando la cuenta de AdSense esté aprobada:
 *     showInterstitial().catch(() => {});   // nunca bloquear el resumen
 *   Requiere consentimiento publicitario vigente (js/consent.js).
 *
 * TODO(ADS) — Anuncio recompensado
 *   onRewardAction(type) se llama después de que el usuario confirme una
 *   recompensa. Sustituir la simulación por:
 *     showRewardedAd(type).then((ok) => ok && grantReward(type));
 *   El juego SOLO aplica vidas/oro/puntos si esta función devuelve true, para
 *   no regalar recompensas cuando el anuncio no se haya completado.
 *
 * Por ahora NO se carga ningún SDK ni se pide publicidad: todo es simulado.
 * ---------------------------------------------------------------------------
 */

export const REWARDS = Object.freeze({
  LIFE: 'life',
  BONUS: 'bonus',
});

export const REWARD_TYPES = Object.freeze([REWARDS.LIFE, REWARDS.BONUS]);
export const MAX_EXTRA_LIVES = 2;
export const MAX_BONUS = 1;

/** Se invoca al perder. Devuelve el resumen para que la UI lo muestre. */
export function onGameOver(summary) {
  // TODO(ADS): mostrar aquí el intersticial, sin retrasar el resumen.
  return summary;
}

/** Puerta de entrada a las recompensas. true = anuncio completado (simulado). */
export function onRewardAction(type) {
  // TODO(ADS): reemplazar por showRewardedAd(type) y esperar a su resultado.
  return REWARD_TYPES.includes(type);
}

/** Controla los límites por partida, independientes del juego que los use. */
export class RewardManager {
  constructor({ maxLives = MAX_EXTRA_LIVES, maxBonus = MAX_BONUS } = {}) {
    this.maxLives = maxLives;
    this.maxBonus = maxBonus;
    this.reset();
  }

  reset() {
    this.livesUsed = 0;
    this.bonusUsed = 0;
  }

  get livesLeft() {
    return Math.max(0, this.maxLives - this.livesUsed);
  }

  get bonusLeft() {
    return Math.max(0, this.maxBonus - this.bonusUsed);
  }

  canClaim(type) {
    if (type === REWARDS.LIFE) return this.livesLeft > 0;
    if (type === REWARDS.BONUS) return this.bonusLeft > 0;
    return false;
  }

  /** Devuelve { ok, type } cuando el "anuncio" se completó y cabe en el límite. */
  claim(type) {
    if (!this.canClaim(type)) return { ok: false, reason: 'limite', type };
    if (!onRewardAction(type)) return { ok: false, reason: 'anuncio', type };

    if (type === REWARDS.LIFE) this.livesUsed += 1;
    else this.bonusUsed += 1;

    return { ok: true, type };
  }

  /** Si el juego no pudo aplicar el efecto, se devuelve el uso disponible. */
  rollback(type) {
    if (type === REWARDS.LIFE && this.livesUsed > 0) this.livesUsed -= 1;
    if (type === REWARDS.BONUS && this.bonusUsed > 0) this.bonusUsed -= 1;
  }
}
