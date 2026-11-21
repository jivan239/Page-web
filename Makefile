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
	curl -fsSI http://localhost:$(PORT)/privacidad.html | head -n 1
	curl -fsSI http://localhost:$(PORT)/cookies.html | head -n 1
	curl -fsSI http://localhost:$(PORT)/ads.txt | head -n 1
