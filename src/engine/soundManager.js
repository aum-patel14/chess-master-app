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
    
    const t = this.ctx.currentTime;
    
    // Thud component (low frequency)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);
    
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.8 * this.volume, t + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);

    // Clack component (noise burst)
    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter noise to sound like wood
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  playCapture() {
    if (!this.enabled) return;
    this.init(); this.resume();
    
    const t = this.ctx.currentTime;
    
    // Aggressive thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square'; // harsher
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
    
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.6 * this.volume, t + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    // Lowpass filter for the square wave
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    
    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    // Crunch component (longer noise burst)
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 800;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
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
