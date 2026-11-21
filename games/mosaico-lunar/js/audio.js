import { STORAGE } from './config.js';

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
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
      this.master.gain.value = 0.4;
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
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(amp);
    amp.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  chord(notes, step, options = {}) {
    notes.forEach((freq, index) => {
      this.tone({ freq, type: 'triangle', gain: 0.05, dur: 0.14, delay: index * step, ...options });
    });
  }

  play(name) {
    switch (name) {
      case 'move':
        this.tone({ freq: 210, dur: 0.03, type: 'square', gain: 0.02 });
        break;
      case 'rotate':
        this.tone({ freq: 330, endFreq: 440, dur: 0.05, type: 'triangle', gain: 0.035 });
        break;
      case 'soft':
        this.tone({ freq: 150, endFreq: 135, dur: 0.03, type: 'square', gain: 0.018 });
        break;
      case 'hard':
        this.tone({ freq: 190, endFreq: 70, dur: 0.09, type: 'sawtooth', gain: 0.045 });
        break;
      case 'lock':
        this.tone({ freq: 120, endFreq: 90, dur: 0.07, type: 'square', gain: 0.03 });
        break;
      case 'hold':
        this.tone({ freq: 480, endFreq: 720, dur: 0.09, type: 'triangle', gain: 0.045 });
        break;
      case 'clear':
        this.chord([523, 659, 784], 0.055);
        break;
      case 'quad':
        this.chord([523, 659, 784, 1046], 0.06, { type: 'square', gain: 0.045 });
        this.tone({ freq: 130, endFreq: 65, dur: 0.28, type: 'sawtooth', gain: 0.05 });
        break;
      case 'level':
        this.chord([659, 880, 1046, 1318], 0.08, { gain: 0.055 });
        break;
      case 'start':
        this.chord([330, 440, 550, 660], 0.07, { gain: 0.04 });
        break;
      case 'gameover':
        [440, 330, 262, 165].forEach((freq, index) => {
          this.tone({ freq, endFreq: freq * 0.82, dur: 0.24, type: 'sawtooth', gain: 0.05, delay: index * 0.16 });
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
