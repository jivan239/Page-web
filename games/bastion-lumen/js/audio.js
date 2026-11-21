import { STORAGE } from './config.js';

/* Efectos generados con Web Audio API: ningún archivo de audio externo. */
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.last = Object.create(null);
    try {
      this.muted = localStorage.getItem(STORAGE.muted) === '1';
    } catch (error) {
      this.muted = false;
    }
  }

  ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone({ freq, endFreq = freq, dur = 0.1, type = 'square', gain = 0.05, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + dur);
    }

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(amp);
    amp.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  chord(notes, step, options = {}) {
    notes.forEach((freq, index) => {
      this.tone({ freq, type: 'triangle', gain: 0.045, dur: 0.14, delay: index * step, ...options });
    });
  }

  play(name) {
    if (this.muted) return;

    /* Evita saturar el audio cuando muchas torretas disparan a la vez. */
    const now = performance.now();
    const cooldown = name.startsWith('shoot_') ? 70 : name === 'hit' || name === 'coin' ? 55 : 0;
    if (cooldown) {
      if (now - (this.last[name] || 0) < cooldown) return;
      this.last[name] = now;
    }

    switch (name) {
      case 'start':
        this.chord([330, 440, 550], 0.07, { gain: 0.04 });
        break;
      case 'build':
        this.tone({ freq: 300, endFreq: 520, dur: 0.1, type: 'triangle', gain: 0.06 });
        break;
      case 'deny':
        this.tone({ freq: 180, endFreq: 110, dur: 0.12, type: 'square', gain: 0.035 });
        break;
      case 'shoot_basic':
        this.tone({ freq: 620, endFreq: 380, dur: 0.055, type: 'square', gain: 0.028 });
        break;
      case 'shoot_rapid':
        this.tone({ freq: 880, endFreq: 640, dur: 0.035, type: 'triangle', gain: 0.022 });
        break;
      case 'shoot_heavy':
        this.tone({ freq: 190, endFreq: 80, dur: 0.14, type: 'sawtooth', gain: 0.055 });
        break;
      case 'hit':
        this.tone({ freq: 240, endFreq: 150, dur: 0.045, type: 'triangle', gain: 0.025 });
        break;
      case 'impact':
        this.tone({ freq: 140, endFreq: 55, dur: 0.2, type: 'sawtooth', gain: 0.05 });
        break;
      case 'coin':
        this.tone({ freq: 740, endFreq: 980, dur: 0.06, type: 'sine', gain: 0.028 });
        break;
      case 'upgrade':
        this.chord([523, 659, 880], 0.06, { type: 'square', gain: 0.035 });
        break;
      case 'sell':
        this.tone({ freq: 520, endFreq: 260, dur: 0.1, type: 'triangle', gain: 0.04 });
        break;
      case 'wave':
        this.chord([392, 523, 659], 0.08, { gain: 0.045 });
        break;
      case 'boss':
        this.tone({ freq: 110, endFreq: 70, dur: 0.45, type: 'sawtooth', gain: 0.06 });
        break;
      case 'waveClear':
        this.chord([659, 784, 1046], 0.07, { gain: 0.045 });
        break;
      case 'leak':
        this.tone({ freq: 180, endFreq: 70, dur: 0.22, type: 'square', gain: 0.055 });
        break;
      case 'reward':
        this.chord([523, 784, 1046, 1318], 0.055, { type: 'square', gain: 0.04 });
        break;
      case 'victory':
        [523, 659, 784, 1046, 1318].forEach((freq, index) => {
          this.tone({ freq, dur: 0.28, type: 'triangle', gain: 0.05, delay: index * 0.12 });
        });
        break;
      case 'gameover':
        [440, 330, 262, 165].forEach((freq, index) => {
          this.tone({ freq, endFreq: freq * 0.82, dur: 0.26, type: 'sawtooth', gain: 0.05, delay: index * 0.16 });
        });
        break;
      default:
        break;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE.muted, this.muted ? '1' : '0');
    } catch (error) {
      /* modo privado */
    }
    if (!this.muted) this.ensure();
    return this.muted;
  }
}
