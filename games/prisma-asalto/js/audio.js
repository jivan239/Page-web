import { STORAGE } from './config.js';
import { readNumber, writeNumber } from './utils.js';

const MASTER_VOLUME = 0.22;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = readNumber(STORAGE.muted, 0) === 1;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    }
    writeNumber(STORAGE.muted, this.muted ? 1 : 0);
  }

  tone({ from, to, duration = 0.12, type = 'square', volume = 0.4, delay = 0 }) {
    if (this.muted || !this.ctx || !this.master) return;

    const start = this.ctx.currentTime + delay;
    const end = start + duration;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), start);
    if (to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(end + 0.03);
  }

  noise(duration = 0.2, volume = 0.3, cutoff = 1400) {
    if (this.muted || !this.ctx || !this.master) return;

    const rate = this.ctx.sampleRate;
    const frames = Math.max(1, Math.floor(rate * duration));
    const buffer = this.ctx.createBuffer(1, frames, rate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  shoot() {
    this.tone({ from: 900, to: 320, duration: 0.09, type: 'square', volume: 0.22 });
  }

  enemyShoot() {
    this.tone({ from: 430, to: 170, duration: 0.16, type: 'sawtooth', volume: 0.12 });
  }

  invaderHit() {
    this.noise(0.12, 0.2, 1800);
    this.tone({ from: 320, to: 120, duration: 0.1, type: 'triangle', volume: 0.2 });
  }

  barrierHit() {
    this.noise(0.07, 0.12, 900);
  }

  playerHit() {
    this.noise(0.45, 0.42, 900);
    this.tone({ from: 180, to: 40, duration: 0.5, type: 'sawtooth', volume: 0.32 });
  }

  march(step) {
    const notes = [148, 124, 138, 110];
    this.tone({ from: notes[step % 4], duration: 0.06, type: 'square', volume: 0.11 });
  }

  ufoAppear() {
    this.tone({ from: 520, to: 860, duration: 0.5, type: 'triangle', volume: 0.09 });
  }

  ufoHit() {
    this.tone({ from: 1200, to: 260, duration: 0.3, type: 'square', volume: 0.2 });
    this.noise(0.2, 0.18, 2200);
  }

  levelUp() {
    [660, 880, 1320].forEach((freq, i) => {
      this.tone({ from: freq, duration: 0.16, type: 'square', volume: 0.16, delay: i * 0.12 });
    });
  }

  gameOver() {
    [440, 330, 220, 110].forEach((freq, i) => {
      this.tone({ from: freq, duration: 0.28, type: 'sawtooth', volume: 0.2, delay: i * 0.18 });
    });
  }
}
