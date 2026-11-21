# Playkora · Docker + Web

Hub arcade con cinco juegos originales jugables en el navegador:

- **Prisma Asalto** — shooter de cristales con oleadas, escudos destructibles y un orbe errante.
- **Serpiente de Poderes** — snake con manzanas que dan turbo, crecimiento y puntos extra.
- **Cazaluces** — laberinto original con Chispa, cuatro sombras, sus cuatro estados y sus personalidades de IA.
- **Mosaico Lunar** — puzzle de teselas que caen, con pieza fantasma, reserva y siete formas propias.
- **Bastión Lumen** — tower defense con circuito curvo, tres torretas, mejoras, jefes cada cinco oleadas y recompensas simuladas.

Todo es estático (HTML5 Canvas + JavaScript, sin dependencias ni compilación) y se sirve con Nginx desde un contenedor Docker.

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

En el hub puedes pulsar `1`, `2`, `3`, `4` o `5` para entrar directamente a cada juego.

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
├── ads.txt                        # Declaración de publicador de AdSense
├── robots.txt                     # Instrucciones para rastreadores
├── sitemap.xml                    # Mapa del sitio
├── favicon.svg                    # Icono del hub
├── css/
│   ├── hub.css                    # Estilos del hub, tarjetas y fondo estelar
│   ├── consent.css                # Banner de cookies y pie legal compartido
│   └── legal.css                  # Estilos de las páginas informativas
├── js/
│   ├── hub.js                     # Fondo animado y atajos 1/2/3/4/5
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

## Cómo se juega

**Prisma Asalto**

- 55 cristales en 5 filas; aceleran conforme quedan menos y descienden al tocar los bordes.
- 4 escudos destructibles celda a celda, orbe de bonus (50–300 puntos), 3 vidas e invulnerabilidad tras cada impacto.
- Al limpiar una oleada, la siguiente es más rápida y los escudos se reconstruyen.
- Récord persistente en `localStorage`.

**Serpiente de Poderes**

- Manzana roja: +1 de largo. Azul: +1 y 5 s de turbo. Dorada: +2 y más puntos.
- La velocidad sube con el marcador; el turbo multiplica el ritmo.
- Récord persistente en `localStorage`.

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

## Personalización

- Hub: `index.html`, `css/hub.css` y `js/hub.js`.
- Prisma Asalto: dificultad y sprites en `games/prisma-asalto/js/config.js`; estilo en `games/prisma-asalto/css/styles.css`.
- Serpiente: constantes (`COLS`, `ROWS`, `BOOST_MS`, puntos…) al inicio de `games/serpiente-poderes/js/game.js`; estilo en su `css/styles.css`.
- Cazaluces: mapa y objetivos de dispersión en `games/cazaluces/js/config.js`; IA, estados y velocidades en `games/cazaluces/js/game.js`; estilo en `games/cazaluces/css/styles.css`.
- Mosaico Lunar: teselas, paleta y puntuación en `games/mosaico-lunar/js/config.js`; gravedad y reglas en `games/mosaico-lunar/js/game.js`; estilo en `games/mosaico-lunar/css/styles.css`.
- Bastión Lumen: circuito, celdas, torretas y oleadas en `games/bastion-lumen/js/config.js`; economía y combate en `games/bastion-lumen/js/game.js`; puntos de anuncios en `games/bastion-lumen/js/monetization.js`; estilo en `games/bastion-lumen/css/styles.css`.
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

## Monetización con Google AdSense (preparada, desactivada)

El repositorio ya incluye todo lo que AdSense necesita para revisar el sitio:
páginas legales, banner de consentimiento, `ads.txt`, `robots.txt`, `sitemap.xml`,
enlaces canónicos y un `nginx.ads.conf` con la CSP compatible con Google.

**Estado actual:** `window.PLAYKORA_ADS.enabled` es `false` y el publicador es un
marcador (`ca-pub-0000000000000000`). No se pide ningún anuncio en local.

Los cinco juegos comparten los dos puntos centralizados para conectar la
monetización, en `js/monetization.js`: `onGameOver()` (intersticial al perder,
sin bloquear el resumen) y `onRewardAction(type)` (puerta del anuncio
recompensado; la recompensa solo se entrega si devuelve `true`). La capa visual
común está en `js/rewards-ui.js` y `css/rewards.css`. Ahora mismo todo es
simulado: no se carga ningún SDK ni se pide publicidad.

Cada partida ofrece como máximo **2 vidas extra** y **1 recompensa adicional**
mediante anuncios recompensados opcionales. El límite lo aplica `RewardManager`,
independientemente del juego.

### Recompensas por juego

Las cinco máquinas muestran un espacio publicitario señalizado y una barra con
los botones **Vida extra (anuncio)** (2 usos por partida) y un segundo botón de
recompensa (1 uso). En Prisma Asalto, Serpiente, Cazaluces y Mosaico Lunar el
botón de vida también aparece en la pantalla de fin de partida; en Bastión Lumen
la "vida extra" repara el núcleo durante la partida.

| Juego | Vida extra (máx. 2) | Recompensa adicional (1) |
| --- | --- | --- |
| Prisma Asalto | Revivir con 1 vida al perder | Escudo de cristal 8 s y limpia balas |
| Serpiente de Poderes | Segunda oportunidad conservando puntos | Turbo de 5 s |
| Cazaluces | Revivir con 1 vida | Asustar sombras |
| Mosaico Lunar | Limpiar 3 filas superiores y reanudar | Tesela Vara al frente de la cola |
| Bastión Lumen | Reparar núcleo +30 HP | +100 oro |

El espacio, los botones y el modal del anuncio simulado están en
`css/rewards.css` y `js/rewards-ui.js`. El efecto solo se entrega si
`onRewardAction(type)` devuelve `true`, y el uso se descuenta una sola vez por
recompensa. No se carga ningún SDK ni se solicita publicidad real mientras la
configuración siga desactivada.

### 1. Datos que hay que aportar

- Dominio definitivo (por ejemplo `tu-dominio.com`; evitar subdominios
  gratuitos). No se ha proporcionado todavía y sigue como `{{DOMINIO}}`.
- ID de publicador de AdSense: `ca-pub-XXXXXXXXXXXXXXXX`.
- El correo público ya configurado es `playkoraarc@gmail.com`.

Los datos del titular ya están rellenados en las páginas legales: Yvan Miguel
Perez de la Rosa, Estado de Mexico, Mexico y playkoraarc@gmail.com. **No se
publica ningún identificador fiscal.**

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

El script actualiza `ads.txt`, `robots.txt`, `sitemap.xml`, las cinco páginas
legales y `js/ads-config.js`. Vuelve a ejecutarlo sin `--enable` si quieres dejar
los anuncios apagados.

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
