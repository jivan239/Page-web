/*
 * Configuración de monetización de Playkora.
 *
 * enabled: se deja en false hasta que el sitio esté publicado y se tenga un
 *          ID real de AdSense. Así evitamos solicitar anuncios desde local.
 * publisherId: se reemplaza por el ca-pub-XXXXXXXXXXXXXXXX de AdSense.
 *
 * El script scripts/configure-ads.py actualiza este archivo, ads.txt,
 * robots.txt, sitemap.xml y las páginas legales de una sola vez.
 */
window.PLAYKORA_ADS = {
  enabled: false,
  publisherId: 'ca-pub-0000000000000000',
  consentKey: 'playkora:consent',
};
