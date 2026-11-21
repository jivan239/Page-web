/* Lanzador de Freedoom para Playkora.
   Descarga el IWAD desde el mismo origen y arranca el motor Dwasm
   (PrBoom+ en WebAssembly) sin scripts inline ni recursos externos. */
(() => {
  'use strict';

  const body = document.body;
  const wadName = body.dataset.wad;
  const wadUrl = body.dataset.wadUrl;
  const engineDir = '../engine/';

  const startBtn = document.getElementById('fd-start');
  const ageBox = document.getElementById('fd-age');
  const statusEl = document.getElementById('fd-status');
  const progressEl = document.getElementById('fd-progress');
  const introEl = document.getElementById('fd-intro');
  const stageEl = document.getElementById('fd-stage');
  const canvas = document.getElementById('canvas');
  const logEl = document.getElementById('fd-log');

  let wadBytes = null;
  let starting = false;

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  function fail(message) {
    setStatus('');
    introEl.hidden = false;
    stageEl.hidden = true;
    startBtn.disabled = false;
    statusEl.textContent = 'No se pudo iniciar: ' + message;
    statusEl.classList.add('is-error');
  }

  async function loadWad() {
    setStatus('Descargando ' + wadName + '…');
    const response = await fetch(wadUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const total = Number(response.headers.get('content-length')) || 0;
    if (!response.body || !response.body.getReader) {
      return new Uint8Array(await response.arrayBuffer());
    }

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total > 0) {
        const pct = Math.min(100, Math.round((received / total) * 100));
        setStatus('Descargando ' + wadName + '… ' + pct + '%');
        progressEl.value = pct;
        progressEl.hidden = false;
      }
    }

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }

  function requestPointerLock() {
    if (document.pointerLockElement === canvas || !document.hasFocus()) return;
    if (typeof canvas.requestPointerLock !== 'function') return;
    try {
      const result = canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // El navegador puede rechazar el bloqueo del puntero; el juego sigue
      // jugable con teclado.
    }
  }

  function setupTouch() {
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
    const script = document.createElement('script');
    script.src = engineDir + 'oly.js';
    script.async = false;
    script.onload = () => {
      if (typeof window.olySetup === 'function') {
        window.olySetup({
          'Escape': { lbl: '&#8801;' },
          'Enter': { lbl: '&#8617;', pos: [15, 0] },
          'ArrowUp': { lbl: '&#8593;', pos: [0, 15] },
          'ArrowDown': { lbl: '&#8595;', pos: [0, 30] },
          'ArrowLeft': { lbl: '&#8592;', pos: [15, 15] },
          'ArrowRight': { lbl: '&#8594;', pos: [15, 30] },
          'Tab': { lbl: '&#8677;', anc: 'R', pos: [30, 0] },
          'KeyW': { lbl: 'W', anc: 'B', pos: [10, 20], shape: 'U' },
          'KeyS': { lbl: 'S', anc: 'B', pos: [10, 0], shape: 'D' },
          'KeyA': { lbl: 'A', anc: 'B', pos: [0, 10], shape: 'L' },
          'KeyD': { lbl: 'D', anc: 'B', pos: [20, 10], shape: 'R' },
          'ControlLeft': { lbl: '&#10753;', anc: 'RB', pos: [0, 10], shape: '' },
          'Space': { lbl: '&#9251;', anc: 'RB', pos: [20, 10], shape: '' },
          'KeyY': { lbl: 'Y', anc: 'R', pos: [0, 15] },
          'KeyN': { lbl: 'N', anc: 'R', pos: [0, 30] }
        }, 3);
      }
    };
    document.body.appendChild(script);
  }

  /* El motor llama a estos hooks; todos son opcionales en Emscripten. */
  window.Module = {
    canvas: canvas,
    locateFile: (path) => engineDir + path,
    print: (text) => console.info('[Freedoom]', text),
    printErr: (text) => console.warn('[Freedoom]', text),
    arguments: ['-iwad', wadName],
    monitorRunDependencies: () => {},
    setStatus: (text) => setStatus(text),
    onRuntimeInitialized: () => {
      if (wadBytes) {
        const stream = FS.open('/' + wadName, 'w');
        FS.write(stream, wadBytes, 0, wadBytes.length, 0);
        FS.close(stream);
      }
      introEl.hidden = true;
      stageEl.hidden = false;
      progressEl.hidden = true;
      setStatus('');
      canvas.focus();
    },
    hideConsole: () => {
      logEl.hidden = true;
      stageEl.hidden = false;
    },
    showConsole: () => {
      logEl.hidden = false;
    },
    captureMouse: requestPointerLock,
    winResized: () => {},
    softExit: () => {
      setStatus('Partida terminada. Pulsa Jugar de nuevo para volver a entrar.');
    }
  };

  ageBox.addEventListener('change', () => {
    startBtn.disabled = !ageBox.checked;
  });

  startBtn.addEventListener('click', async () => {
    if (starting || !ageBox.checked) return;
    starting = true;
    startBtn.disabled = true;
    statusEl.classList.remove('is-error');
    try {
      wadBytes = await loadWad();
      setStatus('Arrancando motor…');
      setupTouch();
      document.addEventListener('keydown', requestPointerLock, { once: true });
      const engine = document.createElement('script');
      engine.src = engineDir + 'index.js';
      engine.async = true;
      engine.onerror = () => fail('no se cargó el motor WebAssembly');
      document.body.appendChild(engine);
    } catch (error) {
      fail(error.message);
    }
  });
})();
