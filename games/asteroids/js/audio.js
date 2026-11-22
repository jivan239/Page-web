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
        this.tone(280, 0.12, 'triangle', 0.04, 520);
        break;
      case 'fire':
        this.tone(760, 0.07, 'square', 0.025, 320);
        break;
      case 'thrust':
        this.tone(110, 0.06, 'sawtooth', 0.018, 150);
        break;
      case 'boom':
        this.tone(180, 0.20, 'sawtooth', 0.045, 60);
        break;
      case 'level':
        this.tone(440, 0.20, 'triangle', 0.045, 880);
        break;
      case 'over':
        this.tone(300, 0.35, 'sawtooth', 0.04, 70);
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
