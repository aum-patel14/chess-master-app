import { useState, useEffect } from 'react';
import { X, Cpu, Star, Flame, Trophy, Award, Zap } from 'lucide-react';
import './PlayAIModal.css';

export default function PlayAIModal({ show, onClose, onStart }) {
  // Read saved preference or default to 3
  const [difficulty, setDifficulty] = useState(() => {
    return parseInt(localStorage.getItem('chess_difficulty')) || 3;
  });
  const [color, setColor] = useState('w');

  const AI_LEVELS = [
    { 
      level: 1, 
      label: "Beginner", 
      elo: "~600 ELO", 
      description: "Plays simple moves and makes basic blunders.",
      icon: <Star size={24} className="level-icon-star" />
    },
    { 
      level: 2, 
      label: "Easy", 
      elo: "~800 ELO", 
      description: "Plays casually, avoids obvious tactical traps.",
      icon: <Cpu size={24} className="level-icon-cpu" />
    },
    { 
      level: 3, 
      label: "Medium", 
      elo: "~1200 ELO", 
      description: "Acts as solid club player with basic strategies.",
      icon: <Zap size={24} className="level-icon-zap" />
    },
    { 
      level: 4, 
      label: "Hard", 
      elo: "~1600 ELO", 
      description: "Plays aggressive, tactically sound combinations.",
      icon: <Flame size={24} className="level-icon-flame" />
    },
    { 
      level: 5, 
      label: "Master", 
      elo: "~2000 ELO", 
      description: "Fierce grandmaster strength with depth 20+ analyses.",
      icon: <Trophy size={24} className="level-icon-trophy" />
    }
  ];

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
        <div className="ai-cards-grid">
          {AI_LEVELS.map((ai) => {
            const isSelected = difficulty === ai.level;
            return (
              <div 
                key={ai.level}
                className={`ai-difficulty-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setDifficulty(ai.level)}
              >
                <div className="ai-card-glow" />
                <div className="ai-card-icon-container">
                  {ai.icon}
                </div>
                <h3 className="ai-card-title">{ai.label}</h3>
                <span className="ai-card-elo">{ai.elo}</span>
                <p className="ai-card-desc">{ai.description}</p>
              </div>
            );
          })}
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

        {/* Play Button */}
        <button 
          className="ai-play-submit-btn font-cinzel"
          onClick={() => onStart({ difficulty, color })}
        >
          PLAY GAME
        </button>
      </div>
    </div>
  );
}
