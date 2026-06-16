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

  _getTheme() {
    return typeof localStorage !== 'undefined' ? (localStorage.getItem('chess_sound_theme') || 'wood') : 'wood';
  }

  playMove() {
    if (!this.enabled) return;
    const theme = this._getTheme();
    if (theme === 'silent') return;
    this.init(); this.resume();
    
    const t = this.ctx.currentTime;
    
    if (theme === 'digital') {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(0.2);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
      gain.gain.setValueAtTime(0.2 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.05);
      return;
    }
    
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
    const theme = this._getTheme();
    if (theme === 'silent') return;
    this.init(); this.resume();
    
    const t = this.ctx.currentTime;
    
    if (theme === 'digital') {
      const osc1 = this.ctx.createOscillator();
      const gain1 = this._gain(0.2);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, t);
      osc1.frequency.exponentialRampToValueAtTime(400, t + 0.08);
      gain1.gain.setValueAtTime(0.2 * this.volume, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc1.connect(gain1);
      osc1.start(t);
      osc1.stop(t + 0.08);
      
      const osc2 = this.ctx.createOscillator();
      const gain2 = this._gain(0.15);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1000, t + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(500, t + 0.09);
      gain2.gain.setValueAtTime(0.15 * this.volume, t + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc2.connect(gain2);
      osc2.start(t + 0.02);
      osc2.stop(t + 0.09);
      return;
    }
    
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
    const theme = this._getTheme();
    if (theme === 'silent') return;
    this.init(); this.resume();
    
    if (theme === 'digital') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this._gain(0.12);
        osc.type = 'sine';
        const t = this.ctx.currentTime + i * 0.04;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.12 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + 0.18);
      });
      return;
    }
    
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
    const theme = this._getTheme();
    if (theme === 'silent') return;
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
    const theme = this._getTheme();
    if (theme === 'silent') return;
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
    const theme = this._getTheme();
    if (theme === 'silent') return;
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

  playSuccess() {
    if (!this.enabled) return;
    const theme = this._getTheme();
    if (theme === 'silent') return;
    this.init(); this.resume();
    
    const melody = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const tStart = this.ctx.currentTime;
    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(0.1);
      const t = tStart + i * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playError() {
    if (!this.enabled) return;
    const theme = this._getTheme();
    if (theme === 'silent') return;
    this.init(); this.resume();
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this._gain(0.15);
    const gain2 = this._gain(0.15);
    const t = this.ctx.currentTime;
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, t);
    gain1.gain.setValueAtTime(0.15 * this.volume, t);
    gain1.gain.linearRampToValueAtTime(0.15 * this.volume, t + 0.2);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc1.connect(gain1);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(123, t);
    gain2.gain.setValueAtTime(0.15 * this.volume, t);
    gain2.gain.linearRampToValueAtTime(0.15 * this.volume, t + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc2.connect(gain2);
    
    osc1.start(t);
    osc1.stop(t + 0.28);
    osc2.start(t);
    osc2.stop(t + 0.28);
  }

  playBrilliant() {
    if (!this.enabled) return;
    const theme = this._getTheme();
    if (theme === 'silent') return;
    this.init(); this.resume();
    
    const tStart = this.ctx.currentTime;
    const freqs = [880, 1046.5, 1318.5, 1568, 2093]; // A5, C6, E6, G6, C7
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this._gain(0.08);
      const t = tStart + i * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      
      // Pitch modulation vibrato
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.value = 15;
      vibratoGain.gain.value = 10;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0.08 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      
      vibrato.start(t);
      osc.start(t);
      vibrato.stop(t + 0.3);
      osc.stop(t + 0.3);
    });
  }
}

export const soundManager = new SoundManager();
