/*
 * Banner de consentimiento + Google Consent Mode v2.
 * Se carga antes que el script de anuncios para que las señales de consentimiento
 * estén disponibles cuando AdSense haga su primera petición.
 */
(() => {
  'use strict';

  const cfg = window.PLAYKORA_ADS || {};
  const KEY = cfg.consentKey || 'playkora:consent';
  const depth = window.location.pathname.replace(/\/+$/, '').split('/').length - 1;
  const BASE = '../'.repeat(Math.max(0, depth));
  const DEFAULT = Object.freeze({
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  let state = Object.assign({}, DEFAULT);
  let banner = null;

  const normalize = (value) => {
    const out = {};
    for (const key of Object.keys(DEFAULT)) {
      out[key] = value && value[key] === 'granted' ? 'granted' : 'denied';
    }
    return out;
  };

  const read = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return normalize(parsed);
    } catch (error) {
      return null;
    }
  };

  const syncForm = () => {
    if (!banner) return;
    const ad = banner.querySelector('#consent-ad');
    const personal = banner.querySelector('#consent-personal');
    if (ad) ad.checked = state.ad_storage === 'granted';
    if (personal) {
      personal.checked = state.ad_personalization === 'granted';
      personal.disabled = state.ad_storage !== 'granted';
    }
  };

  const closeBanner = () => {
    if (!banner) return;
    /* Evita dejar el foco dentro de un aria-hidden al cerrar el banner. */
    if (banner.contains(document.activeElement)) document.activeElement.blur();
    banner.classList.remove('is-open');
    banner.setAttribute('aria-hidden', 'true');
  };

  const openBanner = () => {
    if (!banner) banner = createBanner();
    syncForm();
    banner.classList.add('is-open');
    banner.setAttribute('aria-hidden', 'false');
    const first = banner.querySelector('[data-consent="accept"]');
    if (first) first.focus();
  };

  const apply = (next, persist) => {
    state = normalize(next);
    window.gtag('consent', 'update', state);
    document.documentElement.setAttribute(
      'data-consent',
      state.ad_storage === 'granted' ? 'granted' : 'denied',
    );
    if (persist) {
      try {
        localStorage.setItem(KEY, JSON.stringify(Object.assign({}, state, { ts: Date.now() })));
      } catch (error) {
        /* modo privado */
      }
    }
    closeBanner();
    syncForm();
  };

  const createBanner = () => {
    const el = document.createElement('aside');
    el.className = 'consent';
    el.id = 'consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'consent-title');
    el.setAttribute('aria-describedby', 'consent-text');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="consent__box">
        <p class="consent__kicker">Playkora · Privacidad</p>
        <h2 class="consent__title" id="consent-title">Tus preferencias de anuncios</h2>
        <p class="consent__text" id="consent-text">
          Usamos tecnologías de Google para mostrar anuncios y mantener el
          servidor. Puedes aceptarlos, rechazarlos o elegir qué permites.
          Tu decisión se guarda en este navegador y puedes cambiarla cuando
          quieras desde el enlace «Configurar cookies».
        </p>

        <div class="consent__options" id="consent-options" hidden>
          <label class="consent__check">
            <input type="checkbox" id="consent-ad" />
            <span>Permitir almacenamiento y datos de anuncios</span>
          </label>
          <label class="consent__check">
            <input type="checkbox" id="consent-personal" />
            <span>Permitir anuncios personalizados</span>
          </label>
        </div>

        <div class="consent__actions">
          <button class="consent__btn consent__btn--primary" type="button" data-consent="accept">
            Aceptar todo
          </button>
          <button class="consent__btn" type="button" data-consent="reject">
            Rechazar
          </button>
          <button class="consent__btn consent__btn--quiet" type="button" data-consent="customize">
            Personalizar
          </button>
        </div>

        <div class="consent__actions" id="consent-save" hidden>
          <button class="consent__btn consent__btn--primary" type="button" data-consent="save">
            Guardar selección
          </button>
        </div>

        <p class="consent__links">
          <a href="${BASE}privacidad.html">Privacidad</a>
          <a href="${BASE}cookies.html">Cookies</a>
        </p>
      </div>
    `;

    el.addEventListener('click', (event) => {
      const button = event.target.closest('[data-consent]');
      if (!button) return;

      const action = button.dataset.consent;
      const options = el.querySelector('#consent-options');
      const save = el.querySelector('#consent-save');

      if (action === 'accept') {
        apply({
          ad_storage: 'granted',
          analytics_storage: 'denied',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        }, true);
      } else if (action === 'reject') {
        apply(DEFAULT, true);
      } else if (action === 'customize') {
        const opening = options.hidden;
        options.hidden = !opening;
        save.hidden = !opening;
        button.setAttribute('aria-expanded', String(opening));
        if (opening) {
          const first = el.querySelector('#consent-ad');
          if (first) first.focus();
        }
      } else if (action === 'save') {
        const ad = el.querySelector('#consent-ad').checked ? 'granted' : 'denied';
        const personal = el.querySelector('#consent-personal').checked && ad === 'granted'
          ? 'granted'
          : 'denied';
        apply({
          ad_storage: ad,
          analytics_storage: 'denied',
          ad_user_data: ad,
          ad_personalization: personal,
        }, true);
      }
    });

    const personal = () => el.querySelector('#consent-personal');
    const ad = () => el.querySelector('#consent-ad');
    if (ad() && personal()) {
      ad().addEventListener('change', () => {
        personal().disabled = !ad().checked;
        if (!ad().checked) personal().checked = false;
      });
    }

    document.body.appendChild(el);
    return el;
  };

  /* Valores por defecto: todo denegado hasta que el usuario decida. */
  window.gtag('consent', 'default', Object.assign({ wait_for_update: 500 }, DEFAULT));

  const saved = read();
  if (saved) apply(saved, false);
  else document.documentElement.setAttribute('data-consent', 'denied');

  document.addEventListener('DOMContentLoaded', () => {
    if (!read()) openBanner();

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-consent-open]')) openBanner();
    });
  });

  window.arcadeConsent = {
    get state() {
      return Object.assign({}, state);
    },
    open: openBanner,
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch (error) {
        /* modo privado */
      }
      openBanner();
    },
  };
})();
