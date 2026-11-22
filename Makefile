IMAGE ?= playkora
PORT ?= 8080

.PHONY: up down build logs restart sh check

up:
	docker compose up -d --build

down:
	docker compose down

build:
	docker build -t $(IMAGE):latest .

logs:
	docker compose logs -f

restart:
	docker compose restart

sh:
	docker compose exec playkora sh

check:
	curl -fsS http://localhost:$(PORT)/healthz
	curl -fsSI http://localhost:$(PORT)/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/prisma-asalto/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/serpiente-poderes/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/cazaluces/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/mosaico-lunar/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/bastion-lumen/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/freedoom/phase1/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/freedoom/phase2/ | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/freedoom/wads/freedoom1.wad.gz | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/freedoom/wads/freedoom2.wad.gz | head -n 1
	curl -fsSI http://localhost:$(PORT)/games/freedoom/portada.jpeg | head -n 1
	curl -fsSI http://localhost:$(PORT)/privacidad.html | head -n 1
	curl -fsSI http://localhost:$(PORT)/cookies.html | head -n 1
	curl -fsSI http://localhost:$(PORT)/ads.txt | head -n 1
	curl -fsSI http://localhost:$(PORT)/novedades.html | head -n 1
	@! grep -q 'unsafe-inline' nginx.conf || (echo "CSP relajada detectada" >&2; exit 1)
	@! grep -RqI --exclude-dir=.git --exclude=Makefile -E '\{\{RFC\}\}|--rfc|\bRFC\b|sin anuncios' . || (echo "Texto prohibido encontrado" >&2; exit 1)
