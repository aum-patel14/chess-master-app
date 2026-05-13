// Sound Manager — synthesized chess sounds using Web Audio API
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.6;

    // Mobile Safari/Android requires a user gesture to unlock the Web Audio API
    const unlockAudio = () => {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _gain(val) {
    const g = this.ctx.createGain();
    g.gain.value = val * this.volume;
    g.connect(this.ctx.destination);
    return g;
  }

  playMove() {
    if (!this.enabled) return;
    this.init(); this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this._gain(0.15);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playCapture() {
    if (!this.enabled) return;
    this.init(); this.resume();
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this._gain(0.3);
    src.connect(gain);
    src.start();
  }

  playCheck() {
    if (!this.enabled) return;
    this.init(); this.resume();
    [440, 520, 660].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(0.12);
      osc.type = 'sawtooth';
      const t = this.ctx.currentTime + i * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  playWin() {
    if (!this.enabled) return;
    this.init(); this.resume();
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(0.15);
      const t = this.ctx.currentTime + i * 0.18;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  playDraw() {
    if (!this.enabled) return;
    this.init(); this.resume();
    [392, 370].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(0.12);
      const t = this.ctx.currentTime + i * 0.25;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  playSelect() {
    if (!this.enabled) return;
    this.init(); this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this._gain(0.08);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
}

export const soundManager = new SoundManager();
