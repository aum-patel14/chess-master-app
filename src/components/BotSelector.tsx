import React, { useState, useEffect } from 'react';
import { BOTS, BotConfig } from '../config/bots';
import { Crown, User, X, Clock } from 'lucide-react';
import './BotSelector.css';

interface BotSelectorProps {
  show: boolean;
  onClose?: () => void;
  onBotSelected: (bot: BotConfig, playerColor: 'white' | 'black', timeControl: { base: number, increment: number } | null) => void;
}

const TIME_OPTIONS = [
  { base: 1, increment: 0, label: '1 min' },
  { base: 3, increment: 0, label: '3 min' },
  { base: 5, increment: 0, label: '5 min' },
  { base: 10, increment: 0, label: '10 min' },
  { base: 0, increment: 0, label: 'Unlimited' },
];

export const BotSelector: React.FC<BotSelectorProps> = ({ show, onClose, onBotSelected }) => {
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [timeControl, setTimeControl] = useState<{ base: number, increment: number }>(TIME_OPTIONS[3]);

  // Load last selected bot from localStorage
  useEffect(() => {
    const lastBotId = localStorage.getItem('chessmaster_lastBot');
    if (lastBotId) {
      const bot = BOTS.find((b) => b.id === lastBotId);
      if (bot) setSelectedBot(bot);
    }
  }, []);

  if (!show) return null;

  const handleStartGame = () => {
    if (selectedBot) {
      // Remember selected bot
      localStorage.setItem('chessmaster_lastBot', selectedBot.id);
      onBotSelected(selectedBot, playerColor, timeControl.base > 0 ? timeControl : null);
    }
  };

  return (
    <div className="bot-selector-overlay">
      <div className="bot-selector-container">
        {onClose && (
          <button className="bot-selector-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        )}

        <div className="bot-selector-header">
          <div className="bot-selector-title-wrap">
            <Crown className="bot-title-icon" />
            <h2 className="bot-selector-title font-cinzel">Select AI Opponent</h2>
          </div>
          <p className="bot-selector-subtitle">
            Challenge one of our 8 custom engine bot personalities, rated from 400 to 2400+ ELO.
          </p>
        </div>

        <div className="bot-selector-grid">
          {BOTS.map((bot) => {
            const isSelected = selectedBot?.id === bot.id;
            return (
              <div
                key={bot.id}
                className={`bot-card-new ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedBot(bot)}
              >
                <div className={`bot-avatar-circle ${bot.colorClass}`}>
                  {bot.avatarInitials}
                </div>
                <div className="bot-card-info">
                  <div className="bot-card-header">
                    <span className="bot-card-name font-cinzel">{bot.name}</span>
                    <span className="bot-card-elo">{bot.elo} ELO</span>
                  </div>
                  <p className="bot-card-desc">{bot.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bot-selector-controls">
          <div className="color-toggle-container">
            <span className="control-label font-cinzel">Play As</span>
            <div className="color-toggle-buttons">
              <button
                type="button"
                className={`color-btn white ${playerColor === 'white' ? 'active' : ''}`}
                onClick={() => setPlayerColor('white')}
              >
                <span className="piece-symbol">♙</span> White
              </button>
              <button
                type="button"
                className={`color-btn black ${playerColor === 'black' ? 'active' : ''}`}
                onClick={() => setPlayerColor('black')}
              >
                <span className="piece-symbol">♟</span> Black
              </button>
            </div>
          </div>

          <div className="time-toggle-container">
            <span className="control-label font-cinzel"><Clock size={16} style={{display: 'inline', verticalAlign: 'sub', marginRight: '4px'}}/>Time Control</span>
            <div className="time-toggle-buttons">
              <select 
                className="time-select" 
                value={timeControl.base} 
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const option = TIME_OPTIONS.find(t => t.base === val) || TIME_OPTIONS[3];
                  setTimeControl(option);
                }}
              >
                {TIME_OPTIONS.map(opt => (
                  <option key={opt.base} value={opt.base}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="start-game-btn font-cinzel"
            disabled={!selectedBot}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotSelector;
