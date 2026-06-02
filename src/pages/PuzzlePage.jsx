import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import PageShell from '../components/PageShell';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import supabase from '../services/supabase';
import {
  Bookmark,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  HelpCircle,
  Trophy,
  Flame,
  Zap,
  Swords,
  Calendar,
  Share2,
  Lock,
  Compass,
  Smile,
  AlertCircle,
  Play,
  CheckCircle,
  CheckCircle2,
  Award,
  Crown,
  Volume2,
  VolumeX
} from 'lucide-react';
import puzzlesData from '../data/puzzles.json';
import './PuzzlePage.css';

const FILES = 'abcdefgh'.split('');
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Helper to initialize Chess game
const initGame = (fen) => {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch (e) {
    console.error('Chess init failed in PuzzlePage:', e);
    return new Chess();
  }
};

// PuzzleBoard Sub-component (Highly Styled CSS grid)
function PuzzleBoard({ chess, selected, legal, onSquare, highlights, flashClass, isFlipped }) {
  const board = chess.board();
  const files = isFlipped ? [...FILES].reverse() : FILES;
  const ranks = isFlipped ? [...RANKS].reverse() : RANKS;

  return (
    <div className="puzzle-board-outer animate-fade-in">
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
                      draggable="false"
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
  const { currentUser, userData } = useAuth();
  const socket = useSocket();

  // Premium State Toggle (Mocking upgrade to experience both flows)
  const [isPremiumMock, setIsPremiumMock] = useLocalStorage('chess_premium_mock', false);
  const isPremiumUser = isPremiumMock || (userData && userData.isPremium);

  // local storage trackers for puzzle features
  const [bookmarked, setBookmarked] = useLocalStorage('chess_bookmarks', []);
  
  // Daily Puzzle Calendar / Streaks
  const [dailyStreak, setDailyStreak] = useLocalStorage('chess_daily_streak', 0);
  const [lastSolvedDailyDate, setLastSolvedDailyDate] = useLocalStorage('chess_last_solved_daily_date', '');
  const [solvedDailyCalendar, setSolvedDailyCalendar] = useLocalStorage('chess_solved_daily_calendar', {}); // { 'YYYY-MM-DD': true }

  // Rated Puzzles Trackers
  const [localPuzzleRating, setLocalPuzzleRating] = useLocalStorage('chess_local_puzzle_rating', 1200);
  const [ratedPuzzlesPlayedToday, setRatedPuzzlesPlayedToday] = useLocalStorage('chess_rated_played_today', 0);
  const [lastPlayedRatedDate, setLastPlayedRatedDate] = useLocalStorage('chess_last_played_rated_date', '');
  const [ratedSessionCorrect, setRatedSessionCorrect] = useState(0);
  const [ratedSessionTotal, setRatedSessionTotal] = useState(0);
  const [dbPuzzlesList, setDbPuzzlesList] = useState([]);
  const [currentDbPuzzleIndex, setCurrentDbPuzzleIndex] = useState(0);

  // Tab Navigation State: 'daily' | 'rated' | 'rush' | 'battles'
  const [activeTab, setActiveTab] = useState('daily');

  // SOUND CONTROLS
  const [soundEnabled, setSoundEnabled] = useLocalStorage('chess_puzzle_sound', true);
  const audioMoveRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const audioCorrectRef = useRef(null);
  const audioWrongRef = useRef(null);

  // Puzzle Rush States
  const [rushMode, setRushMode] = useState('lobby'); // 'lobby' | 'playing' | 'gameover'
  const [rushTimeLimit, setRushTimeLimit] = useState(180); // 180 (3m) | 300 (5m) | 0 (Survival)
  const [rushTimeRemaining, setRushTimeRemaining] = useState(180);
  const [rushScore, setRushScore] = useState(0);
  const [rushStrikes, setRushStrikes] = useState(0);
  const [rushPuzzlesList, setRushPuzzlesList] = useState([]);
  const [currentRushIndex, setCurrentRushIndex] = useState(0);
  const [rushHighScore3m, setRushHighScore3m] = useLocalStorage('chess_rush_highscore_3m', 0);
  const [rushHighScore5m, setRushHighScore5m] = useLocalStorage('chess_rush_highscore_5m', 0);
  const [rushHighScoreSurvival, setRushHighScoreSurvival] = useLocalStorage('chess_rush_highscore_survival', 0);

  // Puzzle Battles (Sockets 1v1 Race) States
  const [battleState, setBattleState] = useState('lobby'); // 'lobby' | 'queue' | 'playing' | 'gameover'
  const [battleRoomCode, setBattleRoomCode] = useState('');
  const [battleOpponentName, setBattleOpponentName] = useState('Opponent');
  const [battleOpponentRating, setBattleOpponentRating] = useState(1200);
  const [battlePuzzles, setBattlePuzzles] = useState([]);
  const [battleActiveIndex, setBattleActiveIndex] = useState(0);
  const [battlePlayerScore, setBattlePlayerScore] = useState(0);
  const [battleOpponentScore, setBattleOpponentScore] = useState(0);
  const [battleOpponentIndex, setBattleOpponentIndex] = useState(0);
  const [battleOpponentStrikes, setBattleOpponentStrikes] = useState(0);
  const [battleTimeRemaining, setBattleTimeRemaining] = useState(180);
  const [battleOutcome, setBattleOutcome] = useState({ result: 'draw', reason: 'time-up' });

  // Current Puzzle Solving Engine State
  const [activePuzzle, setActivePuzzle] = useState(puzzlesData[0]);
  const [chess, setChess] = useState(() => initGame(activePuzzle.fen));
  const [moveIdx, setMoveIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [legal, setLegal] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [highlights, setHighlights] = useState(null);
  const [flashClass, setFlashClass] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPromotionPending, setShowPromotionPending] = useState(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Daily Puzzle Global Picker
  const dailyPuzzle = useMemo(() => {
    const day = new Date().getDate();
    return puzzlesData[day % puzzlesData.length];
  }, []);

  // Sync Daily Limit Tracker across dates
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (lastPlayedRatedDate !== todayStr) {
      setRatedPuzzlesPlayedToday(0);
      setLastPlayedRatedDate(todayStr);
    }
  }, [lastPlayedRatedDate, setLastPlayedRatedDate, setRatedPuzzlesPlayedToday]);

  // Audio elements creation
  useEffect(() => {
    audioMoveRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
    audioCaptureRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2042/2042-84.wav');
    audioCorrectRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav');
    audioWrongRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/950/950-84.wav');

    // Reduce volume levels
    [audioMoveRef, audioCaptureRef, audioCorrectRef, audioWrongRef].forEach(ref => {
      if (ref.current) ref.current.volume = 0.25;
    });
  }, []);

  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      if (type === 'move' && audioMoveRef.current) {
        audioMoveRef.current.currentTime = 0;
        audioMoveRef.current.play();
      } else if (type === 'capture' && audioCaptureRef.current) {
        audioCaptureRef.current.currentTime = 0;
        audioCaptureRef.current.play();
      } else if (type === 'correct' && audioCorrectRef.current) {
        audioCorrectRef.current.currentTime = 0;
        audioCorrectRef.current.play();
      } else if (type === 'wrong' && audioWrongRef.current) {
        audioWrongRef.current.currentTime = 0;
        audioWrongRef.current.play();
      }
    } catch (e) {
      console.warn('Sound play blocked:', e);
    }
  };

  // Load puzzles from database when tab switching or starting rated mode
  const fetchDbPuzzles = useCallback(async () => {
    try {
      const avgRating = localPuzzleRating;
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .gte('rating', avgRating - 250)
        .lte('rating', avgRating + 250)
        .limit(20);
        
      if (data && data.length > 0) {
        setDbPuzzlesList(data);
        setCurrentDbPuzzleIndex(0);
        return data;
      }
    } catch (err) {
      console.error('Error fetching db puzzles:', err);
    }
    // Fallback offline curated list
    setDbPuzzlesList(puzzlesData);
    setCurrentDbPuzzleIndex(0);
    return puzzlesData;
  }, [localPuzzleRating]);

  // Synchronize Active Puzzle based on current tabs / submodes
  useEffect(() => {
    if (activeTab === 'daily') {
      setActivePuzzle(dailyPuzzle);
    } else if (activeTab === 'rated') {
      if (dbPuzzlesList.length > 0 && dbPuzzlesList[currentDbPuzzleIndex]) {
        setActivePuzzle(dbPuzzlesList[currentDbPuzzleIndex]);
      } else {
        setActivePuzzle(puzzlesData[0]);
      }
    } else if (activeTab === 'rush') {
      if (rushMode === 'playing' && rushPuzzlesList.length > 0 && rushPuzzlesList[currentRushIndex]) {
        setActivePuzzle(rushPuzzlesList[currentRushIndex]);
      } else {
        setActivePuzzle(puzzlesData[0]);
      }
    } else if (activeTab === 'battles') {
      if (battleState === 'playing' && battlePuzzles.length > 0 && battlePuzzles[battleActiveIndex]) {
        setActivePuzzle(battlePuzzles[battleActiveIndex]);
      } else {
        setActivePuzzle(puzzlesData[0]);
      }
    }
  }, [activeTab, dailyPuzzle, dbPuzzlesList, currentDbPuzzleIndex, rushMode, rushPuzzlesList, currentRushIndex, battleState, battlePuzzles, battleActiveIndex]);

  // Setup/Reset Board Solving engine states on active puzzle changes
  const resetPuzzleSolving = useCallback(() => {
    if (!activePuzzle) return;
    
    let freshChess;
    try {
      freshChess = initGame(activePuzzle.fen);
    } catch(e) {
      freshChess = initGame();
    }

    // Auto play opponent's initial setup move (index 0)
    const setupMove = activePuzzle.moves[0];
    if (setupMove) {
      try {
        if (setupMove.length >= 4 && /^[a-h][1-8][a-h][1-8]/i.test(setupMove)) {
          const from = setupMove.substring(0, 2);
          const to = setupMove.substring(2, 4);
          const promo = setupMove.length === 5 ? setupMove[4] : undefined;
          freshChess.move({ from, to, promotion: promo });
        } else {
          freshChess.move(setupMove);
        }
      } catch (err) {
        console.warn('Opponent first move application failed:', err);
      }
    }

    setChess(freshChess);
    setMoveIdx(1); // Player starts at move index 1
    setSelected(null);
    setLegal([]);
    setHintsUsed(0);
    setHighlights(null);
    setFlashClass('');
    setWrongAttempts(0);
    setShowSuccessModal(false);
    setShowPromotionPending(null);

    // Auto-flip orientation based on active color
    const startingChess = initGame(activePuzzle.fen);
    setIsFlipped(startingChess.turn() === 'b');
  }, [activePuzzle]);

  useEffect(() => {
    resetPuzzleSolving();
  }, [activePuzzle, resetPuzzleSolving]);

  // Rated Daily limit checking
  const checkRatedPuzzlesAvailable = () => {
    if (isPremiumUser) return true;
    return ratedPuzzlesPlayedToday < 3;
  };

  // Puzzle Rush Timers
  useEffect(() => {
    let timerInterval = null;
    if (activeTab === 'rush' && rushMode === 'playing' && rushTimeLimit > 0) {
      timerInterval = setInterval(() => {
        setRushTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            handleRushGameOver('Time ran out!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [activeTab, rushMode, rushTimeLimit]);

  // Puzzle Battles Timers
  useEffect(() => {
    let timerInterval = null;
    if (activeTab === 'battles' && battleState === 'playing') {
      timerInterval = setInterval(() => {
        setBattleTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [activeTab, battleState]);

  // SOCKETS REALTIME PUZZLE BATTLES LISTENER EFFECT
  useEffect(() => {
    if (!socket) return;

    const handleBattleStart = ({ roomCode, opponentName, opponentRating, puzzles, duration }) => {
      console.log('Puzzle Battle started vs', opponentName);
      setBattleRoomCode(roomCode);
      setBattleOpponentName(opponentName);
      setBattleOpponentRating(opponentRating);
      setBattlePuzzles(puzzles);
      setBattleActiveIndex(0);
      setBattlePlayerScore(0);
      setBattleOpponentScore(0);
      setBattleOpponentIndex(0);
      setBattleOpponentStrikes(0);
      setBattleTimeRemaining(duration / 1000);
      setBattleState('playing');
      showToast(`Battle matched! Playing vs ${opponentName}`, 'info');
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    };

    const handleOpponentProgress = ({ score, puzzleIndex, wrongAttempts }) => {
      setBattleOpponentScore(score);
      setBattleOpponentIndex(puzzleIndex);
      setBattleOpponentStrikes(wrongAttempts);
    };

    const handleBattleOver = ({ result, reason, finalScore, opponentScore }) => {
      setBattleState('gameover');
      setBattleOutcome({ result, reason });
      if (result === 'win') {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        showToast('VICTORY! You won the Puzzle Battle!', 'success');
      } else if (result === 'loss') {
        showToast('Defeat! Opponent won the battle.', 'warning');
      } else {
        showToast('Battle drawn!', 'info');
      }
    };

    const handleErrorMsg = (msg) => {
      showToast(msg, 'warning');
      setBattleState('lobby');
    };

    const handleQueueJoined = () => {
      setBattleState('queue');
      showToast('Searching for an opponent...', 'info');
    };

    const handleQueueLeft = () => {
      setBattleState('lobby');
    };

    socket.on('puzzle-battle-start', handleBattleStart);
    socket.on('puzzle-opponent-progress', handleOpponentProgress);
    socket.on('puzzle-battle-over', handleBattleOver);
    socket.on('error-msg', handleErrorMsg);
    socket.on('puzzle-queue-joined', handleQueueJoined);
    socket.on('puzzle-queue-left', handleQueueLeft);

    return () => {
      socket.off('puzzle-battle-start', handleBattleStart);
      socket.off('puzzle-opponent-progress', handleOpponentProgress);
      socket.off('puzzle-battle-over', handleBattleOver);
      socket.off('error-msg', handleErrorMsg);
      socket.off('puzzle-queue-joined', handleQueueJoined);
      socket.off('puzzle-queue-left', handleQueueLeft);
    };
  }, [socket, showToast]);

  // Click on a square helper
  const onSquare = (sq) => {
    if (showSuccessModal || (activeTab === 'rush' && rushMode !== 'playing') || (activeTab === 'battles' && battleState !== 'playing')) return;

    const piece = chess.get(sq);

    // Click same square deselects
    if (selected === sq) {
      setSelected(null);
      setLegal([]);
      return;
    }

    if (selected) {
      const moves = chess.moves({ square: selected, verbose: true });
      const hit = moves.find(m => m.to === sq);

      if (hit) {
        // Handle pawn promotions
        const originPiece = chess.get(selected);
        if (originPiece?.type === 'p' && (sq[1] === '8' || sq[1] === '1')) {
          setShowPromotionPending({ from: selected, to: sq });
          return;
        }
        executeAppliedMove(selected, sq);
      } else {
        // Selection switch
        if (piece && piece.color === chess.turn()) {
          setSelected(sq);
          const legalDests = chess.moves({ square: sq, verbose: true }).map(m => m.to);
          setLegal(legalDests);
        } else {
          setSelected(null);
          setLegal([]);
        }
      }
    } else {
      // Select source piece
      if (piece && piece.color === chess.turn()) {
        setSelected(sq);
        const legalDests = chess.moves({ square: sq, verbose: true }).map(m => m.to);
        setLegal(legalDests);
      }
    }
  };

  const handlePromotePiece = (choice) => {
    if (showPromotionPending) {
      executeAppliedMove(showPromotionPending.from, showPromotionPending.to, choice);
      setShowPromotionPending(null);
    }
  };

  // Perform Move evaluation
  const executeAppliedMove = (from, to, promotion = '') => {
    const solutionMoves = activePuzzle.moves;
    const expected = solutionMoves[moveIdx];
    if (!expected) return;

    const playerUCI = from + to + (promotion || '');
    const cleanExpected = expected.replace(/\+|#/g, '').toLowerCase();

    // Check if player's move matches UCI expected move or SAN fallback
    let isCorrect = playerUCI.toLowerCase() === cleanExpected.slice(0, 4 + (promotion ? 1 : 0));
    
    // Fallback SAN check
    if (!isCorrect) {
      try {
        const testChess = initGame(chess.fen());
        const applied = testChess.move({ from, to, promotion: promotion || 'q' });
        if (applied) {
          const appliedSAN = applied.san.replace(/\+|#/g, '').toLowerCase();
          if (appliedSAN === cleanExpected) {
            isCorrect = true;
          }
        }
      } catch (e) {
        // error
      }
    }

    if (isCorrect) {
      // CORRECT MOVE!
      const finalPromo = expected.length === 5 ? expected[4] : (promotion || 'q');
      const testChess = initGame(chess.fen());
      const cellPiece = testChess.get(to);
      
      try {
        testChess.move({ from, to, promotion: finalPromo });
      } catch (e) {
        console.warn('Move check failed:', e);
      }

      playSound(cellPiece ? 'capture' : 'move');
      setFlashClass('correct-flash');
      setTimeout(() => setFlashClass(''), 400);

      setChess(initGame(testChess.fen()));
      setSelected(null);
      setLegal([]);
      const nextIdx = moveIdx + 1;
      setMoveIdx(nextIdx);

      if (nextIdx >= solutionMoves.length) {
        // Puzzle fully solved!
        handleSinglePuzzleSolved();
      } else {
        // Opponent auto-reply
        const replyMove = solutionMoves[nextIdx];
        setTimeout(() => {
          const opponentChess = initGame(testChess.fen());
          const opCell = opponentChess.get(replyMove.substring(2, 4));

          try {
            if (replyMove.length >= 4 && /^[a-h][1-8][a-h][1-8]/i.test(replyMove)) {
              opponentChess.move({
                from: replyMove.substring(0, 2),
                to: replyMove.substring(2, 4),
                promotion: replyMove.length === 5 ? replyMove[4] : undefined
              });
            } else {
              opponentChess.move(replyMove);
            }
          } catch (err) {
            console.warn('Opponent auto-reply error:', err);
          }

          playSound(opCell ? 'capture' : 'move');
          setChess(initGame(opponentChess.fen()));
          setMoveIdx(nextIdx + 1);

          // If opponent finished the deck
          if (nextIdx + 1 >= solutionMoves.length) {
            handleSinglePuzzleSolved();
          }
        }, 600);
      }
    } else {
      // WRONG MOVE!
      playSound('wrong');
      setFlashClass('wrong-flash');
      setWrongAttempts(prev => prev + 1);
      showToast('Incorrect move. Try again!', 'warning', 1200);

      setTimeout(() => {
        setFlashClass('');
        setSelected(null);
        setLegal([]);
      }, 700);

      // Handle Failure outcomes for timed sub-modes
      if (activeTab === 'rush' && rushMode === 'playing') {
        const nextStrikes = rushStrikes + 1;
        setRushStrikes(nextStrikes);
        if (nextStrikes >= 3) {
          handleRushGameOver('Accumulated 3 strikes!');
        } else {
          // Push to next puzzle in Rush immediately
          setTimeout(() => {
            if (currentRushIndex < rushPuzzlesList.length - 1) {
              setCurrentRushIndex(prev => prev + 1);
            } else {
              handleRushGameOver('All puzzles attempted!');
            }
          }, 800);
        }
      } else if (activeTab === 'battles' && battleState === 'playing') {
        // Sockets notify battle failed
        if (socket && battleRoomCode) {
          socket.emit('puzzle-failed', {
            roomCode: battleRoomCode,
            puzzleIndex: battleActiveIndex
          });
        }
        
        // Puzzle Battles: incorrect solves skip to next puzzle immediately
        setTimeout(() => {
          if (battleActiveIndex < battlePuzzles.length - 1) {
            setBattleActiveIndex(prev => prev + 1);
          } else {
            // End battle if deck exhausted
            showToast('All Battle puzzles completed!', 'info');
          }
        }, 800);
      }
    }
  };

  // Solved details
  const handleSinglePuzzleSolved = () => {
    playSound('correct');
    
    // Tab 1: Daily Puzzle solved logic
    if (activeTab === 'daily') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setShowSuccessModal(true);
      
      const todayStr = new Date().toISOString().split('T')[0];
      if (lastSolvedDailyDate !== todayStr) {
        setLastSolvedDailyDate(todayStr);
        setDailyStreak(prev => prev + 1);
        
        const updatedCal = { ...solvedDailyCalendar, [todayStr]: true };
        setSolvedDailyCalendar(updatedCal);
        
        showToast('Daily Puzzle solved successfully! 🔥 Streak incremented.', 'success');
      } else {
        showToast('Daily Puzzle solved! (Already recorded today)', 'success');
      }
    }
    
    // Tab 2: Rated puzzle solved
    else if (activeTab === 'rated') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setShowSuccessModal(true);
      
      // Calculate Elo increment
      let scoreGained = 15;
      if (hintsUsed > 0) scoreGained -= 5 * hintsUsed;
      if (wrongAttempts > 0) scoreGained -= 3 * wrongAttempts;
      scoreGained = Math.max(2, scoreGained);

      setLocalPuzzleRating(prev => prev + scoreGained);
      setRatedPuzzlesPlayedToday(prev => prev + 1);
      
      setRatedSessionCorrect(prev => prev + 1);
      setRatedSessionTotal(prev => prev + 1);

      // Async write to Supabase if logged in
      if (currentUser) {
        supabase
          .from('puzzle_ratings')
          .update({ rating: localPuzzleRating + scoreGained })
          .eq('user_id', currentUser.id)
          .catch(e => console.warn('Could not update ELO in DB:', e));

        supabase
          .from('puzzle_attempts')
          .insert({
            user_id: currentUser.id,
            puzzle_id: activePuzzle.id,
            solved: true,
            time_taken: 10 // mock time
          })
          .catch(e => console.warn('Could not save attempt in DB:', e));
      }

      showToast(`Puzzle solved successfully! ELO +${scoreGained}`, 'success');
    }
    
    // Tab 3: Puzzle Rush correct solve
    else if (activeTab === 'rush' && rushMode === 'playing') {
      confetti({ particleCount: 30, spread: 30, origin: { y: 0.7 } });
      setRushScore(prev => prev + 1);
      
      setTimeout(() => {
        if (currentRushIndex < rushPuzzlesList.length - 1) {
          setCurrentRushIndex(prev => prev + 1);
        } else {
          handleRushGameOver('Completed all seeded puzzles!');
        }
      }, 500);
    }

    // Tab 4: Puzzle Battles correct solve
    else if (activeTab === 'battles' && battleState === 'playing') {
      const newScore = battlePlayerScore + 1;
      setBattlePlayerScore(newScore);

      // Relay via sockets
      if (socket && battleRoomCode) {
        socket.emit('puzzle-solved', {
          roomCode: battleRoomCode,
          score: newScore,
          puzzleIndex: battleActiveIndex + 1
        });
      }

      // Check if all 15 solved
      if (newScore >= 15) {
        showToast('All 15 puzzles solved! Awaiting battle confirmation.', 'success');
      } else {
        setTimeout(() => {
          if (battleActiveIndex < battlePuzzles.length - 1) {
            setBattleActiveIndex(prev => prev + 1);
          }
        }, 500);
      }
    }
  };

  // Rated mode skip / wrong logging
  const handleRatedPuzzleFailed = () => {
    if (activeTab !== 'rated') return;
    
    const penalty = 12;
    setLocalPuzzleRating(prev => Math.max(100, prev - penalty));
    setRatedPuzzlesPlayedToday(prev => prev + 1);
    setRatedSessionTotal(prev => prev + 1);

    if (currentUser) {
      supabase
        .from('puzzle_ratings')
        .update({ rating: Math.max(100, localPuzzleRating - penalty) })
        .eq('user_id', currentUser.id)
        .catch(e => console.warn(e));

      supabase
        .from('puzzle_attempts')
        .insert({
          user_id: currentUser.id,
          puzzle_id: activePuzzle.id,
          solved: false,
          time_taken: 10
        })
        .catch(e => console.warn(e));
    }

    showToast(`Skipped! ELO -${penalty}`, 'info');
    
    // Jump to next rated puzzle
    if (currentDbPuzzleIndex < dbPuzzlesList.length - 1) {
      setCurrentDbPuzzleIndex(prev => prev + 1);
    } else {
      fetchDbPuzzles();
    }
  };

  // Dynamic hints generator
  const handleHint = () => {
    if (hintsUsed >= 2 || showSuccessModal) return;
    const nextHint = hintsUsed + 1;
    setHintsUsed(nextHint);

    const solutionMoves = activePuzzle.moves;
    const expected = solutionMoves[moveIdx];
    if (!expected) return;

    const testChess = new Chess(chess.fen());
    const moves = testChess.moves({ verbose: true });
    
    const cleanExpected = expected.toLowerCase().replace(/\+|#/g, '');
    const target = moves.find(m => {
      const coord = m.from + m.to + (m.promotion || '');
      const san = m.san.toLowerCase().replace(/\+|#/g, '');
      return coord === cleanExpected.slice(0, 4) || san === cleanExpected;
    });

    if (target) {
      if (nextHint === 1) {
        setHighlights({ piece: target.from });
        showToast('Hint: The active piece is highlighted blue!', 'info');
      } else if (nextHint === 2) {
        setHighlights({ from: target.from, to: target.to });
        showToast('Hint: Complete destination path highlighted green!', 'info');
      }
    }
  };

  // Puzzle Rush controls
  const startPuzzleRush = (time) => {
    if (!isPremiumUser && time === 0) {
      showToast('Survival mode is a Premium feature! Upgrade to play.', 'warning');
      return;
    }

    setRushTimeLimit(time);
    setRushTimeRemaining(time);
    setRushScore(0);
    setRushStrikes(0);
    setCurrentRushIndex(0);
    
    // Generate a progressive difficulty scale of 30 puzzles: ELO 700 -> 1800
    const pool = [...puzzlesData];
    // Shuffle & repeat pool items scaling ELOs
    const list = [];
    for (let i = 0; i < 35; i++) {
      const targetRating = 700 + i * 40;
      // Find closest rating in pool
      const closest = pool.sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating))[0];
      list.push({ ...closest, id: `rush_${i}_${closest.id}` });
    }
    
    setRushPuzzlesList(list);
    setRushMode('playing');
    showToast('Puzzle Rush run started! Good luck!', 'success');
  };

  const handleRushGameOver = (reason) => {
    setRushMode('gameover');
    playSound('wrong');

    // confetti check highscore
    let isNewHigh = false;
    if (rushTimeLimit === 180) {
      if (rushScore > rushHighScore3m) {
        setRushHighScore3m(rushScore);
        isNewHigh = true;
      }
    } else if (rushTimeLimit === 300) {
      if (rushScore > rushHighScore5m) {
        setRushHighScore5m(rushScore);
        isNewHigh = true;
      }
    } else {
      if (rushScore > rushHighScoreSurvival) {
        setRushHighScoreSurvival(rushScore);
        isNewHigh = true;
      }
    }

    if (isNewHigh) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      showToast('🌟 NEW HIGH SCORE CRUSHED!', 'success');
    } else {
      showToast(`Game Over: ${reason}`, 'info');
    }
  };

  // PUZZLE BATTLES REALTIME SOCKET ACTIONS
  const joinBattleQueue = () => {
    if (!socket) {
      showToast('Socket server offline. Matchmaking failed.', 'warning');
      return;
    }
    
    socket.emit('join-puzzle-queue', {
      userId: currentUser?.id || 'guest_' + Math.random().toString(36).substr(2, 6),
      username: userData?.username || 'Guest_' + Math.floor(Math.random() * 900 + 100),
      rating: localPuzzleRating
    });
  };

  const cancelBattleQueue = () => {
    if (socket) {
      socket.emit('leave-puzzle-queue');
    }
  };

  const leaveBattleMatch = () => {
    if (socket && battleRoomCode) {
      socket.emit('leave-puzzle-battle', { roomCode: battleRoomCode });
    }
    setBattleState('lobby');
  };

  // Bookmark toggling
  const isBookmarked = bookmarked.includes(activePuzzle.id);
  const toggleBookmark = () => {
    if (isBookmarked) {
      setBookmarked(bookmarked.filter(id => id !== activePuzzle.id));
      showToast('Removed from bookmarks.', 'info');
    } else {
      setBookmarked([...bookmarked, activePuzzle.id]);
      showToast('Puzzle bookmarked! 🔖', 'success');
    }
  };

  // Calendar dates generation (last 30 days)
  const calendarDays = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayNum = d.getDate();
      list.push({ dateStr, dayNum, solved: !!solvedDailyCalendar[dateStr] });
    }
    return list;
  }, [solvedDailyCalendar]);

  return (
    <PageShell>
      <div className="puzzles-page-wrapper">
        
        {/* TOP STATUS BAR */}
        <div className="puzzles-header">
          <div className="puzzles-header-left">
            <button 
              type="button" 
              onClick={() => navigate('/game')} 
              className="puzzles-back-btn font-cinzel"
            >
              ← Back
            </button>
            <div className="puzzles-rating-display animate-pulse-glow">
              <Trophy size={16} className="gold-trophy-icon" />
              <span>Puzzle Elo: <strong className="gold-text font-cinzel">{localPuzzleRating}</strong></span>
            </div>
            {isPremiumUser && (
              <div className="premium-badge-pill">
                <Crown size={12} className="premium-crown" />
                <span>PREMIUM</span>
              </div>
            )}
          </div>
          
          {/* Sounds + Mock Premium Upgrader */}
          <div className="puzzles-header-right">
            <button 
              className="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Disable Sounds' : 'Enable Sounds'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button 
              className={`premium-mock-upgrade-btn ${isPremiumUser ? 'active' : ''}`}
              onClick={() => {
                setIsPremiumMock(!isPremiumMock);
                showToast(isPremiumMock ? 'Mock Premium subscription cancelled.' : 'Premium unlocked! Mock mode enabled. 🔥', 'success');
              }}
            >
              <Crown size={14} />
              <span>{isPremiumUser ? 'Premium Active' : 'Test Premium'}</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION PORTAL */}
        <div className="puzzles-navigation-card">
          {['daily', 'rated', 'rush', 'battles'].map(tab => {
            const labels = {
              daily: { title: 'Daily Puzzle', icon: <Calendar size={15} /> },
              rated: { title: 'Rated Puzzles', icon: <Trophy size={15} /> },
              rush: { title: 'Puzzle Rush', icon: <Zap size={15} /> },
              battles: { title: '1v1 Battles', icon: <Swords size={15} /> }
            };
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // Trigger DB fetch for Rated if clicked
                  if (tab === 'rated') fetchDbPuzzles();
                }}
                className={`puzzle-nav-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {labels[tab].icon}
                <span>{labels[tab].title}</span>
              </button>
            );
          })}
        </div>

        {/* GRID MAIN CONTENT */}
        <div className="puzzles-main-layout">
          
          {/* LEFT CHESSBOARD BOX */}
          <div className="puzzle-board-column">
            
            {/* TIMERS / MATCHMAKING PROGRESS BOXES */}
            {activeTab === 'rush' && rushMode === 'playing' && (
              <div className="rush-hud-banner">
                <div className="rush-hud-metric">
                  <Zap size={16} className="gold-text" />
                  <span>Solved: <strong className="gold-text font-cinzel">{rushScore}</strong></span>
                </div>
                <div className="rush-hud-metric">
                  <Flame size={16} className="strike-red" />
                  <span>Strikes: <strong className="strike-red">{'❌'.repeat(rushStrikes) || 'None'}</strong></span>
                </div>
                {rushTimeLimit > 0 && (
                  <div className="rush-hud-metric clock-glow">
                    <span>⏱️ {Math.floor(rushTimeRemaining / 60)}:{(rushTimeRemaining % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'battles' && battleState === 'playing' && (
              <div className="battle-hud-banner">
                <div className="battle-tracker-row">
                  <div className="battle-track-player">
                    <span className="font-cinzel">YOU:</span>
                    <strong className="gold-text">{battlePlayerScore} solves</strong>
                    <div className="battle-track-progress-bar">
                      <div className="battle-track-fill" style={{ width: `${(battlePlayerScore / 15) * 100}%` }} />
                    </div>
                  </div>
                  <div className="battle-versus-circle font-cinzel">VS</div>
                  <div className="battle-track-player">
                    <span className="font-cinzel">{battleOpponentName}:</span>
                    <strong className="opponent-text">{battleOpponentScore} solves</strong>
                    <div className="battle-track-progress-bar opp">
                      <div className="battle-track-fill opp" style={{ width: `${(battleOpponentScore / 15) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="battle-clock-footer clock-glow">
                  <span>Battle Timer: {Math.floor(battleTimeRemaining / 60)}:{(battleTimeRemaining % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            )}

            {/* Turn indicators */}
            {!(activeTab === 'rush' && rushMode !== 'playing') && !(activeTab === 'battles' && battleState !== 'playing') && (
              <div className="puzzle-turn-banner font-cinzel">
                {chess.turn() === 'w' ? "White to move" : "Black to move"}
              </div>
            )}
            
            {/* The Interactive Board */}
            <PuzzleBoard 
              chess={chess}
              selected={selected}
              legal={legal}
              onSquare={onSquare}
              highlights={highlights}
              flashClass={flashClass}
              isFlipped={isFlipped}
            />

            {/* Pawn Promotion Modal Overlay */}
            {showPromotionPending && (
              <div className="puzzle-promo-overlay">
                <div className="puzzle-promo-card font-cinzel">
                  <h4>Choose Promotion</h4>
                  <div className="puzzle-promo-options">
                    {['q', 'r', 'b', 'n'].map(p => (
                      <button key={p} className="promo-btn" onClick={() => handlePromotePiece(p)}>
                        {p === 'q' && '♛ Queen'}
                        {p === 'r' && '♜ Rook'}
                        {p === 'b' && '♝ Bishop'}
                        {p === 'n' && '♞ Knight'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE DETAILS / CONTROLS PANEL */}
          <div className="puzzle-controls-panel">
            
            {/* TAB 1: DAILY PUZZLE SIDE DETAILS */}
            {activeTab === 'daily' && (
              <div className="sub-tab-card animate-slide-up">
                <div className="details-header-card">
                  <div className="fire-streak-tag">
                    <Flame size={16} fill="#e2b04a" className="gold-text" />
                    <span>🔥 Streak: <strong className="gold-text">{dailyStreak} Days</strong></span>
                  </div>
                  <h3 className="font-cinzel">Daily Challenge</h3>
                  <p className="puzzle-summary-desc">Coordinate tactical chess puzzles updated globally every 24 hours. Solve daily to preserve your fire streak calendar!</p>
                </div>

                {/* Calendar 30-Day Checkmarks */}
                <div className="calendar-card-box">
                  <div className="calendar-header-row font-cinzel">
                    <Calendar size={13} />
                    <span>Last 30 Days Calendar Tracker</span>
                  </div>
                  <div className="calendar-grid-tracker">
                    {calendarDays.map((day, idx) => (
                      <div 
                        key={idx} 
                        className={`calendar-day-circle ${day.solved ? 'solved' : ''}`}
                        title={day.dateStr}
                      >
                        {day.solved ? '✓' : day.dayNum}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="puzzle-buttons-grid">
                  <button type="button" onClick={handleHint} disabled={hintsUsed >= 2} className="puzzle-action-btn hint-btn">
                    <HelpCircle size={16} />
                    <span>{hintsUsed === 0 ? 'Show Hint' : hintsUsed === 1 ? 'Show Target square' : 'No hints left'}</span>
                  </button>
                  <button type="button" onClick={resetPuzzleSolving} className="puzzle-action-btn retry-btn">
                    <RotateCcw size={16} />
                    <span>Reset Board</span>
                  </button>
                  <button type="button" onClick={toggleBookmark} className={`puzzle-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}>
                    <Bookmark size={16} fill={isBookmarked ? '#e2b04a' : 'none'} />
                    <span>Bookmark</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: RATED PUZZLES SIDE DETAILS */}
            {activeTab === 'rated' && (
              <div className="sub-tab-card animate-slide-up">
                <div className="details-header-card">
                  <div className="session-accuracy-badge font-cinzel">
                    <span>Accuracy: {ratedSessionTotal > 0 ? Math.round((ratedSessionCorrect / ratedSessionTotal) * 100) : 100}%</span>
                  </div>
                  <h3 className="font-cinzel">Rated Tactical Drill</h3>
                  <div className="rated-meta-tag font-cinzel">Puzzle Rating: {activePuzzle.rating} ELO</div>
                </div>

                {/* Gated Limits Tracker card */}
                <div className="daily-limits-tracker-card">
                  <div className="limits-header">
                    <span>Rated Puzzles remaining:</span>
                    <strong className={checkRatedPuzzlesAvailable() ? 'gold-text' : 'strike-red'}>
                      {isPremiumUser ? '∞ (Unlimited)' : `${3 - ratedPuzzlesPlayedToday} / 3`}
                    </strong>
                  </div>
                  {!isPremiumUser && (
                    <div className="upgrade-teaser-row font-cinzel">
                      <Lock size={12} />
                      <span>Guests limited to 3/day. Test Premium above for unlimited access.</span>
                    </div>
                  )}
                </div>

                {/* Categories filtering list */}
                <div className="categories-drill-card">
                  <span>Themes:</span>
                  <div className="categories-badges-row">
                    {activePuzzle.themes.map(t => (
                      <span key={t} className="theme-badge">#{t}</span>
                    ))}
                  </div>
                </div>

                <div className="puzzle-buttons-grid">
                  <button 
                    type="button" 
                    onClick={handleHint} 
                    disabled={hintsUsed >= 2 || !checkRatedPuzzlesAvailable()} 
                    className="puzzle-action-btn hint-btn"
                  >
                    <HelpCircle size={16} />
                    <span>{hintsUsed === 0 ? 'Show Hint' : hintsUsed === 1 ? 'Show Target' : 'No hints left'}</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleRatedPuzzleFailed} 
                    disabled={!checkRatedPuzzlesAvailable()} 
                    className="puzzle-action-btn skip-btn"
                  >
                    <ArrowRight size={16} />
                    <span>Skip / Pass (-12 Elo)</span>
                  </button>
                  <button type="button" onClick={toggleBookmark} className={`puzzle-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}>
                    <Bookmark size={16} fill={isBookmarked ? '#e2b04a' : 'none'} />
                    <span>Bookmark</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PUZZLE RUSH SIDE DETAILS */}
            {activeTab === 'rush' && (
              <div className="sub-tab-card animate-slide-up">
                
                {/* LOBBY INTERFACE */}
                {rushMode === 'lobby' && (
                  <div className="rush-lobby-portal font-cinzel">
                    <h3 className="lobby-heading">Puzzle Rush Mode</h3>
                    <p className="lobby-desc font-sans">Race against time or build your tactical stamina without clocks! Correct solves increase complexity, while 3 strikes end the run.</p>
                    
                    {/* High scores grid */}
                    <div className="rush-high-scores-box font-sans">
                      <div className="high-score-item">
                        <span>⚡ 3-Min High Score:</span>
                        <strong>{rushHighScore3m}</strong>
                      </div>
                      <div className="high-score-item">
                        <span>⚡ 5-Min High Score:</span>
                        <strong>{rushHighScore5m}</strong>
                      </div>
                      <div className="high-score-item">
                        <span>🏆 Survival High Score:</span>
                        <strong>{rushHighScoreSurvival}</strong>
                      </div>
                    </div>

                    <div className="rush-mode-buttons-col">
                      <button className="rush-play-btn start-3m" onClick={() => startPuzzleRush(180)}>
                        <Play size={14} fill="#100f20" />
                        <span>Start 3-Minute Rush</span>
                      </button>
                      <button className="rush-play-btn start-5m" onClick={() => startPuzzleRush(300)}>
                        <Play size={14} fill="#100f20" />
                        <span>Start 5-Minute Rush</span>
                      </button>
                      <button className="rush-play-btn start-survival" onClick={() => startPuzzleRush(0)}>
                        <Crown size={14} />
                        <span>Start Survival (Premium)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* RUNNING GAME INTERFACE */}
                {rushMode === 'playing' && (
                  <div className="rush-running-portal">
                    <div className="rush-run-title font-cinzel">
                      <h4>RUNNING PUZZLE RUSH</h4>
                      <p>Solve quickly! Complexity rating: {activePuzzle.rating} ELO</p>
                    </div>
                    <div className="puzzle-buttons-grid">
                      <button type="button" onClick={handleHint} disabled={hintsUsed >= 2} className="puzzle-action-btn hint-btn">
                        <HelpCircle size={16} />
                        <span>Hint</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (currentRushIndex < rushPuzzlesList.length - 1) {
                            setRushStrikes(prev => prev + 1);
                            setCurrentRushIndex(prev => prev + 1);
                          } else {
                            handleRushGameOver('Deck exhausted.');
                          }
                        }} 
                        className="puzzle-action-btn skip-btn"
                      >
                        <ArrowRight size={16} />
                        <span>Skip (Strike!)</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleRushGameOver('Resigned')} 
                        className="puzzle-action-btn resign-btn"
                      >
                        <VolumeX size={16} />
                        <span>End Session</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* GAME OVER CARD INTERFACE */}
                {rushMode === 'gameover' && (
                  <div className="rush-gameover-portal font-cinzel">
                    <div className="gameover-skull-icon">💀</div>
                    <h3>Rush Completed!</h3>
                    <div className="gameover-score-badge">
                      <span>Solved:</span>
                      <strong>{rushScore}</strong>
                    </div>
                    <button className="rush-retry-btn" onClick={() => setRushMode('lobby')}>
                      <RotateCcw size={14} />
                      <span>Back to Rush Lobby</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PUZZLE BATTLES SIDE DETAILS */}
            {activeTab === 'battles' && (
              <div className="sub-tab-card animate-slide-up">
                
                {/* LOBBY PORTAL */}
                {battleState === 'lobby' && (
                  <div className="battle-lobby-portal font-cinzel">
                    <h3 className="lobby-heading">1v1 Puzzle Battle Arena</h3>
                    <p className="lobby-desc font-sans">Socket-io matched multiplayer puzzles race! Solve 15 identical tactical puzzles faster than your opponent. Highest accuracy score wins ELO glory.</p>
                    
                    <button className="battle-lobby-find-btn" onClick={joinBattleQueue}>
                      <Swords size={16} />
                      <span>Find a 1v1 Puzzle Battle</span>
                    </button>
                  </div>
                )}

                {/* MATCHMAKING QUEUE SCANNER */}
                {battleState === 'queue' && (
                  <div className="battle-queue-portal font-cinzel">
                    <div className="battle-queue-scanner-glow">
                      <div className="scanner-line"></div>
                    </div>
                    <h4>MATCHMAKING MATCH IN PROGRESS</h4>
                    <p className="font-sans">Scanning socket network lobby for players with similar ELO...</p>
                    <button className="battle-queue-cancel-btn" onClick={cancelBattleQueue}>
                      Cancel Search
                    </button>
                  </div>
                )}

                {/* ACTIVE PLAYING INTERFACE */}
                {battleState === 'playing' && (
                  <div className="battle-playing-portal font-cinzel">
                    <h4>PUZZLE BATTLE ACTIVE</h4>
                    <p className="lobby-desc font-sans">Active Battle Deck Index: {battleActiveIndex + 1} / 15</p>
                    
                    <div className="battle-strikes-row font-sans">
                      <span>Opponent Strikes:</span>
                      <strong className="strike-red">{'❌'.repeat(battleOpponentStrikes) || 'None'}</strong>
                    </div>

                    <div className="puzzle-buttons-grid">
                      <button type="button" onClick={handleHint} disabled={hintsUsed >= 2} className="puzzle-action-btn hint-btn">
                        <HelpCircle size={16} />
                        <span>Hint</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (socket && battleRoomCode) {
                            socket.emit('puzzle-failed', { roomCode: battleRoomCode, puzzleIndex: battleActiveIndex });
                          }
                          if (battleActiveIndex < battlePuzzles.length - 1) {
                            setBattleActiveIndex(prev => prev + 1);
                          }
                        }} 
                        className="puzzle-action-btn skip-btn"
                      >
                        <ArrowRight size={16} />
                        <span>Skip Puzzle</span>
                      </button>
                      <button className="puzzle-action-btn resign-btn" onClick={leaveBattleMatch}>
                        <Lock size={16} />
                        <span>Forfeit Battle</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* GAME OVER OUTCOMES */}
                {battleState === 'gameover' && (
                  <div className="battle-gameover-portal font-cinzel">
                    <div className={`battle-outcome-tag ${battleOutcome.result}`}>
                      {battleOutcome.result.toUpperCase()}
                    </div>
                    <p className="font-sans">Reason: {battleOutcome.reason === 'all-solved' ? 'All solved!' : battleOutcome.reason === 'opponent-left' ? 'Opponent resigned.' : 'Time limit expired.'}</p>
                    
                    <div className="battle-scores-card font-sans">
                      <div className="score-row">
                        <span>Your score:</span>
                        <strong>{battlePlayerScore} / 15</strong>
                      </div>
                      <div className="score-row">
                        <span>Opponent score:</span>
                        <strong>{battleOpponentScore} / 15</strong>
                      </div>
                    </div>

                    <button className="battle-back-lobby-btn" onClick={() => setBattleState('lobby')}>
                      Back to Battles Arena
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

        {/* SOLUTIONS/SUCCESS POPUP MODAL */}
        {showSuccessModal && (
          <div className="puzzle-success-overlay">
            <div className="puzzle-success-card">
              <div className="success-checkmark-circle">✓</div>
              <h2 className="success-title font-cinzel">CHALLENGE SOLVED!</h2>
              
              <div className="success-info-box">
                <p><strong>Themes:</strong> {activePuzzle.themes.join(', ')}</p>
                <p><strong>Rating Deviation:</strong> {activePuzzle.rating} ELO complexity</p>
                <p><strong>Correct Solution:</strong> {activePuzzle.moves.slice(1).join(' → ')}</p>
              </div>

              <div className="success-actions-row">
                <button className="success-btn retry" onClick={resetPuzzleSolving}>
                  Play Again
                </button>
                {activeTab === 'rated' ? (
                  <button 
                    className="success-btn next font-cinzel"
                    onClick={() => {
                      if (currentDbPuzzleIndex < dbPuzzlesList.length - 1) {
                        setCurrentDbPuzzleIndex(prev => prev + 1);
                      } else {
                        fetchDbPuzzles();
                      }
                      setShowSuccessModal(false);
                    }}
                    disabled={!checkRatedPuzzlesAvailable()}
                  >
                    Next Rated Drill
                  </button>
                ) : (
                  <button className="success-btn next font-cinzel" onClick={() => setShowSuccessModal(false)}>
                    Close Solution
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
