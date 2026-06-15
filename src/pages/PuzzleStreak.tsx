import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ChessBoard from '../components/ChessBoard';
import { usePuzzle, Puzzle } from '../hooks/usePuzzle';
import { supabase } from '../services/supabase';
import { useToast } from '../hooks/useToast';
import { Award, Zap, RefreshCw, Share2, Trophy, Clock, XCircle, ArrowLeft } from 'lucide-react';
import offlinePuzzles from '../data/puzzles.json';

const CONFETTI_COLORS = ['#ff9e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#f5c518'];

export default function PuzzleStreak() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Streak states
  const [streakCount, setStreakCount] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingRating, setLoadingRating] = useState(true);

  // Active puzzle
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);
  const [bestMoveArrow, setBestMoveArrow] = useState<{ from: string; to: string } | null>(null);

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // Track puzzles solved in this streak to prevent repeats
  const playedIdsRef = useRef<string[]>([]);
  const scoreRef = useRef(0);

  // Glicko-2 values (not modified in streak, just for logging profile fallback if needed)
  const [userRating, setUserRating] = useState(1200);

  // Load user data & personal best streak
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data, error } = await supabase
            .from('puzzle_ratings')
            .select('streak_best, rating')
            .eq('user_id', user.id)
            .single();

          if (data && !error) {
            setPersonalBest(data.streak_best || 0);
            setUserRating(data.rating || 1200);
          }
        } else {
          // Guest
          const localBest = parseInt(localStorage.getItem('guest_streak_best') || '0', 10);
          setPersonalBest(localBest);
        }
      } catch (err) {
        console.error('Failed to load user streak data:', err);
      } finally {
        setLoadingRating(false);
      }
    };
    loadUserData();
  }, []);

  // Fetch puzzle matching a target rating
  const fetchPuzzleForRating = async (targetRating: number, excludeIds: string[]): Promise<Puzzle | null> => {
    try {
      const { data, error } = await supabase.rpc('get_puzzle_for_rating', {
        target_rating: Math.round(targetRating),
        exclude_ids: excludeIds
      });

      if (error || !data || data.length === 0) {
        return null;
      }
      return data[0] as Puzzle;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Main puzzle load triggers
  const loadNextStreakPuzzle = async () => {
    setLoadingPuzzle(true);
    setBestMoveArrow(null);

    const currentScore = scoreRef.current;
    const targetRating = 1000 + currentScore * 50;

    try {
      let nextPuzzle = await fetchPuzzleForRating(targetRating, playedIdsRef.current);

      if (!nextPuzzle) {
        // Find offline fallback closest to target rating
        const offline = offlinePuzzles.filter(p => !playedIdsRef.current.includes(p.id));
        if (offline.length > 0) {
          // Sort by rating distance
          offline.sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating));
          const chosen = offline[0];
          nextPuzzle = {
            id: chosen.id,
            fen: chosen.fen,
            moves: Array.isArray(chosen.moves) ? chosen.moves.join(' ') : chosen.moves,
            rating: chosen.rating,
            themes: chosen.themes || [],
          };
        } else {
          // Absolute fallback
          const chosen = offlinePuzzles[Math.floor(Math.random() * offlinePuzzles.length)];
          nextPuzzle = {
            id: chosen.id,
            fen: chosen.fen,
            moves: Array.isArray(chosen.moves) ? chosen.moves.join(' ') : chosen.moves,
            rating: chosen.rating,
            themes: chosen.themes || [],
          };
        }
      }

      setPuzzle(nextPuzzle);
      playedIdsRef.current.push(nextPuzzle.id);
    } catch (err) {
      console.error('Streak puzzle fetch error:', err);
    } finally {
      setLoadingPuzzle(false);
    }
  };

  // Start streak game
  const startStreakGame = () => {
    setStreakCount(0);
    scoreRef.current = 0;
    playedIdsRef.current = [];
    setIsNewBest(false);
    setTimerSeconds(0);
    setTimerRunning(true);
    loadNextStreakPuzzle();
  };

  // Load first puzzle on rating ready
  useEffect(() => {
    if (!loadingRating) {
      startStreakGame();
    }
  }, [loadingRating]);

  // Timer ticker
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  // Hook instance with maxAttempts: 1 (streak ends immediately on mistake)
  const {
    boardState,
    handleSquareClick,
    handlePromotion,
    status: currentStatus,
    flash,
  } = usePuzzle(puzzle, { maxAttempts: 1 });

  // Handle game solved/failed
  useEffect(() => {
    if (!puzzle) return;

    if (currentStatus === 'solved') {
      const nextScore = streakCount + 1;
      setStreakCount(nextScore);
      scoreRef.current = nextScore;
      showToast(`Correct! Current streak: ${nextScore}`, 'success');

      // Load next escalation puzzle after a short delay
      setTimeout(() => {
        loadNextStreakPuzzle();
      }, 800);
    } else if (currentStatus === 'failed') {
      // Streak ended!
      setTimerRunning(false);
      const finalScore = scoreRef.current;

      // Handle personal best check
      if (finalScore > personalBest) {
        setIsNewBest(true);
        setPersonalBest(finalScore);
        showToast(`New Personal Best! Solved ${finalScore} puzzles! 🎉`, 'success');

        // Update record
        if (userId) {
          supabase
            .from('puzzle_ratings')
            .update({ streak_best: finalScore })
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) console.error('Failed to save streak best:', error);
            });
        } else {
          localStorage.setItem('guest_streak_best', finalScore.toString());
        }
      } else {
        showToast(`Streak ended at ${finalScore} puzzles.`, 'info');
      }
    }
  }, [currentStatus]);

  // Format timer seconds: "MM:SS" or "H:MM:SS"
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  // Generate CSS confetti particles
  const confettiParticles = useMemo(() => {
    if (!isNewBest || currentStatus !== 'failed') return null;
    return Array.from({ length: 60 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 3;
      const duration = Math.random() * 2 + 2.5;
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const width = Math.random() * 6 + 6;
      const height = Math.random() * 12 + 12;

      return (
        <div
          key={i}
          className="pure-confetti-particle"
          style={{
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            backgroundColor: color,
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      );
    });
  }, [isNewBest, currentStatus]);

  // Share text
  const handleShareStreak = () => {
    const text = `I solved ${streakCount} puzzles in a row on ChessMaster! Beat my streak! 🔥 Play here: ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Streak share text copied! 📋', 'success');
    } else {
      showToast(text, 'info');
    }
  };

  return (
    <PageShell>
      <div className="streak-wrapper">
        <style>{`
          .streak-wrapper {
            background: radial-gradient(circle at 50% 30%, #171615, #080808);
            min-height: calc(100vh - 64px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: 'Outfit', 'Inter', sans-serif;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
          }

          .streak-container {
            width: 100%;
            max-width: 540px;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            box-sizing: border-box;
            z-index: 10;
          }

          /* Confetti falling keyframes */
          @keyframes confetti-fall {
            0% { transform: translateY(-30px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
          }

          .pure-confetti-particle {
            position: absolute;
            top: -20px;
            opacity: 0;
            z-index: 90;
            animation: confetti-fall 3.5s infinite linear;
            border-radius: 2px;
          }

          .header-nav {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .back-btn {
            background: transparent;
            border: none;
            color: #888888;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: color 0.2s;
          }
          .back-btn:hover {
            color: #ffffff;
          }

          .timer-badge {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
            color: #aaaaaa;
          }

          .streak-score-banner {
            text-align: center;
            margin: 10px 0;
          }

          .huge-score {
            font-size: 72px;
            font-weight: 900;
            line-height: 1;
            margin: 0;
            background: linear-gradient(135deg, #f59e0b, #d4af37);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
          }

          .difficulty-pill {
            margin-top: 8px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #eeeeee;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 700;
            display: inline-block;
          }

          .board-card-streak {
            width: 100%;
            aspect-ratio: 1;
            background: rgba(255, 255, 255, 0.01);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 8px;
            box-sizing: border-box;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);
            transition: transform 0.2s;
            position: relative;
          }

          /* Streak board flash card effects */
          .board-card-streak.flash-correct {
            animation: border-correct-flash 0.6s ease;
          }
          .board-card-streak.flash-wrong {
            animation: border-wrong-flash 0.4s ease, shake-card 0.4s ease;
          }

          @keyframes border-correct-flash {
            0% { border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55); }
            50% { border-color: #10b981; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5); }
            100% { border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55); }
          }

          @keyframes border-wrong-flash {
            0% { border-color: rgba(255, 255, 255, 0.08); }
            50% { border-color: #ef4444; box-shadow: 0 0 25px rgba(239, 68, 68, 0.6); }
            100% { border-color: rgba(255, 255, 255, 0.08); }
          }

          @keyframes shake-card {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }

          /* Game over Modal */
          .gameover-overlay {
            position: absolute;
            inset: 0;
            background: rgba(8, 8, 8, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 100;
            border-radius: 12px;
            animation: fade-in 0.3s ease-out forwards;
          }

          @keyframes fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          .gameover-card {
            background: #171615;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 32px 24px;
            width: 100%;
            max-width: 380px;
            text-align: center;
            box-shadow: 0 12px 32px rgba(0,0,0,0.6);
            display: flex;
            flex-direction: column;
            gap: 16px;
            transform: scale(0.9);
            animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }

          @keyframes scale-up {
            0% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }

          .overlay-score-title {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888888;
            font-weight: 800;
            margin: 0;
          }

          .overlay-score-val {
            font-size: 64px;
            font-weight: 900;
            color: #ef4444;
            line-height: 1;
            margin: 4px 0;
          }

          .personal-best-banner {
            background: rgba(245, 158, 11, 0.08);
            border: 1px solid rgba(245, 158, 11, 0.25);
            border-radius: 8px;
            padding: 8px;
            font-size: 13px;
            color: #f59e0b;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          .btn-gameover-primary {
            background: linear-gradient(135deg, #81b64c, #639035);
            color: #ffffff;
            font-weight: 700;
            height: 46px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(129,182,76,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .btn-gameover-primary:hover {
            background: linear-gradient(135deg, #95d05a, #73a73e);
            transform: translateY(-1px);
          }

          .btn-gameover-share {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
            font-weight: 700;
            height: 46px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .btn-gameover-share:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
          }
        `}</style>

        {/* Confetti container if personal best achieved */}
        {confettiParticles}

        <div className="streak-container">
          {/* Header row */}
          <div className="header-nav">
            <button className="back-btn" onClick={() => navigate('/puzzles')}>
              <ArrowLeft size={16} /> Dashboard
            </button>
            <div className="timer-badge">
              <Clock size={14} /> {formatTime(timerSeconds)}
            </div>
          </div>

          {/* Large streak banner */}
          <div className="streak-score-banner">
            <h1 className="huge-score">{streakCount}</h1>
            {puzzle && (
              <span className="difficulty-pill">
                Puzzle {streakCount + 1} · 🎯 {puzzle.rating} ELO
              </span>
            )}
          </div>

          {/* Board Container */}
          <div className={`board-card-streak flash-${flash}`}>
            {loadingPuzzle || !puzzle ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #f59e0b', borderRadius: '50%', width: '48px', height: '48px', animation: 'confetti-fall 1.5s infinite linear' }} />
                <span style={{ fontSize: '13px', color: '#888' }}>Escalating Difficulty...</span>
              </div>
            ) : (
              <ChessBoard
                customState={boardState}
                customHandleSquareClick={handleSquareClick}
                customHandlePromotion={handlePromotion}
                bestMoveArrow={bestMoveArrow}
              />
            )}

            {/* Streak Ended Overlay */}
            {currentStatus === 'failed' && (
              <div className="gameover-overlay">
                <div className="gameover-card">
                  <XCircle size={48} color="#ef4444" style={{ alignSelf: 'center' }} />
                  <div>
                    <h4 className="overlay-score-title">Streak Ended</h4>
                    <h2 className="overlay-score-val">{streakCount}</h2>
                    <p style={{ color: '#888888', fontSize: '13px', margin: 0 }}>Puzzles solved consecutively</p>
                  </div>

                  {isNewBest ? (
                    <div className="personal-best-banner" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}>
                      <Trophy size={16} /> New Personal Best!
                    </div>
                  ) : (
                    <div className="personal-best-banner">
                      <Trophy size={16} /> Your Best: {personalBest}
                    </div>
                  )}

                  <button className="btn-gameover-primary" onClick={startStreakGame}>
                    <RefreshCw size={16} /> Play Again
                  </button>
                  <button className="btn-gameover-share" onClick={handleShareStreak}>
                    <Share2 size={16} /> Share Results
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
