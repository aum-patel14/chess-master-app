import { useState, useEffect } from 'react';
import { X, Cpu, Star, Flame, Trophy, Award, Zap } from 'lucide-react';
import './PlayAIModal.css';

export default function PlayAIModal({ show, onClose, onStart }) {
  // Read saved preference or default to 3
  const [difficulty, setDifficulty] = useState(() => {
    return parseInt(localStorage.getItem('chess_difficulty')) || 3;
  });
  const [color, setColor] = useState('w');

  const TIME_CONTROLS = {
    bullet:    { base: 60,    increment: 0,  label: '1+0' },
    blitz:     { base: 180,   increment: 2,  label: '3+2' },
    rapid:     { base: 600,   increment: 0,  label: '10+0' },
    classical: { base: 1800,  increment: 0,  label: '30+0' },
  };

  const DIFFICULTY = {
    1: { skill: 0,  depth: 1,  movetime: 100,  label: 'Beginner', elo: '~600' },
    2: { skill: 5,  depth: 3,  movetime: 300,  label: 'Easy',     elo: '~800' },
    3: { skill: 10, depth: 8,  movetime: 1000, label: 'Medium',   elo: '~1200' },
    4: { skill: 15, depth: 15, movetime: 2000, label: 'Hard',     elo: '~1600' },
    5: { skill: 20, depth: 20, movetime: 3000, label: 'Master',   elo: '~2000' },
  };

  const [timeControl, setTimeControl] = useState('rapid');

  // Save selection on change
  useEffect(() => {
    localStorage.setItem('chess_difficulty', difficulty);
  }, [difficulty]);

  if (!show) return null;

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal-card">
        <button className="ai-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        
        <div className="ai-modal-header">
          <div className="ai-logo-container">
            <Award size={36} className="ai-gold-logo" />
          </div>
          <h2 className="ai-modal-title font-cinzel">CHOOSE AI DIFFICULTY</h2>
          <p className="ai-modal-subtitle">Configure your virtual match settings</p>
        </div>

        {/* 5 Cards Row */}
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'center',padding:'20px'}}>
          {Object.entries(DIFFICULTY).map(([lvl, cfg]) => (
            <div key={lvl} onClick={()=>setDifficulty(Number(lvl))}
              style={{
                width:'120px', padding:'16px 12px', borderRadius:'12px', cursor:'pointer', textAlign:'center',
                border: difficulty===Number(lvl) ? '2px solid #e2b04a' : '1px solid rgba(255,255,255,0.15)',
                background: difficulty===Number(lvl) ? 'rgba(226,176,74,0.1)' : 'rgba(255,255,255,0.05)',
                transition:'all .15s'
              }}>
              <div style={{fontSize:'24px',marginBottom:'8px'}}>{'⭐'.repeat(Number(lvl))}</div>
              <div style={{fontSize:'14px',fontWeight:'600',color:'white'}}>{cfg.label}</div>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginTop:'4px'}}>{cfg.elo} Elo</div>
            </div>
          ))}
        </div>

        {/* Color Choice Section */}
        <div className="ai-color-selection">
          <h4 className="color-section-title font-cinzel">PLAY AS</h4>
          <div className="color-buttons-row">
            <button 
              className={`color-choice-btn white ${color === 'w' ? 'selected' : ''}`}
              onClick={() => setColor('w')}
            >
              <div className="piece-icon-circle white-piece">♙</div>
              <span>White</span>
            </button>
            <button 
              className={`color-choice-btn random ${color === 'r' ? 'selected' : ''}`}
              onClick={() => setColor('r')}
            >
              <div className="piece-icon-circle random-piece">♟</div>
              <span>Random</span>
            </button>
            <button 
              className={`color-choice-btn black ${color === 'b' ? 'selected' : ''}`}
              onClick={() => setColor('b')}
            >
              <div className="piece-icon-circle black-piece">♟</div>
              <span>Black</span>
            </button>
          </div>
        </div>

        {/* Time Control Section */}
        <div className="ai-color-selection" style={{ marginTop: '16px' }}>
          <h4 className="color-section-title font-cinzel" style={{ marginBottom: '12px' }}>TIME CONTROL</h4>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'center'}}>
            {Object.entries(TIME_CONTROLS).map(([key,tc])=>(
              <button key={key} onClick={()=>setTimeControl(key)}
                style={{padding:'8px 16px',borderRadius:'8px',border:timeControl===key?'2px solid #e2b04a':'1px solid rgba(255,255,255,0.2)',background:timeControl===key?'rgba(226,176,74,0.1)':'transparent',color:'white',cursor:'pointer',fontWeight:timeControl===key?'600':'400',transition:'all 0.15s'}}>
                <div style={{fontSize:'14px'}}>{tc.label}</div>
                <div style={{fontSize:'11px',opacity:0.6,textTransform:'capitalize'}}>{key}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Play Button */}
        <button 
          className="ai-play-submit-btn font-cinzel"
          style={{ marginTop: '24px' }}
          onClick={() => onStart({ difficulty, color, timeControl: TIME_CONTROLS[timeControl] })}
        >
          PLAY GAME
        </button>
      </div>
    </div>
  );
}
