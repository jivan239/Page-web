# Playkora · Docker + Web

Hub arcade con cinco juegos originales y cuatro clásicos jugables en el navegador:

- **Prisma Asalto** — shooter de cristales con oleadas, escudos destructibles y un orbe errante.
- **Serpiente de Poderes** — snake con manzanas de poder, trampas, combos y revive con fantasma.
- **Cazaluces** — laberinto original con Chispa, cuatro sombras, sus cuatro estados y sus personalidades de IA.
- **Mosaico Lunar** — puzzle de teselas que caen, con pieza fantasma, reserva y siete formas propias.
- **Bastión Lumen** — tower defense con circuito curvo, tres torretas, mejoras, jefes cada cinco oleadas y recompensas simuladas.
- **2048** — clásico de fusiones en un tablero 4×4, con deshacer, pausa y ficha extra opcional.
- **Asteroids** — clásico espacial con nave, disparos, asteroides que se parten, niveles, vidas, escudo y salto hiperespacial.
- **Freedoom Phase 1** (`freedoom1.wad.gz`) — nueve mapas y tres episodios del primer capítulo de Freedom.
- **Freedoom Phase 2** (`freedoom2.wad.gz`) — treinta y dos mapas y jefes, la continuación de Freedom.

Los cinco juegos originales y los dos clásicos ligeros (2048 y Asteroids) son HTML5 Canvas + JavaScript sin dependencias. Los dos Freedoom usan el motor Dwasm (PrBoom+ compilado a WebAssembly) con los WAD servidos desde el mismo contenedor. Todo se sirve con Nginx desde Docker.

## Arranque rápido

```bash
docker compose up -d --build
```

Abre <http://localhost:8080> para ver el hub.

Para usar otro puerto:

```bash
APP_PORT=3000 docker compose up -d --build
```

Sin Compose:

```bash
docker build -t playkora .
docker run -d --name playkora -p 8080:80 playkora
```

Comprobar el contenedor:

```bash
curl http://localhost:8080/healthz   # -> ok
docker compose ps
```

## Rutas

| Ruta | Contenido |
| --- | --- |
| `/` | Hub Playkora |
| `/games/prisma-asalto/` | Prisma Asalto |
| `/games/serpiente-poderes/` | Serpiente de Poderes |
| `/games/cazaluces/` | Cazaluces |
| `/games/mosaico-lunar/` | Mosaico Lunar |
| `/games/bastion-lumen/` | Bastión Lumen |
| `/games/2048/` | 2048 |
| `/games/asteroids/` | Asteroids |
| `/games/freedoom/phase1/` | Freedoom Phase 1 (Freedoom 1) |
| `/games/freedoom/phase2/` | Freedoom Phase 2 (Freedoom 2) |
| `/serpiente-poderes.html` | Redirección compatible con la ruta antigua |

## Controles

### Prisma Asalto

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Mover | `←` `→` o `A` `D` | Arrastrar sobre el lienzo o botones ◀ ▶ |
| Disparar | `Espacio` o `J` | Botón **Fuego** |
| Pausa | `P` o `Esc` | — |
| Sonido on/off | `M` | Botón en el pie |
| Empezar / reintentar | `Enter` o `Espacio` | Botón |

### Serpiente de Poderes

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Mover | Flechas o `W` `A` `S` `D` | Swipe sobre el tablero |
| Pausa | `Espacio` | Botón **II** |
| Sonido on/off | `M` | Botón del altavoz |
| Empezar / reintentar | `Espacio` o botón del overlay | Tocar el overlay |

### Cazaluces

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Mover | Flechas o `W` `A` `S` `D` | Swipe sobre el laberinto o cruceta |
| Pausa | `P` o `Espacio` | Botón **II** |
| Sonido on/off | `M` | Botón del altavoz |
| Empezar / reintentar | `Enter` o `Espacio` | Botón del overlay |

### Mosaico Lunar

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Mover | `←` `→` o `A` `D` | Botones ← → o deslizar |
| Bajar una fila | `↓` o `S` | Botón ↓ |
| Girar | `↑`, `W`, `X` (horario) / `Z` (antihorario) | Botón ⟲ o tocar el lienzo |
| Caída inmediata | `Espacio` | Botón ⤓ |
| Guardar tesela | `C` | Botón ⇄ |
| Pausa | `P` o `Esc` | Botón **II** |
| Sonido on/off | `M` | Botón del altavoz |
| Empezar / reintentar | `Enter` o `Espacio` | Botón del overlay |

### Bastión Lumen

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Elegir torreta | `1` Básica, `2` Ligera, `3` Pesada | Botón del arsenal |
| Colocar torreta | — | Toca una casilla libre junto al camino |
| Seleccionar / mejorar / vender | Toca la torreta y usa el panel | Toca la torreta y usa el panel |
| Mejorar / vender con torreta seleccionada | `U` / `X` | Botones del panel |
| Iniciar oleada | `Espacio` | Botón **Iniciar oleada** |
| Velocidad 1x / 2x | `F` | Botón **Velocidad** |
| Pausa | `P` o `Esc` | Botón **II** |
| Sonido on/off | `M` | Botón del altavoz |
| Recompensa simulada | — | Botón **Recompensa** (2 por partida) |
| Empezar / reintentar | `Enter` o `Espacio` | Botón del overlay |

### 2048

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Mover fichas | Flechas o `W` `A` `S` `D` | Deslizar sobre el tablero o botones direccionales |
| Deshacer jugada | `Z` u `U` | Botón ↶ |
| Pausa | `P` o `Esc` | Botón **II** |
| Nueva partida | `N` | Botón ↻ |
| Sonido on/off | `M` | Botón del altavoz |
| Empezar / reintentar | `Enter` o `Espacio` | Botón del overlay |

### Asteroids

| Acción | Teclado | Táctil |
| --- | --- | --- |
| Girar | `←` `→` o `A` `D` | Botones ↶ ↷ |
| Empujar | `↑` o `W` | Botón ▲ |
| Disparar | `Espacio` | Botón ● |
| Salto hiperespacial | `Mayús` | — |
| Pausa | `P` o `Esc` | Botón **II** |
| Reiniciar | `R` | Botón del overlay |
| Sonido on/off | `M` | Botón del altavoz |
| Empezar / reintentar | `Enter` o `Espacio` | Botón del overlay |

En el hub puedes pulsar del `1` al `9` para entrar directamente a cada juego.

## Estructura

```
.
├── index.html                     # Hub Playkora
├── serpiente-poderes.html         # Redirección a la nueva ruta
├── privacidad.html                # Política de privacidad
├── cookies.html                   # Política de cookies
├── aviso-legal.html               # Aviso legal
├── sobre-nosotros.html            # Sobre el proyecto
├── contacto.html                  # Contacto
├── novedades.html                 # Cambios recientes del proyecto
├── ads.txt                        # Declaración de publicador de AdSense
├── robots.txt                     # Instrucciones para rastreadores
├── sitemap.xml                    # Mapa del sitio
├── favicon.svg                    # Icono del hub
├── css/
│   ├── hub.css                    # Estilos del hub, tarjetas y fondo estelar
│   ├── consent.css                # Banner de cookies y pie legal compartido
│   ├── legal.css                  # Estilos de las páginas informativas
│   └── novedades.css              # Entradas de la sección de novedades
├── js/
│   ├── hub.js                     # Fondo animado y atajos 1–9
│   ├── ads-config.js              # Estado de monetización y ca-pub
│   ├── consent.js                 # Consent Mode v2 + banner
│   └── ads.js                     # Cargador de Auto ads (desactivado por defecto)
├── scripts/
│   └── configure-ads.py           # Rellena dominio, email y ca-pub de una vez
├── games/
│   ├── prisma-asalto/
│   │   ├── index.html
│   │   ├── favicon.svg
│   │   ├── css/styles.css
│   │   └── js/
│   │       ├── main.js            # Entrada, DPR y puente juego ↔ interfaz
│   │       ├── game.js            # Bucle, estados, colisiones y oleadas
│   │       ├── entities.js        # Nave, formación, escudos y partículas
│   │       ├── audio.js           # SFX sintetizados (Web Audio)
│   │       ├── config.js          # Constantes, colores y sprites
│   │       └── utils.js           # Matemáticas, AABB, sprites y storage
│   ├── serpiente-poderes/
│   │   ├── index.html
│   │   ├── css/styles.css         # Estilos extraídos del juego original
│   │   └── js/game.js             # Lógica del juego extraída (IIFE)
│   ├── cazaluces/
│   │   ├── index.html
│   │   ├── favicon.svg
│   │   ├── css/styles.css         # Interfaz de la máquina y overlay
│   │   └── js/
│   │       ├── main.js            # Entrada, controles, HUD y overlay
│   │       ├── game.js            # Estados, IA de sombras, colisiones y puntuación
│   │       ├── maze.js            # Laberinto, luces y puerta de la casa
│   │       ├── render.js          # Dibujo del laberinto, Chispa y sombras
│   │       ├── audio.js           # SFX sintetizados (Web Audio)
│   │       └── config.js          # Mapa, constantes, velocidades y objetivos
│   ├── mosaico-lunar/
│   │   ├── index.html
│   │   ├── favicon.svg
│   │   ├── css/styles.css         # Interfaz de la máquina y overlay
│   │   └── js/
│   │       ├── main.js            # Entrada, controles, HUD y overlay
│   │       ├── game.js            # Pozo, gravedad, reserva, filas y puntuación
│   │       ├── render.js          # Teselas, fantasma, cola y barra de progreso
│   │       ├── audio.js           # SFX sintetizados (Web Audio)
│   │       └── config.js          # Teselas, paleta, medidas y constantes
│   └── bastion-lumen/
│       ├── index.html
│       ├── favicon.svg
│       ├── css/styles.css         # Tablero, HUD, arsenal y panel táctil
│       └── js/
│           ├── main.js            # Entrada, controles, HUD y overlays
│           ├── game.js            # Oleadas, enemigos, torretas, proyectiles y economía
│           ├── render.js          # Circuito curvo, torretas, efectos y rangos
│           ├── audio.js           # SFX sintetizados (Web Audio)
│           ├── config.js          # Mapa, tablas de torres, oleadas y storage
│           └── monetization.js    # Hooks onGameOver() / onRewardAction()
│   ├── 2048/
│   │   ├── index.html
│   │   ├── favicon.svg
│   │   ├── css/styles.css         # Tablero, HUD, pad táctil y overlays
│   │   └── js/
│   │       ├── main.js            # Entrada, controles, HUD y overlays
│   │       ├── game.js            # Fusiones, puntuación, deshacer y game over
│   │       ├── render.js          # Fichas animadas en canvas
│   │       ├── audio.js           # SFX sintetizados (Web Audio)
│   │       └── config.js          # Paleta, tamaño y claves de storage
│   ├── asteroids/
│   │   ├── index.html
│   │   ├── favicon.svg
│   │   ├── css/styles.css         # HUD, escenario, pad táctil y overlays
│   │   └── js/
│   │       ├── main.js            # Entrada, controles, HUD y overlays
│   │       ├── game.js            # Nave, disparos, asteroides, vidas y niveles
│   │       ├── render.js          # Estrellas, nave, asteroides y partículas
│   │       ├── audio.js           # SFX sintetizados (Web Audio)
│   │       └── config.js          # Física, puntuación y claves de storage
│   └── freedoom/
│       ├── phase1/index.html      # Pantalla de Freedoom Phase 1
│       ├── phase2/index.html      # Pantalla de Freedoom Phase 2
│       ├── css/freedoom.css       # Intro, estado y lienzo del motor
│       ├── js/freedoom.js         # Descarga del WAD y arranque de Dwasm
│       ├── engine/                # PrBoom+ WebAssembly (index.js/.wasm/.data)
│       ├── wads/                  # freedoom1.wad.gz y freedoom2.wad.gz (~10-11 MB c/u)
│       ├── portada.jpeg           # Portada de ambas fases y de las tarjetas
│       └── docs/                  # Licencia y créditos de Freedoom
├── Dockerfile                     # nginx:1.27-alpine + validación de config
├── nginx.conf                     # Gzip, caché, CSP estricta y /healthz
├── nginx.ads.conf                 # Variante opt-in con CSP compatible con AdSense
├── docker-compose.yml             # Puerto 8080, healthcheck y read-only
├── Makefile                       # up, down, logs, check…
├── .dockerignore
└── README.md
```

### Sobre `serpiente-poderes`

El juego se conserva tal cual, pero su `<style>` y `<script>` inline se movieron a `games/serpiente-poderes/css/styles.css` y `games/serpiente-poderes/js/game.js`. Así la CSP estricta (`style-src 'self'; script-src 'self'`) sigue activa sin `'unsafe-inline'` y los recursos se pueden cachear. El HTML antiguo en la raíz ahora es una redirección.

### Sobre Freedoom

Los dos IWAD del paquete `freedoom-0.13.0` se sirven desde `games/freedoom/wads/` comprimidos con gzip (~10-11 MB cada uno) y se cargan en el navegador con [Dwasm](https://github.com/GMH-Code/Dwasm), un motor PrBoom+ compilado a WebAssembly. Así ningún asset supera el límite de 25 MiB por archivo de Cloudflare Workers. Cada fase tiene su propia ruta y sección en el hub (`/games/freedoom/phase1/` y `/games/freedoom/phase2/`).

`games/freedoom/js/freedoom.js` descarga el WAD comprimido del mismo origen, lo descomprime en el navegador con `DecompressionStream` (si el servidor ya lo descomprimió, detecta la cabecera y lo usa tal cual), lo escribe en MEMFS con su nombre original y arranca el motor con `-iwad`. No hay CDN, ni scripts inline, ni `eval`: la CSP solo añade `'wasm-unsafe-eval'`, que permite compilar WebAssembly sin habilitar JavaScript dinámico. Los controles táctiles usan `oly.js` cuando el dispositivo es táctil. La portada `games/freedoom/portada.jpeg` se usa tanto en las dos fases como en sus tarjetas del hub.

Las rutas del WAD y del motor son relativas, así que el sitio funciona tanto en la raíz de un dominio como en la subcarpeta de GitHub Pages. `.github/workflows/pages.yml` publica `main` en Pages; solo hay que activar una vez **Settings → Pages → Source: GitHub Actions** en el repositorio.

Freedoom se distribuye bajo licencia BSD; el motor Dwasm es GPL-2.0. Los textos de licencia y créditos están en `games/freedoom/docs/` y `games/freedoom/engine/`.

## Cómo se juega

**Prisma Asalto**

- 55 cristales en 5 filas; aceleran conforme quedan menos y descienden al tocar los bordes.
- 4 escudos destructibles celda a celda, orbe de bonus (50–300 puntos), 3 vidas e invulnerabilidad tras cada impacto.
- Al limpiar una oleada, la siguiente es más rápida y los escudos se reconstruyen.
- Récord persistente en `localStorage`.

**Serpiente de Poderes**

- Manzana roja: +1 de largo y puntos base. Comer en menos de 3 s sube el combo (×2, ×3, ×4) con un sonido más agudo.
- Dorada: 8 s de fiebre (manzanas normales ×2 y 3 manzanas a la vez).
- Azul: 6 s de fantasma, semitransparente; atraviesa el cuerpo y los bordes.
- Morada: 8 s de imán; atrae manzanas y poderes cercanos. Celeste: 7 s de hielo, velocidad ×0,65.
- Verde lima: recorta 3 o 4 bloques de cola sin perder puntos.
- Roja brillante: 5 s de turbo (velocidad ×2 y toda la comida ×3). Negra: bomba temporal que quita 60 puntos y 4 bloques.
- Invertida: controles al revés 4 s; si sobrevives, +120 puntos.
- Temporizada: parpadea y desaparece en 6 s; da hasta 90 puntos según lo rápido que se coma.
- Al chocar con 250 puntos o más se ofrece revivir una vez con fantasma de 3 s (anuncio simulado).
- La velocidad base sube con el marcador; el récord se guarda en `localStorage`.

**Cazaluces**

- Laberinto original de 28×31 con 362 luces y 4 luces de poder.
- **Scatter**: las sombras patrullan su esquina.
- **Chase**: cada una aplica su personalidad.
- **Frightened**: al comer una luz de poder se vuelven vulnerables, invierten su marcha y huyen; se pueden comer en cadena (200 → 400 → 800 → 1600).
- **Eaten**: solo queda el núcleo, que vuelve a la casa a toda velocidad para reaparecer.
- **Brasa** persigue tu casilla y acelera con Cruise Elroy cuando quedan pocas luces.
- **Eco** apunta 4 casillas por delante de tu dirección (con el desvío clásico al mirar arriba).
- **Cierzo** duplica el vector Brasa → punto a 2 casillas delante de Chispa.
- **Musgo** persigue a más de 8 casillas y huye a su esquina cuando se acerca.
- Alternancia scatter/chase con reversión de las sombras, casa con tiempos de salida, vidas, niveles y récord persistente.

**Mosaico Lunar**

- Pozo de 10×20 con siete teselas: Vara, Dado, Cruz, Sierpe, Rayo, Gancho y Esquina.
- Bolsa de siete: cada tesela aparece una vez antes de repetirse; la cola muestra las tres siguientes.
- Pieza fantasma, reserva (`C`, una vez por tesela), giro con ajuste lateral y retardo de anclaje.
- Puntos por fila (100 / 300 / 500 / 800) multiplicados por nivel; 10 filas suben de nivel y aceleran la caída.
- Récord persistente en `localStorage` (`mosaicoLunar:best`).

**Bastión Lumen**

- Circuito curvo en forma de S desde la entrada hasta un núcleo de 100 HP; los enemigos avanzan por puntos suavizados con Catmull-Rom.
- Tres torretas: Básica (60 oro, equilibrada), Ligera (95 oro, cadencia rápida) y Pesada (145 oro, daño en área y ralentización).
- Cada torreta tiene 4 niveles: `Mejorar` sube daño, cadencia y alcance; `Vender` devuelve el 65 % de todo lo invertido.
- Oleadas progresivas: más enemigos, más vida y más velocidad; jefe cada 5 oleadas y victoria al superar la oleada 10 (con opción de seguir en modo infinito).
- Botón **Iniciar oleada** + cuenta automática de 6 s; botón de velocidad **1x / 2x** y pausa con `P`.
- HUD con Oro, Núcleo, Oleada y Mejor oleada (`bastionLumen:bestWave`); mute persistente en `bastionLumen:muted`.
- Hasta 2 recompensas simuladas por partida (+100 oro o reparar +30 HP) pasando siempre por `onRewardAction(type)`.
- Pantalla de fin de partida con oleadas superadas, enemigos derrotados y **Reintentar** inmediato; el intersticial futuro se conecta en `onGameOver()`.

**2048**

- Tablero 4×4: dos fichas iguales que se juntan se fusionan y suman su valor; después de cada jugada aparece un 2 (90 %) o un 4 (10 %).
- `Z` deshace la última jugada, `N` empieza de cero y `P` pausa. La partida también se pausa al cambiar de pestaña.
- Se puede seguir jugando después de alcanzar 2048. La partida termina solo cuando no quedan movimientos.
- Récord persistente en `localStorage` (`dosMil48:best`) y mute en `dosMil48:muted`.
- Recompensas simuladas: recuperar la última jugada (continuar) o añadir una ficha 4.

**Asteroids**

- La nave gira, empuja con inercia y dispara; los asteroides grandes se parten en dos medianos y estos en dos pequeños (20 / 50 / 100 puntos).
- Cada nivel añade asteroides y los bordes son envolventes. Tres vidas, 2 s de invulnerabilidad al reaparecer y escudo de 8 s como recompensa.
- `Mayús` manda la nave a un punto aleatorio del campo con 1,2 s de invulnerabilidad; `R` reinicia y `P` pausa.
- Récord persistente en `localStorage` (`asteroides:best`) y mute en `asteroides:muted`.
- Recompensa simulada al perder: reanudar con una nave y escudo inicial.

## Desarrollo sin Docker

Cualquier servidor estático funciona, pero **debe** servirse por HTTP porque hay módulos ES; abrir los HTML con `file://` no es válido.

```bash
python3 -m http.server 8080
```

Abre `http://localhost:8080/`. En Prisma Asalto puedes usar `?debug` para exponer `window.__game` en la consola:

```
http://localhost:8080/games/prisma-asalto/?debug
```

En Cazaluces, `?debug` expone `window.__cazaluces` para inspeccionar estados, objetivos y tiempos desde la consola.

En Mosaico Lunar, `?debug` expone `window.__mosaico` para revisar el pozo, la cola y la pieza activa desde la consola.

En Bastión Lumen, `?debug` expone `window.__bastion` (partida, torretas, enemigos y proyectiles) y `window.__bastionTowers` (orden del arsenal):

```
http://localhost:8080/games/bastion-lumen/?debug
```

En 2048, `?debug` expone `window.__dosMil48` (tablero, puntuación y fase). En
Asteroids expone `window.__asteroides` (nave, asteroides, vidas y nivel).

## Personalización

- Hub: `index.html`, `css/hub.css` y `js/hub.js`.
- Prisma Asalto: dificultad y sprites en `games/prisma-asalto/js/config.js`; estilo en `games/prisma-asalto/css/styles.css`.
- Serpiente: constantes (`COLS`, `ROWS`, `BOOST_MS`, puntos…) al inicio de `games/serpiente-poderes/js/game.js`; estilo en su `css/styles.css`.
- Cazaluces: mapa y objetivos de dispersión en `games/cazaluces/js/config.js`; IA, estados y velocidades en `games/cazaluces/js/game.js`; estilo en `games/cazaluces/css/styles.css`.
- Mosaico Lunar: teselas, paleta y puntuación en `games/mosaico-lunar/js/config.js`; gravedad y reglas en `games/mosaico-lunar/js/game.js`; estilo en `games/mosaico-lunar/css/styles.css`.
- Bastión Lumen: circuito, celdas, torretas y oleadas en `games/bastion-lumen/js/config.js`; economía y combate en `games/bastion-lumen/js/game.js`; puntos de anuncios en `games/bastion-lumen/js/monetization.js`; estilo en `games/bastion-lumen/css/styles.css`.
- 2048: paleta, tamaño y storage en `games/2048/js/config.js`; reglas de fusión en `games/2048/js/game.js`; estilo en `games/2048/css/styles.css`.
- Asteroids: física, puntuación y storage en `games/asteroids/js/config.js`; colisiones y oleadas en `games/asteroids/js/game.js`; estilo en `games/asteroids/css/styles.css`.
- Puerto publicado: `APP_PORT` o `ports` en `docker-compose.yml`.

Tras cambiar archivos estáticos en la imagen:

```bash
docker compose up -d --build
```

## Notas de producción

- Nginx sirve con gzip y `no-cache` (revalidación con ETag) para HTML y para
  `css/js/svg`. Los archivos no llevan hash en el nombre, así que una caché larga
  serviría JS antiguo después de un despliegue y rompería los juegos.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` y CSP restrictiva (`'self'`, sin inline) en `nginx.conf`. Si se publica con anuncios, se usa `nginx.ads.conf` (ver sección de AdSense).
- El contenedor corre con sistema de archivos de solo lectura y `no-new-privileges`; solo `/var/cache/nginx`, `/var/run` y `/tmp` son escribibles (tmpfs).
- `HEALTHCHECK` consulta `/healthz`.
- Recursos 100 % locales: sin CDN, sin fuentes externas, funciona offline tras el primer arranque.

`novedades.html` recoge los cambios recientes (2048 y Asteroids, Freedoom,
poderes de Serpiente, riel lateral de controles y récord visible en el salón)
con entradas breves y enlaces al resto del sitio.

## Monetización con Google AdSense (preparada, desactivada)

El repositorio ya incluye todo lo que AdSense necesita para revisar el sitio:
páginas legales, banner de consentimiento, `ads.txt`, `robots.txt`, `sitemap.xml`,
enlaces canónicos y un `nginx.ads.conf` con la CSP compatible con Google.

**Estado actual:** `window.PLAYKORA_ADS.enabled` es `false` y el publicador es un
marcador (`ca-pub-0000000000000000`). No se pide ningún anuncio en local.

Los siete juegos ligeros comparten los dos puntos centralizados para conectar la
monetización, en `js/monetization.js`: `onGameOver()` (intersticial al perder,
sin bloquear el resumen) y `onRewardAction(type)` (puerta del anuncio
recompensado; la recompensa solo se entrega si devuelve `true`). La capa visual
común está en `js/rewards-ui.js` y `css/rewards.css`. Ahora mismo todo es
simulado: no se carga ningún SDK ni se pide publicidad.

Cada partida ofrece como máximo **2 vidas extra** y **1 recompensa adicional**
mediante anuncios recompensados opcionales. El límite lo aplica `RewardManager`,
independientemente del juego.

### Recompensas por juego

Las siete máquinas ligeras muestran un espacio publicitario señalizado y una barra con
los botones **Vida extra (anuncio)** (2 usos por partida) y un segundo botón de
recompensa (1 uso). En Prisma Asalto, Serpiente, Cazaluces y Mosaico Lunar el
botón de vida también aparece en la pantalla de fin de partida; en Bastión Lumen
la "vida extra" repara el núcleo durante la partida. En 2048 recupera la última
jugada y en Asteroids reanuda con una nave y escudo.

| Juego | Vida extra (máx. 2) | Recompensa adicional (1) |
| --- | --- | --- |
| Prisma Asalto | Revivir con 1 vida al perder | Escudo de cristal 8 s y limpia balas |
| Serpiente de Poderes | Revivir 1 vez con Fantasma 3 s (desde 250 puntos) | Fantasma 3 s durante la partida |
| Cazaluces | Revivir con 1 vida | Asustar sombras |
| Mosaico Lunar | Limpiar 3 filas superiores y reanudar | Tesela Vara al frente de la cola |
| Bastión Lumen | Reparar núcleo +30 HP | +100 oro |
| 2048 | Recuperar la última jugada | Ficha 4 extra |
| Asteroids | Reanudar con 1 nave y escudo | Escudo 8 s |

El espacio, los botones y el modal del anuncio simulado están en
`css/rewards.css` y `js/rewards-ui.js`. El efecto solo se entrega si
`onRewardAction(type)` devuelve `true`, y el uso se descuenta una sola vez por
recompensa. No se carga ningún SDK ni se solicita publicidad real mientras la
configuración siga desactivada.

### Diseño de pantalla

`css/playfield.css` reparte cada juego en tres zonas visibles sin desplazamiento:
anuncio a la izquierda, tablero en el centro y controles más recompensas a la
derecha. En teléfono el anuncio pasa a una franja superior y los controles a un
riel lateral estrecho; los botones se reducen de tamaño y el tablero se encoge lo
necesario para que nada quede encimado. Este riel se aplica a Cazaluces,
Serpiente de Poderes, Prisma Asalto y Bastión Lumen (`--pk-side-rail: 104px`,
`124px` en Bastión). Mosaico Lunar, 2048 y Asteroids conservan los controles
abajo. Los enlaces legales quedan fijos en el borde inferior.

La portada (`index.html`) muestra cuatro espacios publicitarios simulados fijos en
las esquinas, estilizados en `css/hub.css` con las clases `.hub-ads` y `.hub-ad`.
Permanecen visibles al desplazarse, no interceptan clics y siguen apagados mientras
`js/ads-config.js` mantenga `enabled: false`: no cargan SDK ni solicitan anuncios.

### 1. Datos que hay que aportar

- Dominio definitivo (por ejemplo `tu-dominio.com`; evitar subdominios
  gratuitos). No se ha proporcionado todavía y sigue como `{{DOMINIO}}`.
- ID de publicador de AdSense: `ca-pub-XXXXXXXXXXXXXXXX`.
- El correo público ya configurado es `playkoraarc@gmail.com`.

Los datos de contacto públicos ya están rellenados en las páginas legales:
Estado de Mexico, Mexico y playkoraarc@gmail.com. **No se publica ningún
identificador fiscal ni el nombre del titular.**

La documentación legal está adaptada a **México**: Ley Federal de Protección de
Datos Personales en Posesión de los Particulares (LFPDPPP) y derechos **ARCO**.
La autoridad de protección de datos es la Unidad de Protección de Datos
Personales de la Secretaría Anticorrupción y Buen Gobierno (el INAI se extinguió
en marzo de 2025); Transparencia para el Pueblo atiende lo relativo a
transparencia y acceso a la información.

### 2. Rellenar los marcadores

```bash
python3 scripts/configure-ads.py \
  --domain tu-dominio.com \
  --email playkoraarc@gmail.com \
  --pub-id ca-pub-1234567890123456 \
  --enable
```

El script actualiza `ads.txt`, `robots.txt`, `sitemap.xml`, las siete páginas
informativas y `js/ads-config.js`. Vuelve a ejecutarlo sin `--enable` si quieres
dejar los anuncios apagados.

### 3. Publicar con la configuración de anuncios

```bash
cp nginx.ads.conf nginx.conf
docker compose up -d --build
make check
curl -fsS https://TU_DOMINIO/ads.txt
```

`nginx.ads.conf` relaja la CSP: añade `'unsafe-inline'` y dominios de Google,
cambia COOP a `same-origin-allow-popups` y sirve `ads.txt` como texto plano.
Es necesario para que los anuncios carguen, pero **reduce la protección XSS**
frente a la CSP estricta de `nginx.conf`. Úsalo solo en el dominio público.
Termina TLS con certbot o un proxy inverso antes de enviar a revisión.

### 4. Enviar a revisión

1. Crea la cuenta de AdSense con el dominio ya publicado.
2. En "Sitios", añade el dominio y solicita la revisión.
3. Verifica que `/ads.txt`, `/privacidad.html`, `/cookies.html` y `/sitemap.xml`
   respondan 200 y que no queden marcadores `{{DOMINIO}}`.
4. **No hagas clic en tus propios anuncios** durante la prueba.
5. Si Google rechaza por "contenido insuficiente", amplía las descripciones de
   los juegos o añade más páginas antes de reaplicar.

El banner usa **Google Consent Mode v2**: por defecto todo está en `denied`, y
solo tras la elección del usuario se envían `ad_storage`, `ad_user_data` y
`ad_personalization`. El enlace «Configurar cookies» del pie permite cambiar la
decisión en cualquier momento. Como no se usa Analytics, no se carga `gtag.js`;
AdSense lee las señales del `dataLayer`. Si más adelante añades Google Analytics,
carga `gtag.js` con tu ID de medida después de `consent.js`.
