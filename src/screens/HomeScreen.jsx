import './HomeScreen.css';
import { useState } from 'react';
import { useGame } from '../context/GameContext';
import LightNavbar from '../components/LightNavbar';

const DIFFICULTY_LABELS = {
  1: { label: 'BEGINNER' },
  2: { label: 'EASY' },
  3: { label: 'MEDIUM' },
  4: { label: 'HARD' },
  5: { label: 'EXPERT' },
};

export default function HomeScreen() {
  const { startNewGame, state, dispatch } = useGame();
  const [showConfig, setShowConfig] = useState(false);
  const [difficulty, setDifficulty] = useState(state.aiDifficulty);
  const [selectedColor, setSelectedColor] = useState('w');

  const handleStartGame = () => {
    const actualColor = selectedColor === 'r' ? (Math.random() > 0.5 ? 'w' : 'b') : selectedColor;
    startNewGame({ mode: 'vsAI', difficulty, playerColor: actualColor });
    dispatch({ type: 'SET_MODE', payload: 'vsAI' });
  };

  return (
    <div className="landing-light-root">
      
      {/* Navbar */}
      <LightNavbar />

      {/* Main Content Area */}
      <div className="light-hero">
        
        {/* Typography */}
        <div className="hero-text-container">
          <h1 className="hero-chess">CHESS</h1>
          <h2 className="hero-game">Game</h2>
        </div>

        {/* Call to Action or Config Panel */}
        <div className="hero-action-area">
          {!showConfig ? (
            <button className="btn-get-started" onClick={() => setShowConfig(true)}>
              Get Started!
            </button>
          ) : (
            <div className="light-config-panel">
              <div className="config-row">
                <div className="config-label">Difficulty:</div>
                <div className="diff-options">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button 
                      key={level}
                      className={`light-diff-btn ${difficulty === level ? 'active' : ''}`}
                      onClick={() => setDifficulty(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="config-row">
                <div className="config-label">Play As:</div>
                <div className="color-options">
                  <button className={`light-color-btn ${selectedColor === 'w' ? 'active' : ''}`} onClick={() => setSelectedColor('w')}>White</button>
                  <button className={`light-color-btn ${selectedColor === 'r' ? 'active' : ''}`} onClick={() => setSelectedColor('r')}>Random</button>
                  <button className={`light-color-btn ${selectedColor === 'b' ? 'active' : ''}`} onClick={() => setSelectedColor('b')}>Black</button>
                </div>
              </div>
              <button className="btn-start-match" onClick={handleStartGame}>Play Match</button>
            </div>
          )}
        </div>

      </div>

      {/* 3D Background Image Container */}
      <div className="hero-image-container">
        <img src="/hero-3d.png" alt="3D Chess Board" className="hero-3d-image" />
      </div>

    </div>
  );
}
