import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import PageShell from '../components/PageShell';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { useGame } from '../context/GameContext';
import { Bookmark, Sparkles, AlertTriangle, ArrowRight, RotateCcw, HelpCircle, Trophy } from 'lucide-react';
import puzzlesData from '../data/puzzles.json';
import './PuzzlePage.css';

const FILES = 'abcdefgh'.split('');
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function PuzzleBoard({ chess, selected, legal, onSquare, highlights, flashClass, isFlipped }) {
  const board = chess.board();
  const files = isFlipped ? [...FILES].reverse() : FILES;
  const ranks = isFlipped ? [...RANKS].reverse() : RANKS;

  return (
    <div className="puzzle-board-outer">
      <div className="puzzle-board-row">
        {/* LEFT Rank Coordinates (Outside) */}
        <div className="puzzle-rank-labels">
          {ranks.map(rank => (
            <div key={rank} className="puzzle-coord-label puzzle-rank-label">
              {rank}
            </div>
          ))}
        </div>

        {/* Board Wrapper */}
        <div className={`puzzle-board-container ${flashClass}`}>
          <div className="puzzle-board-grid">
            {ranks.map((rank) =>
              files.map((file) => {
                const sq = `${file}${rank}`;
                const cell = board[8 - parseInt(rank, 10)][file.charCodeAt(0) - 97];
                const dark = (file.charCodeAt(0) - 97 + parseInt(rank, 10)) % 2 === 0;
                const isSel = selected === sq;
                const isLeg = legal.includes(sq);
                const isHintPiece = highlights?.piece === sq;
                const hFrom = highlights?.from === sq;
                const hTo = highlights?.to === sq;
                
                let pieceImg = null;
                if (cell) {
                  const key = `${cell.color}${cell.type.toUpperCase()}`;
                  pieceImg = (
                    <img 
                      src={`${import.meta.env.BASE_URL}pieces/cburnett/${key}.svg`} 
                      className="puzzle-piece-img" 
                      alt={key} 
                    />
                  );
                }

                // Square highlights
                let highlightClass = '';
                if (isSel) highlightClass = 'selected-square';
                else if (isHintPiece) highlightClass = 'hint-square-glow';
                else if (hFrom || hTo) highlightClass = 'hint-path-square';

                return (
                  <button
                    type="button"
                    key={sq}
                    onClick={() => onSquare(sq)}
                    className={`puzzle-square ${dark ? 'dark-sq' : 'light-sq'} ${highlightClass}`}
                  >
                    {pieceImg}
                    
                    {/* Legal Move indicator */}
                    {isLeg && (
                      <div className={`puzzle-leg-dot ${cell ? 'capture-ring' : 'empty-dot'}`} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM File Coordinates (Outside) */}
      <div className="puzzle-file-labels-row">
        <div style={{ width: '20px', marginRight: '4px' }} /> {/* Spacer */}
        {files.map(file => (
          <div key={file} className="puzzle-coord-label puzzle-file-label">
            {file}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PuzzlePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bookmarked, setBookmarked] = useLocalStorage('chess_bookmarks', []);
  const [userPuzzleRating, setUserPuzzleRating] = useLocalStorage('chess_user_puzzle_rating', 1200);

  // Gated limits check!
  const { checkFeatureLimit, incrementUsage } = useGame();

  // Filters
  const [themeFilter, setThemeFilter] = useState('All');
  const [difficultyRange, setDifficultyRange] = useState(1500); // Slider: Beginner (800) -> Expert (2000)

  // Current Puzzle
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Filter puzzles based on Theme + Rating slider (±300 Elo range around slider)
  const filteredPuzzles = useMemo(() => {
    return puzzlesData.filter(p => {
      const matchesTheme = themeFilter === 'All' || p.themes.includes(themeFilter.toLowerCase());
      const matchesRating = Math.abs(p.rating - difficultyRange) <= 300;
      return matchesTheme && matchesRating;
    });
  }, [themeFilter, difficultyRange]);

  // Daily Puzzle (picked by date % puzzles.length)
  const dailyPuzzle = useMemo(() => {
    const day = new Date().getDate();
    return puzzlesData[day % puzzlesData.length];
  }, []);

  const [activePuzzleMode, setActivePuzzleMode] = useState('list'); // 'list' | 'daily'
  const activePuzzle = activePuzzleMode === 'daily' ? dailyPuzzle : (filteredPuzzles[puzzleIndex] || puzzlesData[0]);

  // Solving states
  const [chess, setChess] = useState(() => new Chess(activePuzzle.fen));
  const [moveIdx, setMoveIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [legal, setLegal] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [highlights, setHighlights] = useState(null);
  const [flashClass, setFlashClass] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  // Reset solving states on puzzle switch
  useEffect(() => {
    try {
      setChess(new Chess(activePuzzle.fen));
    } catch(e) {
      setChess(new Chess());
    }
    setMoveIdx(0);
    setSelected(null);
    setLegal([]);
    setHintsUsed(0);
    setHighlights(null);
    setFlashClass('');
    setWrongAttempts(0);
    setShowSuccessModal(false);
    // Automatic board flipping if it is black to play
    const pChess = new Chess(activePuzzle.fen);
    setIsFlipped(pChess.turn() === 'b');
  }, [activePuzzle]);

  const solutionMoves = activePuzzle.moves;
  const isWhiteToMove = chess.turn() === 'w';

  const onSquare = (sq) => {
    if (showSuccessModal) return;
    const piece = chess.get(sq);

    // If already selected, click same square deselects
    if (selected === sq) {
      setSelected(null);
      setLegal([]);
      return;
    }

    if (selected) {
      const moves = chess.moves({ square: selected, verbose: true });
      const hit = moves.find(m => m.to === sq);

      if (hit) {
        // Attempt move
        const testChess = new Chess(chess.fen());
        const mv = testChess.move({ from: selected, to: sq, promotion: hit.promotion });

        if (mv) {
          const expected = solutionMoves[moveIdx];
          // Normalise SAN representations to match
          const cleanMv = mv.san.replace(/\+|#/g, '');
          const cleanExpected = expected.replace(/\+|#/g, '');

          if (cleanMv === cleanExpected) {
            // Correct move!
            setFlashClass('correct-flash');
            setTimeout(() => setFlashClass(''), 400);

            // Apply move to active board
            setChess(new Chess(testChess.fen()));
            setSelected(null);
            setLegal([]);
            const nextIdx = moveIdx + 1;
            setMoveIdx(nextIdx);

            if (nextIdx >= solutionMoves.length) {
              // Puzzle fully solved!
              handlePuzzleSolved();
            } else {
              // Opponent auto-reply after 500ms
              const replyMove = solutionMoves[nextIdx];
              setTimeout(() => {
                const opponentChess = new Chess(testChess.fen());
                opponentChess.move(replyMove);
                setChess(new Chess(opponentChess.fen()));
                setMoveIdx(nextIdx + 1);
                
                // If opponent reply finishes the puzzle
                if (nextIdx + 1 >= solutionMoves.length) {
                  handlePuzzleSolved();
                }
              }, 500);
            }
          } else {
            // Wrong move! Flash red, flash "Try again", and undo after 800ms
            setFlashClass('wrong-flash');
            setWrongAttempts(prev => prev + 1);
            showToast('Wrong move. Try again!', 'warning', 1500);

            setTimeout(() => {
              setFlashClass('');
              setSelected(null);
              setLegal([]);
            }, 800);
          }
        }
      } else {
        // Clicked another square - change selection if own piece
        if (piece && piece.color === chess.turn()) {
          setSelected(sq);
          const legalDestinations = chess.moves({ square: sq, verbose: true }).map(m => m.to);
          setLegal(legalDestinations);
        } else {
          setSelected(null);
          setLegal([]);
        }
      }
    } else {
      // First selection
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        const legalDestinations = chess.moves({ square: sq, verbose: true }).map(m => m.to);
        setLegal(legalDestinations);
      }
    }
  };

  const handlePuzzleSolved = () => {
    // Enforce puzzle progress limits
    if (!checkFeatureLimit('puzzle', "You've completed all 10 free puzzles today. Upgrade to Premium for unlimited puzzles!")) {
      return;
    }
    incrementUsage('puzzle');

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setShowSuccessModal(true);

    // Calculate rating adjustment
    // Starts at +15. Subtract points for hints and wrong attempts.
    let ratingGain = 15;
    if (hintsUsed > 0) ratingGain -= 5 * hintsUsed;
    if (wrongAttempts > 0) ratingGain -= 3 * wrongAttempts;
    ratingGain = Math.max(2, ratingGain); // Ensure at least +2

    setUserPuzzleRating(prev => prev + ratingGain);
    showToast(`Puzzle Solved! +${ratingGain} Rating`, 'success');
  };

  const handleHint = () => {
    if (hintsUsed >= 2) return;
    const nextHint = hintsUsed + 1;
    setHintsUsed(nextHint);

    const expected = solutionMoves[moveIdx];
    const testChess = new Chess(chess.fen());
    const moves = testChess.moves({ verbose: true });
    
    // Find expected move in legal moves
    const target = moves.find(m => m.san.replace(/\+|#/g, '') === expected.replace(/\+|#/g, ''));

    if (target) {
      if (nextHint === 1) {
        // Highlight piece to move
        setHighlights({ piece: target.from });
        showToast('Hint: Piece to move is highlighted!', 'info');
      } else if (nextHint === 2) {
        // Highlight complete path
        setHighlights({ from: target.from, to: target.to });
        showToast('Hint: Move piece from highlighted square to path!', 'info');
      }
    }
  };

  const handleSkip = () => {
    if (activePuzzleMode === 'daily') {
      showToast('Cannot skip the Daily Puzzle!', 'warning');
      return;
    }
    if (puzzleIndex < filteredPuzzles.length - 1) {
      setPuzzleIndex(prev => prev + 1);
    } else {
      showToast('No more puzzles in this filtered category!', 'info');
    }
  };

  const handleRetry = () => {
    setChess(new Chess(activePuzzle.fen));
    setMoveIdx(0);
    setSelected(null);
    setLegal([]);
    setHintsUsed(0);
    setHighlights(null);
    setFlashClass('');
    setWrongAttempts(0);
    setShowSuccessModal(false);
  };

  const toggleBookmark = () => {
    const isBookmarked = bookmarked.includes(activePuzzle.id);
    if (isBookmarked) {
      setBookmarked(bookmarked.filter(id => id !== activePuzzle.id));
      showToast('Removed from bookmarks.', 'info');
    } else {
      setBookmarked([...bookmarked, activePuzzle.id]);
      showToast('Puzzle bookmarked! 🔖', 'success');
    }
  };

  const isBookmarked = bookmarked.includes(activePuzzle.id);
  const progressPercent = filteredPuzzles.length > 0 ? ((puzzleIndex + 1) / filteredPuzzles.length) * 100 : 0;

  return (
    <PageShell>
      <div className="puzzles-page-wrapper">
        
        {/* Navigation & Header */}
        <div className="puzzles-header">
          <div className="puzzles-header-left">
            <button 
              type="button" 
              onClick={() => navigate('/game')} 
              className="puzzles-back-btn font-cinzel"
            >
              ← Back
            </button>
            <div className="puzzles-rating-display">
              <Trophy size={18} className="gold-trophy-icon" />
              <span>Your Puzzle Rating: <strong>{userPuzzleRating}</strong></span>
            </div>
          </div>
          
          <div className="puzzles-mode-tabs">
            <button 
              className={`puzzle-tab-btn ${activePuzzleMode === 'list' ? 'active' : ''}`}
              onClick={() => { setActivePuzzleMode('list'); setPuzzleIndex(0); }}
            >
              All Puzzles
            </button>
            <button 
              className={`puzzle-tab-btn ${activePuzzleMode === 'daily' ? 'active' : ''}`}
              onClick={() => setActivePuzzleMode('daily')}
            >
              Daily Puzzle
            </button>
          </div>
        </div>

        {/* Filters Panel (List mode only) */}
        {activePuzzleMode === 'list' && (
          <div className="puzzles-filters-card">
            <div className="filter-group">
              <span className="filter-label">THEME</span>
              <div className="filter-buttons-row">
                {['All', 'Fork', 'Pin', 'Mate', 'Skewer'].map(t => (
                  <button 
                    key={t}
                    onClick={() => { setThemeFilter(t); setPuzzleIndex(0); }}
                    className={`filter-btn ${themeFilter === t ? 'active' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group difficulty-slider-group">
              <div className="slider-header">
                <span className="filter-label">DIFFICULTY PREFERENCE</span>
                <span className="slider-value-badge">{difficultyRange} Elo</span>
              </div>
              <input 
                type="range"
                min="800"
                max="2000"
                step="100"
                value={difficultyRange}
                onChange={(e) => { setDifficultyRange(parseInt(e.target.value)); setPuzzleIndex(0); }}
                className="difficulty-slider"
              />
              <div className="slider-ticks">
                <span>Beginner (800)</span>
                <span>Expert (2000)</span>
              </div>
            </div>
          </div>
        )}

        {/* Puzzle Board & Control Grid */}
        <div className="puzzles-main-layout">
          
          {/* Left: Board Column */}
          <div className="puzzle-board-column">
            <div className="puzzle-turn-banner font-cinzel">
              {isWhiteToMove ? "White to move" : "Black to move"}
            </div>
            
            <PuzzleBoard 
              chess={chess}
              selected={selected}
              legal={legal}
              onSquare={onSquare}
              highlights={highlights}
              flashClass={flashClass}
              isFlipped={isFlipped}
            />
          </div>

          {/* Right: Controls Card */}
          <div className="puzzle-controls-panel">
            <div className="puzzle-details-card">
              <span className="puzzle-card-tag font-cinzel">{activePuzzle.title}</span>
              <h3 className="puzzle-card-rating">Rating: {activePuzzle.rating} ELO</h3>
              
              <div className="puzzle-card-themes">
                {activePuzzle.themes.map(theme => (
                  <span key={theme} className="theme-badge">#{theme}</span>
                ))}
              </div>

              {activePuzzleMode === 'list' && filteredPuzzles.length > 0 && (
                <div className="puzzle-progress-section">
                  <div className="progress-text">
                    <span>Progress:</span>
                    <span>Puzzle {puzzleIndex + 1} of {filteredPuzzles.length}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="puzzle-buttons-grid">
              <button 
                type="button" 
                onClick={handleHint} 
                disabled={hintsUsed >= 2 || showSuccessModal}
                className="puzzle-action-btn hint-btn"
              >
                <HelpCircle size={18} />
                <span>{hintsUsed === 0 ? 'Show Hint' : hintsUsed === 1 ? 'Show Goal path' : 'No hints left'}</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleRetry}
                className="puzzle-action-btn retry-btn"
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </button>
              
              {activePuzzleMode === 'list' && (
                <button 
                  type="button" 
                  onClick={handleSkip}
                  disabled={puzzleIndex >= filteredPuzzles.length - 1 || showSuccessModal}
                  className="puzzle-action-btn skip-btn"
                >
                  <ArrowRight size={18} />
                  <span>Skip</span>
                </button>
              )}

              <button 
                type="button" 
                onClick={toggleBookmark}
                className={`puzzle-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
              >
                <Bookmark size={18} fill={isBookmarked ? '#e2b04a' : 'none'} />
                <span>Bookmark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="puzzle-success-overlay">
            <div className="puzzle-success-card">
              <div className="success-checkmark-circle">
                ✓
              </div>
              <h2 className="success-title font-cinzel">PUZZLE SOLVED!</h2>
              
              <div className="success-info-box">
                <p><strong>Title:</strong> {activePuzzle.title}</p>
                <p><strong>Rating:</strong> {activePuzzle.rating} ELO</p>
                <p><strong>Themes:</strong> {activePuzzle.themes.join(', ')}</p>
              </div>

              <div className="success-actions-row">
                <button className="success-btn retry" onClick={handleRetry}>
                  Try Again
                </button>
                {activePuzzleMode === 'list' && puzzleIndex < filteredPuzzles.length - 1 ? (
                  <button 
                    className="success-btn next font-cinzel"
                    onClick={() => {
                      setPuzzleIndex(prev => prev + 1);
                      setShowSuccessModal(false);
                    }}
                  >
                    Next Puzzle
                  </button>
                ) : (
                  <button className="success-btn next font-cinzel" onClick={() => setShowSuccessModal(false)}>
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
