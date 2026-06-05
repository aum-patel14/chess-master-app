import { useState, useEffect } from 'react';
import { X, Award, Shield, User, Clock, ChevronRight } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { BOTS } from '../../data/bots';
import './PlayAIModal.css';

export default function PlayAIModal({ show, onClose, onStart }) {
  const { isPremium, setShowUpgradeModal } = useGame();
  
  const [selectedBotId, setSelectedBotId] = useState('beginner');
  const [color, setColor] = useState('w');
  
  // Time Controls
  const TIME_CONTROLS = {
    bullet: [
      { base: 1, increment: 0, label: '1+0 Bullet' },
      { base: 1, increment: 1, label: '1+1 Bullet' },
      { base: 2, increment: 1, label: '2+1 Bullet' }
    ],
    blitz: [
      { base: 3, increment: 0, label: '3+0 Blitz' },
      { base: 3, increment: 2, label: '3+2 Blitz' },
      { base: 5, increment: 0, label: '5+0 Blitz' },
      { base: 5, increment: 3, label: '5+3 Blitz' }
    ],
    rapid: [
      { base: 10, increment: 0, label: '10+0 Rapid' },
      { base: 10, increment: 5, label: '10+5 Rapid' },
      { base: 15, increment: 10, label: '15+10 Rapid' },
      { base: 30, increment: 0, label: '30+0 Rapid' }
    ],
    classical: [
      { base: 60, increment: 0, label: '60+0 Classical' }
    ]
  };

  const [activeTab, setActiveTab] = useState('rapid'); // 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom'
  const [selectedTc, setSelectedTc] = useState({ base: 10, increment: 0 });
  const [customMin, setCustomMin] = useState(10);
  const [customInc, setCustomInc] = useState(0);

  // Set default TC when active tab changes
  useEffect(() => {
    if (activeTab === 'custom') {
      setSelectedTc({ base: customMin, increment: customInc });
    } else {
      const list = TIME_CONTROLS[activeTab];
      if (list && list.length > 0) {
        setSelectedTc({ base: list[0].base, increment: list[0].increment });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'custom') {
      setSelectedTc({ base: Number(customMin) || 10, increment: Number(customInc) || 0 });
    }
  }, [customMin, customInc]);

  if (!show) return null;

  const currentBot = BOTS.find(b => b.id === selectedBotId) || BOTS[1];

  const handleStartGame = () => {
    // Premium locks: expert or master bots require Premium subscription
    if (!isPremium && (selectedBotId === 'expert' || selectedBotId === 'master')) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Convert timeControl base from minutes to seconds
    const finalTc = {
      base: selectedTc.base,
      increment: selectedTc.increment
    };

    const mapping = {
      rookie: 1,
      beginner: 2,
      casual: 3,
      club: 5,
      intermediate: 6,
      advanced: 8,
      expert: 9,
      master: 10,
    };
    const diff = mapping[selectedBotId] || 3;

    onStart({
      botId: selectedBotId,
      difficulty: diff,
      color,
      timeControl: finalTc
    });
  };

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal-card revamped-ai-modal">
        <button className="ai-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="ai-modal-header">
          <div className="ai-logo-container">
            <Award size={36} className="ai-gold-logo" />
          </div>
          <h2 className="ai-modal-title font-cinzel">CHOOSE YOUR AI OPPONENT</h2>
          <p className="ai-modal-subtitle">Pick from 8 distinct bot personalities and configure game clocks</p>
        </div>

        <div className="revamp-content-layout">
          {/* LEFT COLUMN: BOT SELECTOR GRID */}
          <div className="bot-selector-column">
            <h4 className="column-title font-cinzel">SELECT BOT</h4>
            <div className="bots-grid-selection">
              {BOTS.map((bot) => {
                const isLocked = !isPremium && (bot.id === 'expert' || bot.id === 'master');
                const isSelected = selectedBotId === bot.id;
                return (
                  <div
                    key={bot.id}
                    className={`bot-profile-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => setSelectedBotId(bot.id)}
                    style={{ '--theme-gradient': bot.theme }}
                  >
                    <div className="bot-card-avatar-circle">
                      <span className="bot-card-avatar-emoji">{bot.avatar}</span>
                      {isLocked && <span className="bot-card-lock-badge">🔒</span>}
                    </div>
                    <div className="bot-card-meta">
                      <div className="bot-card-name-row">
                        <span className="bot-card-name">{bot.name}</span>
                        <span className="bot-card-elo">{bot.elo} ELO</span>
                      </div>
                      <span className="bot-card-personality">{bot.personality}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: BOT BIO & GAME CONFIGURATION */}
          <div className="bot-config-column">
            <h4 className="column-title font-cinzel">BOT DETAILS & SETTINGS</h4>
            
            {/* BOT SPOTLIGHT CARD */}
            <div className="bot-spotlight-card" style={{ background: currentBot.theme + '10', borderColor: currentBot.theme + '40' }}>
              <div className="spotlight-header">
                <div className="spotlight-avatar" style={{ background: currentBot.theme }}>
                  {currentBot.avatar}
                </div>
                <div className="spotlight-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="spotlight-name">{currentBot.name}</h3>
                    <span className="spotlight-elo-badge" style={{ background: currentBot.theme }}>
                      {currentBot.elo} ELO
                    </span>
                  </div>
                  <div className="spotlight-personality-badge">{currentBot.personality}</div>
                </div>
              </div>
              <p className="spotlight-bio">{currentBot.bio}</p>
            </div>

            {/* COLOR SELECTION */}
            <div className="revamp-config-section">
              <span className="section-label">PLAY AS</span>
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
                  <div className="piece-icon-circle random-piece">?</div>
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

            {/* TIME CONTROL SELECTOR */}
            <div className="revamp-config-section">
              <span className="section-label">CHESS CLOCK</span>
              <div className="timecontrol-tabs">
                {['bullet', 'blitz', 'rapid', 'classical', 'custom'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tc-tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* CLOCK OPTIONS LIST */}
              {activeTab !== 'custom' ? (
                <div className="tc-presets-grid">
                  {(TIME_CONTROLS[activeTab] || []).map((preset, idx) => {
                    const isSelected = selectedTc.base === preset.base && selectedTc.increment === preset.increment;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`tc-preset-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedTc({ base: preset.base, increment: preset.increment })}
                      >
                        <Clock size={14} className="tc-icon" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="custom-tc-inputs">
                  <div className="custom-input-group">
                    <label>Minutes: {customMin}</label>
                    <input
                      type="range"
                      min="1"
                      max="120"
                      value={customMin}
                      onChange={(e) => setCustomMin(Number(e.target.value))}
                      className="custom-range-slider"
                    />
                  </div>
                  <div className="custom-input-group">
                    <label>Increment (sec): {customInc}</label>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={customInc}
                      onChange={(e) => setCustomInc(Number(e.target.value))}
                      className="custom-range-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="ai-play-submit-btn font-cinzel full-width-btn"
              onClick={handleStartGame}
            >
              PLAY GAME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
