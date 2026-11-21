#!/usr/bin/env python3
"""Rellena los marcadores de AdSense y deja el sitio listo para revisión.

Uso:
  python3 scripts/configure-ads.py \
    --domain tu-dominio.com \
    --email playkoraarc@gmail.com \
    --pub-id ca-pub-1234567890123456 \
    --enable

Sin --pub-id se actualiza el dominio y los anuncios siguen desactivados.
El titular, el domicilio y el correo ya vienen rellenados en las páginas legales.
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TEXT_FILES = [
    "robots.txt",
    "sitemap.xml",
    "privacidad.html",
    "cookies.html",
    "aviso-legal.html",
    "sobre-nosotros.html",
    "contacto.html",
    "recomendaciones.html",
    "novedades.html",
]


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--domain", required=True, help="Dominio sin protocolo, p. ej. tu-dominio.com")
    parser.add_argument("--email", help="Correo público de contacto")
    parser.add_argument("--pub-id", help="ID de AdSense: ca-pub-XXXXXXXXXXXXXXXX")
    parser.add_argument("--enable", action="store_true", help="Activar la carga de anuncios")
    return parser.parse_args()


def clean_domain(value):
    value = value.strip().lower()
    value = re.sub(r"^https?://", "", value)
    return value.rstrip("/")


def main():
    args = parse_args()
    domain = clean_domain(args.domain)

    pub_id = None
    if args.pub_id:
        match = re.fullmatch(r"(?:ca-)?(pub-\d{16})", args.pub_id.strip())
        if not match:
            print("Error: --pub-id debe tener el formato ca-pub-XXXXXXXXXXXXXXXX (16 dígitos).", file=sys.stderr)
            return 1
        pub_id = match.group(1)

    replacements = {"{{DOMINIO}}": domain}
    if args.email:
        replacements["{{EMAIL}}"] = args.email.strip()

    for name in TEXT_FILES:
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        for old, new in replacements.items():
            text = text.replace(old, new)
        path.write_text(text, encoding="utf-8")
        print(f"Actualizado {name}")

    if pub_id:
        ads_path = ROOT / "ads.txt"
        text = ads_path.read_text(encoding="utf-8")
        text = text.replace("# IMPORTANTE: sustituir pub-0000000000000000 por el ID real antes de publicar.\n", "")
        text = re.sub(r"pub-\d{16}", pub_id, text)
        ads_path.write_text(text, encoding="utf-8")
        print("Actualizado ads.txt")

        config_path = ROOT / "js" / "ads-config.js"
        text = config_path.read_text(encoding="utf-8")
        text = re.sub(r"publisherId: '[^']*',", f"publisherId: 'ca-{pub_id}',", text)
        config_path.write_text(text, encoding="utf-8")
        print("Actualizado js/ads-config.js")

    config_path = ROOT / "js" / "ads-config.js"
    text = config_path.read_text(encoding="utf-8")
    text = re.sub(r"enabled: (true|false),", f"enabled: {'true' if args.enable else 'false'},", text)
    config_path.write_text(text, encoding="utf-8")

    leftovers = set()
    for path in [ROOT / name for name in TEXT_FILES]:
        leftovers.update(re.findall(r"\{\{[A-Z]+\}\}", path.read_text(encoding="utf-8")))

    if leftovers:
        print("\nAVISO: quedan marcadores sin rellenar: " + ", ".join(sorted(leftovers)))
        print("Vuelve a ejecutar el script con los argumentos que faltan.")

    if args.enable and not pub_id:
        print("\nAVISO: --enable sin --pub-id; los anuncios seguirán sin cargar.", file=sys.stderr)

    print(f"\nListo. Dominio: {domain} · Anuncios: {'activados' if args.enable else 'desactivados'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
