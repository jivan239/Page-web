/*
 * Cargador de Auto ads. Solo se activa cuando:
 *   1. enabled === true en ads-config.js, y
 *   2. hay un ID de publicador válido.
 * En local permanece inactivo para no generar impresiones de prueba.
 */
(() => {
  'use strict';

  const cfg = window.PLAYKORA_ADS || {};
  if (cfg.enabled !== true) return;

  const id = cfg.publisherId;
  if (!/^ca-pub-\d{16}$/.test(id)) {
    if (window.console && console.warn) {
      console.warn('[Playkora] ID de AdSense no válido; anuncios desactivados.');
    }
    return;
  }

  if (document.querySelector('script[data-playkora-ads]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.playkoraAds = 'true';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}`;
  document.head.appendChild(script);
})();
