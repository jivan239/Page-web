/*
 * UI compartida de anuncios simulados y recompensas de Playkora.
 *
 * Se carga como script clásico (no módulo) para que puedan usarlo tanto los
 * juegos conimportaciones ES como Serpiente de Poderes, que es un IIFE.
 * Expone window.PlaykoraRewardsUI.
 *
 * Todo es local: no se carga ningún SDK, iframe ni recurso externo, por lo que
 * respeta la CSP estricta de nginx.conf ('self', sin inline).
 */
(() => {
  'use strict';

  const AD_MS = 900;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const createAdSlot = (options = {}) => {
    const label = options.label || 'Espacio publicitario';
    const hint = options.hint || 'Aquí se mostrará el anuncio cuando esté activo.';

    const slot = el('section', 'pk-ad');
    slot.setAttribute('aria-label', label);
    slot.appendChild(el('span', 'pk-ad__label', label));

    const frame = el('div', 'pk-ad__frame');
    frame.appendChild(el('span', '', 'Anuncio simulado'));
    frame.appendChild(el('span', 'pk-ad__hint', hint));
    slot.appendChild(frame);
    return slot;
  };

  const showSimulatedAd = (type, done) => {
    const modal = el('div', 'pk-admodal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Anuncio simulado');

    const box = el('div', 'pk-admodal__box');
    box.appendChild(el('p', 'pk-admodal__kicker', 'Playkora · Anuncio simulado'));
    box.appendChild(
      el(
        'p',
        'pk-admodal__text',
        type === 'life'
          ? 'Cargando anuncio para ganar una vida extra…'
          : 'Cargando anuncio para obtener tu recompensa…',
      ),
    );

    const track = el('div', 'pk-admodal__track');
    track.appendChild(el('div', 'pk-admodal__progress'));
    box.appendChild(track);
    modal.appendChild(box);
    document.body.appendChild(modal);

    let finished = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKey);
      modal.remove();
      done(ok);
    };

    const timer = window.setTimeout(() => finish(true), AD_MS);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        window.clearTimeout(timer);
        finish(false);
      }
    });
    const onKey = (event) => {
      if (event.key === 'Escape') {
        window.clearTimeout(timer);
        finish(false);
      }
    };
    document.addEventListener('keydown', onKey, { once: true });
    const originalFinish = finish;
    return {
      cancel: () => {
        window.clearTimeout(timer);
        originalFinish(false);
      },
      cleanup: () => document.removeEventListener('keydown', onKey),
    };
  };

  const mount = (options = {}) => {
    const host =
      typeof options.host === 'string'
        ? document.querySelector(options.host)
        : options.host || document.body;

    const wrapper = el('div', 'pk-rewards');
    const adSlot = createAdSlot(options.ad);
    const bar = el('div', 'pk-rewards__bar');
    const status = el('p', 'pk-rewards__status', '');
    status.setAttribute('aria-live', 'polite');

    const lifeBtn = el('button', 'pk-rewards__btn');
    lifeBtn.type = 'button';
    lifeBtn.dataset.pkReward = 'life';

    const bonusBtn = el('button', 'pk-rewards__btn');
    bonusBtn.type = 'button';
    bonusBtn.dataset.pkReward = 'bonus';

    bar.appendChild(lifeBtn);
    bar.appendChild(bonusBtn);
    wrapper.appendChild(adSlot);
    wrapper.appendChild(bar);
    wrapper.appendChild(status);
    host.appendChild(wrapper);

    let maxLives = options.maxLives || 2;
    let maxBonus = options.maxBonus || 1;
    let livesLeft = options.livesLeft === undefined ? maxLives : options.livesLeft;
    let bonusLeft = options.bonusLeft === undefined ? maxBonus : options.bonusLeft;
    let active = null;

    const render = () => {
      lifeBtn.textContent = '';
      lifeBtn.appendChild(
        document.createTextNode(`${options.lifeLabel || 'Vida extra'} (anuncio) `),
      );
      lifeBtn.appendChild(el('span', 'pk-rewards__count', String(livesLeft)));
      bonusBtn.textContent = '';
      bonusBtn.appendChild(
        document.createTextNode(`${options.bonusLabel || 'Recompensa'} (anuncio) `),
      );
      bonusBtn.appendChild(el('span', 'pk-rewards__count', String(bonusLeft)));
      const canLife = typeof options.canLife === 'function' ? options.canLife() : true;
      const canBonus = typeof options.canBonus === 'function' ? options.canBonus() : true;
      lifeBtn.disabled = livesLeft <= 0 || !canLife;
      bonusBtn.disabled = bonusLeft <= 0 || !canBonus;
    };

    const setStatus = (text) => {
      status.textContent = text || '';
    };

    const update = (next = {}) => {
      if (typeof next.maxLives === 'number') maxLives = next.maxLives;
      if (typeof next.maxBonus === 'number') maxBonus = next.maxBonus;
      if (typeof next.livesLeft === 'number') livesLeft = next.livesLeft;
      if (typeof next.bonusLeft === 'number') bonusLeft = next.bonusLeft;
      if (next.status !== undefined) setStatus(next.status);
      render();
    };

    const request = (type) => {
      if (active) return;
      const handler = type === 'life' ? options.onLife : options.onBonus;
      if (typeof handler !== 'function') return;
      if (type === 'life' && livesLeft <= 0) return;
      if (type === 'bonus' && bonusLeft <= 0) return;

      setStatus('Reproduciendo anuncio simulado…');
      active = showSimulatedAd(type, (ok) => {
        active = null;
        if (!ok) {
          setStatus('Anuncio cancelado; no se entregó la recompensa.');
          return;
        }
        const result = handler(type);
        /* El juego ya descontó el uso con RewardManager y lo refleja en update().
         * refresh() vuelve a leer los contadores reales para no descontar dos veces. */
        const apply = (granted) => {
          if (typeof options.refresh === 'function') options.refresh();
          if (granted === false) {
            setStatus('No se pudo entregar la recompensa.');
          } else {
            setStatus(type === 'life' ? '¡Vida extra conseguida!' : '¡Recompensa conseguida!');
          }
          render();
        };
        if (result && typeof result.then === 'function') result.then(apply, () => apply(false));
        else apply(result);
      });
    };

    const onClick = (event) => {
      const btn = event.target.closest('[data-pk-reward]');
      if (!btn || !wrapper.contains(btn)) return;
      request(btn.dataset.pkReward);
    };
    wrapper.addEventListener('click', onClick);

    render();

    return {
      element: wrapper,
      update,
      setStatus,
      reset(next = {}) {
        livesLeft = typeof next.livesLeft === 'number' ? next.livesLeft : maxLives;
        bonusLeft = typeof next.bonusLeft === 'number' ? next.bonusLeft : maxBonus;
        setStatus(next.status || '');
        render();
      },
      destroy() {
        if (active && active.cancel) active.cancel();
        wrapper.removeEventListener('click', onClick);
        wrapper.remove();
      },
    };
  };

  window.PlaykoraRewardsUI = Object.freeze({ createAdSlot, mount });
})();
