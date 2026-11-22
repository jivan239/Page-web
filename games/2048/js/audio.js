/* Efectos sintetizados con Web Audio. Sin archivos externos. */

export class Sound {
  constructor(storageKey) {
    this.key = storageKey;
    this.ctx = null;
    try {
      this.muted = window.localStorage.getItem(this.key) === '1';
    } catch {
      this.muted = false;
    }
  }

  ensure() {
    if (this.ctx || this.muted) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  tone(freq, duration, type = 'sine', volume = 0.05, endFreq = freq) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  play(name) {
    if (this.muted) return;
    this.ensure();
    this.resume();
    switch (name) {
      case 'start':
        this.tone(330, 0.10, 'triangle', 0.04, 520);
        break;
      case 'move':
        this.tone(220, 0.05, 'sine', 0.025, 260);
        break;
      case 'merge':
        this.tone(420, 0.09, 'triangle', 0.045, 680);
        break;
      case 'bonus':
        this.tone(520, 0.14, 'sine', 0.05, 900);
        break;
      case 'over':
        this.tone(260, 0.22, 'sawtooth', 0.035, 90);
        break;
      default:
        break;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem(this.key, this.muted ? '1' : '0');
    } catch {
      /* modo privado */
    }
    return this.muted;
  }
}
