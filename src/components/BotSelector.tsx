import React, { useEffect, useMemo, useState } from 'react';
import { BOTS, BotConfig } from '../config/bots';
import { X, Crown, Clock } from 'lucide-react';
import './BotSelector.css';

interface BotSelectorProps {
  show: boolean;
  onClose?: () => void;
  onBotSelected: (bot: BotConfig, playerColor: 'white' | 'black', timeControl: { base: number; increment: number } | null) => void;
}

const TIME_OPTIONS: { base: number; increment: number; label: string }[] = [
  { base: 1, increment: 0, label: '1m' },
  { base: 3, increment: 0, label: '3m' },
  { base: 5, increment: 0, label: '5m' },
  { base: 10, increment: 0, label: '10m' },
  { base: 0, increment: 0, label: '∞' },
];

type BotCategory = 'beginner' | 'intermediate' | 'advanced' | 'master';

const CATEGORY_LABELS: Record<BotCategory, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  master: 'Master',
};

export const BotSelector: React.FC<BotSelectorProps> = ({ show, onClose, onBotSelected }) => {
  const [activeEngine, setActiveEngine] = useState<'stockfish' | 'maia'>('stockfish');
  const [activeCategory, setActiveCategory] = useState<BotCategory>('beginner');
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [timeControl, setTimeControl] = useState<{ base: number; increment: number } | null>(TIME_OPTIONS[3]);

  // Restore last selected bot
  useEffect(() => {
    if (!show) return;
    const lastBotId = typeof window !== 'undefined' ? localStorage.getItem('chessmaster_lastBot') : null;
    if (lastBotId) {
      const found = BOTS.find((b) => b.id === lastBotId);
      if (found) {
        setSelectedBot(found);
        setActiveEngine(found.engine || 'stockfish');
        setActiveCategory(found.category);
        return;
      }
    }
    // default to first bot in beginner
    const first = BOTS[0];
    if (first) {
      setSelectedBot(first);
      setActiveEngine('stockfish');
      setActiveCategory(first.category);
    }
  }, [show]);

  const filteredBots = useMemo(
    () => BOTS.filter((b) => {
      const isMaia = b.engine === 'maia';
      if (activeEngine === 'maia') {
        return isMaia;
      } else {
        return !isMaia && b.category === activeCategory;
      }
    }),
    [activeEngine, activeCategory],
  );

  if (!show) return null;

  const handleStart = () => {
    if (!selectedBot) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('chessmaster_lastBot', selectedBot.id);
    }
    onBotSelected(selectedBot, playerColor, timeControl && timeControl.base > 0 ? timeControl : null);
  };

  const selectedTimeBase = timeControl ? timeControl.base : 0;

  return (
    <div className="bot-selector-overlay">
      <div className="bot-selector-modal">
        <div className="bot-selector-header">
          <div className="bot-selector-title-row">
            <div className="bot-selector-title-left">
              <Crown className="bot-selector-title-icon" />
              <div>
                <h2 className="bot-selector-title">Play Bots</h2>
                <p className="bot-selector-subtitle">Challenge themed engine opponents with unique styles and personalities.</p>
              </div>
            </div>
            {onClose && (
              <button className="bot-selector-close-btn" onClick={onClose} aria-label="Close bot selector">
                <X size={18} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, margin: '14px 0 6px', padding: '0 4px' }}>
            <button
              type="button"
              className={`bot-category-tab ${activeEngine === 'stockfish' ? 'active' : ''}`}
              onClick={() => {
                setActiveEngine('stockfish');
                const first = BOTS.find(b => b.engine === 'stockfish');
                if (first) setSelectedBot(first);
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                background: activeEngine === 'stockfish' ? '#d4af37' : 'rgba(255,255,255,0.06)',
                color: activeEngine === 'stockfish' ? '#0a0a14' : '#aaa',
                transition: 'all 0.2s',
              }}
            >
              🤖 Stockfish AI Bots
            </button>
            <button
              type="button"
              className={`bot-category-tab ${activeEngine === 'maia' ? 'active' : ''}`}
              onClick={() => {
                setActiveEngine('maia');
                const first = BOTS.find(b => b.engine === 'maia');
                if (first) setSelectedBot(first);
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                background: activeEngine === 'maia' ? '#d4af37' : 'rgba(255,255,255,0.06)',
                color: activeEngine === 'maia' ? '#0a0a14' : '#aaa',
                transition: 'all 0.2s',
              }}
            >
              👩‍💻 Maia AI (Human-like)
            </button>
          </div>

          {activeEngine === 'stockfish' && (
            <div className="bot-category-tabs">
              {(Object.keys(CATEGORY_LABELS) as BotCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`bot-category-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bot-selector-body">
          <div className="bot-list" aria-label="Bot list">
            {filteredBots.map((bot) => {
              const isSelected = selectedBot?.id === bot.id;
              return (
                <button
                  key={bot.id}
                  type="button"
                  className={`bot-list-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedBot(bot)}
                >
                  <div className={`bot-list-avatar ${bot.avatarColor}`}>
                    <span>{bot.avatarEmoji}</span>
                  </div>
                  <div className="bot-list-meta">
                    <div className="bot-list-name-row">
                      <span className="bot-list-name">{bot.name}</span>
                      <span className="bot-list-elo">{bot.elo} ELO</span>
                    </div>
                    <div className="bot-list-subrow">
                      <span className="bot-list-category">{CATEGORY_LABELS[bot.category]}</span>
                      <span className="bot-list-style">{bot.style}</span>
                    </div>
                  </div>
                  <span className="bot-list-chevron">›</span>
                </button>
              );
            })}
          </div>

          <div className="bot-preview">
            {selectedBot ? (
              <>
                <div className="bot-preview-top">
                  <div className={`bot-preview-avatar ${selectedBot.avatarColor}`}>
                    <span>{selectedBot.avatarEmoji}</span>
                  </div>
                  <div className="bot-preview-header">
                    <h3 className="bot-preview-name">{selectedBot.name}</h3>
                    <div className="bot-preview-badges">
                      <span className="bot-preview-badge bot-preview-elo-badge">
                        {selectedBot.elo} ELO
                      </span>
                      <span className="bot-preview-badge bot-preview-style-badge">
                        {selectedBot.style}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="bot-preview-quote">“{selectedBot.quote}”</p>
                <p className="bot-preview-description">{selectedBot.description}</p>

                <div className="bot-preview-section-label">Play As</div>
                <div className="color-toggle">
                  <button
                    type="button"
                    className={`color-toggle-btn ${playerColor === 'white' ? 'active' : ''}`}
                    onClick={() => setPlayerColor('white')}
                  >
                    <span className="color-toggle-piece">♙</span>
                    White
                  </button>
                  <button
                    type="button"
                    className={`color-toggle-btn ${playerColor === 'black' ? 'active' : ''}`}
                    onClick={() => setPlayerColor('black')}
                  >
                    <span className="color-toggle-piece">♟</span>
                    Black
                  </button>
                </div>

                <div className="bot-preview-section-label">
                  <Clock size={14} className="time-label-icon" />
                  Time
                </div>
                <div className="time-pills">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`time-pill ${selectedTimeBase === opt.base ? 'active' : ''}`}
                      onClick={() => setTimeControl(opt)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="play-controls">
                  <button
                    type="button"
                    className="play-button"
                    disabled={!selectedBot}
                    onClick={handleStart}
                  >
                    ▶ Play Now
                  </button>
                </div>
              </>
            ) : (
              <div className="bot-preview-empty">
                <p>Select a bot on the left to see their style and personality.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotSelector;
