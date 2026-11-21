const MUTE_KEY = 'cazalucesMuted';

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.chompFlip = false;
    this.muted = false;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
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
      this.master.gain.value = 0.5;
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

  chomp() {
    this.chompFlip = !this.chompFlip;
    this.tone({
      freq: this.chompFlip ? 330 : 240,
      endFreq: this.chompFlip ? 240 : 180,
      dur: 0.055,
      type: 'square',
      gain: 0.035,
    });
  }

  power() {
    this.tone({ freq: 160, endFreq: 520, dur: 0.28, type: 'sawtooth', gain: 0.05 });
  }

  eatGhost() {
    this.tone({ freq: 420, endFreq: 880, dur: 0.12, type: 'square', gain: 0.06 });
    this.tone({ freq: 660, endFreq: 1320, dur: 0.14, type: 'square', gain: 0.05, delay: 0.1 });
  }

  death() {
    this.tone({ freq: 620, endFreq: 90, dur: 0.85, type: 'sawtooth', gain: 0.07 });
    this.tone({ freq: 300, endFreq: 60, dur: 0.5, type: 'square', gain: 0.04, delay: 0.35 });
  }

  start() {
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, index) => {
      this.tone({ freq, dur: 0.12, type: 'square', gain: 0.045, delay: index * 0.1 });
    });
  }

  levelClear() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, index) => {
      this.tone({ freq, dur: 0.16, type: 'triangle', gain: 0.05, delay: index * 0.12 });
    });
  }

  extraLife() {
    this.tone({ freq: 784, endFreq: 1568, dur: 0.3, type: 'triangle', gain: 0.07 });
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch (error) {
      /* modo privado */
    }
    if (!this.muted) this.ensure();
    return this.muted;
  }
}
