import './GamePage.css';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import GameScreen from '../components/game/GameScreen';
import PlayAIModal from '../components/modals/PlayAIModal';
import PageShell from '../components/PageShell';

const useBoardSize = () => {
  const calc = () => Math.min(window.innerWidth - 20, window.innerHeight * 0.52, 560);
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const update = () => setSize(calc());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
};

const AI_LEVELS = {
  1: { label: 'Beginner', elo: 600 },
  2: { label: 'Casual', elo: 1000 },
  3: { label: 'Club', elo: 1400 },
  4: { label: 'Advanced', elo: 1800 },
  5: { label: 'Master', elo: 2800 },
};

export default function GamePage() {
  const { state, dispatch, resign, offerDraw, undoMove, startNewGame, playerElo } = useGame();
  const {
    fen, status, isAIThinking, gameMode, playerColor,
    aiDifficulty, capturedPieces, history,
    whiteTime, blackTime, timeControl
  } = state;

  const location = useLocation();
  const navigate = useNavigate();
  const { mode: requestedMode = 'local', difficulty: paramDiff = 3, timeControl: paramTimeControl = 600, playerColor: paramColor = 'w', resume = false, fen: paramFen = '' } = location.state || {};

  const [showAISetup, setShowAISetup] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Resume game logic
  useEffect(() => {
    if (resume) {
      try {
        const saved = JSON.parse(localStorage.getItem('chess_saved_game'));
        if (saved) {
          startNewGame({ mode: saved.mode, difficulty: saved.difficulty, fen: saved.fen });
        }
      } catch(e) {}
    }
  }, [resume, startNewGame]);

  // Initialize game mode based on URL query string
  useEffect(() => {
    if (requestedMode === 'ai') {
      if (!paramDiff || !paramColor) {
        setShowAISetup(true);
      } else if (state.gameMode !== 'vsAI' || state.aiDifficulty !== paramDiff || state.playerColor !== paramColor) {
        startNewGame({ mode: 'vsAI', playerColor: paramColor, difficulty: paramDiff, fen: paramFen });
      }
    } else if (state.gameMode !== requestedMode || (paramFen && state.moveCount === 0 && state.fen !== paramFen)) {
      // If it's a puzzle, lesson, or local mode, load it!
      startNewGame({ mode: requestedMode, fen: paramFen });
    }
  }, [requestedMode, paramDiff, paramColor, paramFen, state.gameMode, state.aiDifficulty, state.playerColor, state.moveCount, state.fen, startNewGame]);

  const handleStartAI = (config) => {
    let chosenColor = config.color;
    if (chosenColor === 'r') {
      chosenColor = Math.random() > 0.5 ? 'w' : 'b';
    }
    setShowAISetup(false);
    navigate(`/play?mode=ai&difficulty=${config.difficulty}&color=${chosenColor}`, { replace: true });
  };

  const handleCloseAISetup = () => {
    setShowAISetup(false);
    // If they cancel, fallback to a local match or home page
    if (state.gameMode !== 'vsAI') navigate('/');
  };

  return (
    <PageShell>
      <GameScreen />
      
      {showAISetup && (
        <PlayAIModal 
          show={showAISetup}
          onClose={handleCloseAISetup} 
          onStart={handleStartAI} 
        />
      )}
    </PageShell>
  );
}

