import { useState, useEffect } from 'react';
import { X, Award } from 'lucide-react';
import { DifficultySelector } from '../DifficultySelector';
import { useGame } from '../../context/GameContext';
import './PlayAIModal.css';

export default function PlayAIModal({ show, onClose, onStart }) {
  const { isPremium, setShowUpgradeModal } = useGame();
  const [difficulty, setDifficulty] = useState(() => {
    return parseInt(localStorage.getItem('chess_difficulty'), 10) || 3;
  });
  const [color, setColor] = useState('w');

  const TIME_CONTROLS = {
    bullet: { base: 60, increment: 0, label: '1+0' },
    blitz: { base: 180, increment: 2, label: '3+2' },
    rapid: { base: 600, increment: 0, label: '10+0' },
    classical: { base: 1800, increment: 0, label: '30+0' },
  };

  const [timeControl, setTimeControl] = useState('rapid');

  useEffect(() => {
    localStorage.setItem('chess_difficulty', String(difficulty));
  }, [difficulty]);

  const handleDifficultyChange = (level) => {
    if (!isPremium && level >= 4) {
      setShowUpgradeModal(true);
      return;
    }
    setDifficulty(level);
  };

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

        <DifficultySelector
          value={difficulty}
          onChange={handleDifficultyChange}
          isPremium={isPremium}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        <div className="ai-color-selection">
          <h4 className="color-section-title font-cinzel">PLAY AS</h4>
          <div className="color-buttons-row">
            <button
              type="button"
              className={`color-choice-btn white ${color === 'w' ? 'selected' : ''}`}
              onClick={() => setColor('w')}
            >
              <div className="piece-icon-circle white-piece">♙</div>
              <span>White</span>
            </button>
            <button
              type="button"
              className={`color-choice-btn random ${color === 'r' ? 'selected' : ''}`}
              onClick={() => setColor('r')}
            >
              <div className="piece-icon-circle random-piece">♟</div>
              <span>Random</span>
            </button>
            <button
              type="button"
              className={`color-choice-btn black ${color === 'b' ? 'selected' : ''}`}
              onClick={() => setColor('b')}
            >
              <div className="piece-icon-circle black-piece">♟</div>
              <span>Black</span>
            </button>
          </div>
        </div>

        <div className="ai-color-selection" style={{ marginTop: '16px' }}>
          <h4 className="color-section-title font-cinzel" style={{ marginBottom: '12px' }}>
            TIME CONTROL
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(TIME_CONTROLS).map(([key, tc]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTimeControl(key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border:
                    timeControl === key
                      ? '2px solid #e2b04a'
                      : '1px solid rgba(255,255,255,0.2)',
                  background:
                    timeControl === key ? 'rgba(226,176,74,0.1)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: timeControl === key ? '600' : '400',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '14px' }}>{tc.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'capitalize' }}>
                  {key}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ai-play-submit-btn font-cinzel"
          style={{ marginTop: '24px' }}
          onClick={() =>
            onStart({ difficulty, color, timeControl: TIME_CONTROLS[timeControl] })
          }
        >
          PLAY GAME
        </button>
      </div>
    </div>
  );
}
