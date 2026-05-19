import { useState } from 'react';
import { X, Cpu } from 'lucide-react';

export default function PlayAIModal({ show, onClose, onStart }) {
  const [difficulty, setDifficulty] = useState(3);
  const [color, setColor] = useState('w');

  const AI_LEVELS = [
    { level: 1, label: "Beginner", elo: 600, depth: 1, description: "Makes random moves" },
    { level: 2, label: "Casual", elo: 1000, depth: 3, description: "Avoids obvious blunders" },
    { level: 3, label: "Club", elo: 1400, depth: 6, description: "Plays solid openings" },
    { level: 4, label: "Advanced", elo: 1800, depth: 10, description: "Finds tactical threats" },
    { level: 5, label: "Master", elo: 2800, depth: 20, description: "Near-perfect play" }
  ];

  if (!show) return null;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div className="icon-btn-wrapper" style={{ position: 'absolute', top: '8px', right: '8px' }}>
          <button className="small-icon-btn" onClick={onClose} style={closeBtnStyle}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <Cpu size={36} color="var(--gold)" />
          </div>
          <h2 style={{ fontFamily: '"Cinzel", serif', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>Play AI</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>Select your opponent's level</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Difficulty</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {AI_LEVELS.map((ai) => (
              <button 
                key={ai.level}
                style={{
                  ...levelBtnStyle,
                  background: difficulty === ai.level ? 'var(--gold)' : 'var(--bg-input)',
                  color: difficulty === ai.level ? '#fff' : 'var(--text-primary)',
                  borderColor: difficulty === ai.level ? 'var(--gold)' : 'var(--border)'
                }}
                onClick={() => setDifficulty(ai.level)}
              >
                {ai.level}
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '12px', minHeight: '40px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
              {AI_LEVELS[difficulty - 1].label} ({AI_LEVELS[difficulty - 1].elo} ELO)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {AI_LEVELS[difficulty - 1].description}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={labelStyle}>Play as</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{ ...colorBtnStyle, borderColor: color === 'w' ? 'var(--gold)' : 'var(--border)' }}
              onClick={() => setColor('w')}
            >
              <div style={{ ...pieceStyle, background: '#fff', color: '#000' }}>♙</div>
              <span>White</span>
            </button>
            <button 
              style={{ ...colorBtnStyle, borderColor: color === 'r' ? 'var(--gold)' : 'var(--border)' }}
              onClick={() => setColor('r')}
            >
              <div style={{ ...pieceStyle, background: 'linear-gradient(135deg, #fff 50%, #1a1a1a 50%)', border: '1px solid #444' }}>♟</div>
              <span>Random</span>
            </button>
            <button 
              style={{ ...colorBtnStyle, borderColor: color === 'b' ? 'var(--gold)' : 'var(--border)' }}
              onClick={() => setColor('b')}
            >
              <div style={{ ...pieceStyle, background: '#1a1a1a', color: '#fff', border: '1px solid #444' }}>♟</div>
              <span>Black</span>
            </button>
          </div>
        </div>

        <button 
          style={btnPrimaryStyle}
          onClick={() => onStart({ difficulty, color })}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.85)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(4px)'
};

const cardStyle = {
  background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
  borderRadius: '12px', padding: '32px', width: '420px', maxWidth: 'calc(100vw - 32px)',
  position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
};

const closeBtnStyle = {
  width: '28px', height: '28px', borderRadius: '50%',
  background: 'var(--bg-hover)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center'
};

const levelBtnStyle = {
  flex: 1, minHeight: '44px', borderRadius: '6px', border: '1px solid',
  fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
};

const colorBtnStyle = {
  flex: 1, height: '80px', borderRadius: '8px', border: '2px solid',
  background: 'var(--bg-input)', color: 'var(--text-primary)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
  cursor: 'pointer', transition: 'border-color 0.15s'
};

const pieceStyle = {
  width: '32px', height: '32px', borderRadius: '4px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
};

const btnPrimaryStyle = {
  width: '100%', height: '48px',
  background: 'var(--gold)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: '16px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s'
};
