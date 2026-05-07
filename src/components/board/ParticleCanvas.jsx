import { useEffect, useRef } from 'react';
import './ParticleCanvas.css';

// Particle system for captures and special events
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 3;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.03;
    this.size = 3 + Math.random() * 5;
    this.color = color;
    this.gravity = 0.2;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 15;
    this.shape = Math.random() > 0.5 ? 'circle' : 'square';
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.rotation += this.rotationSpeed;
    this.vx *= 0.98;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }
    ctx.restore();
  }

  isDead() { return this.life <= 0; }
}

class ShockWave {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 60;
    this.life = 1;
    this.color = color;
  }

  update() {
    this.radius += 4;
    this.life = 1 - this.radius / this.maxRadius;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life * 0.6);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 * this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  isDead() { return this.life <= 0; }
}

let particles = [];
let shockWaves = [];
let animFrame = null;

export function triggerCaptureEffect(canvasRef, squareEl, capturedColor) {
  if (!canvasRef.current || !squareEl) return;
  const boardRect = canvasRef.current.getBoundingClientRect();
  const sqRect = squareEl.getBoundingClientRect();
  const cx = sqRect.left + sqRect.width / 2 - boardRect.left;
  const cy = sqRect.top + sqRect.height / 2 - boardRect.top;

  const colors = capturedColor === 'w'
    ? ['#ffffff', '#f0d9b5', '#ffeecc', '#ffe4a0']
    : ['#333333', '#1a1a2e', '#4a3000', '#664400'];

  for (let i = 0; i < 22; i++) {
    particles.push(new Particle(cx, cy, colors[Math.floor(Math.random() * colors.length)]));
  }
  shockWaves.push(new ShockWave(cx, cy, capturedColor === 'w' ? 'rgba(255,220,100,0.8)' : 'rgba(100,80,200,0.8)'));
}

export function triggerMoveEffect(canvasRef, squareEl) {
  if (!canvasRef.current || !squareEl) return;
  const boardRect = canvasRef.current.getBoundingClientRect();
  const sqRect = squareEl.getBoundingClientRect();
  const cx = sqRect.left + sqRect.width / 2 - boardRect.left;
  const cy = sqRect.top + sqRect.height / 2 - boardRect.top;

  const colors = ['rgba(196,160,40,0.9)', 'rgba(240,200,80,0.8)', 'rgba(255,230,120,0.7)'];
  for (let i = 0; i < 8; i++) {
    const p = new Particle(cx, cy, colors[Math.floor(Math.random() * colors.length)]);
    p.size = 2 + Math.random() * 3;
    p.decay = 0.04 + Math.random() * 0.04;
    particles.push(p);
  }
}

export default function ParticleCanvas({ boardRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const syncSize = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    if (boardRef.current) ro.observe(boardRef.current);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter(p => !p.isDead());
      shockWaves = shockWaves.filter(s => !s.isDead());
      particles.forEach(p => { p.update(); p.draw(ctx); });
      shockWaves.forEach(s => { s.update(); s.draw(ctx); });
      animFrame = requestAnimationFrame(loop);
    };
    animFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrame);
      ro.disconnect();
    };
  }, [boardRef]);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

export { ParticleCanvas };
