import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ChessBoard from '../components/ChessBoard';
import { usePuzzle, Puzzle } from '../hooks/usePuzzle';
import { calculateNewRating } from '../lib/glicko2';
import { supabase } from '../services/supabase';
import { useToast } from '../hooks/useToast';
import { Award, Zap, HelpCircle, Eye, RefreshCw, ChevronRight, Sparkles, BookOpen } from 'lucide-react';
import offlinePuzzles from '../data/puzzles.json';

const THEME_NAMES: Record<string, string> = {
  fork: 'Fork 🍴',
  pin: 'Pin 📌',
  skewer: 'Skewer 🍢',
  mateIn1: 'Mate in 1 👑',
  mateIn2: 'Mate in 2 👑',
  mateIn3: 'Mate in 3 👑',
  advantage: 'Advantage 📈',
  crushing: 'Crushing 💥',
  endgame: 'Endgame 🏁',
  middlegame: 'Middlegame ⚔️',
  opening: 'Opening 📖',
  backRankMate: 'Back-Rank Mate 🏰',
  discoveredAttack: 'Discovered Attack 🔍',
  doubleCheck: 'Double Check ‼️',
  sacrificialMove: 'Sacrifice 💎',
  hangingPiece: 'Hanging Piece 🎣',
};

const TOP_20_THEMES = [
  { id: 'fork', name: 'Fork 🍴' },
  { id: 'pin', name: 'Pin 📌' },
  { id: 'skewer', name: 'Skewer 🍢' },
  { id: 'discoveredAttack', name: 'Discovered Attack 🔍' },
  { id: 'mateIn1', name: 'Mate in 1 👑' },
  { id: 'mateIn2', name: 'Mate in 2 👑' },
  { id: 'mateIn3', name: 'Mate in 3 👑' },
  { id: 'backRankMate', name: 'Back-Rank Mate 🏰' },
  { id: 'hangingPiece', name: 'Hanging Piece 🎣' },
  { id: 'endgame', name: 'Endgame 🏁' },
  { id: 'opening', name: 'Opening 📖' },
  { id: 'middlegame', name: 'Middlegame ⚔️' },
  { id: 'sacrifice', name: 'Sacrifice 💎' },
  { id: 'quietMove', name: 'Quiet Move 🤫' },
  { id: 'defensiveMove', name: 'Defensive Move 🛡️' },
  { id: 'attraction', name: 'Attraction 🧲' },
  { id: 'deflection', name: 'Deflection 🪃' },
  { id: 'interference', name: 'Interference 🚧' },
  { id: 'clearance', name: 'Clearance 🧹' },
  { id: 'xRayAttack', name: 'X-Ray Attack ⚡' },
];

export default function PuzzlePage({ mode = 'rated' }: { mode?: 'rated' | 'daily' }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // User rating and details
  const [userRating, setUserRating] = useState(1200);
  const [userRD, setUserRD] = useState(350);
  const [userVol, setUserVol] = useState(0.06);
  const [gamesCount, setGamesCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  // Active puzzle and status
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratingChange, setRatingChange] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [bestMoveArrow, setBestMoveArrow] = useState<{ from: string; to: string } | null>(null);

  // Collapsible filter state & active filter themes
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('chessmaster_puzzleThemes') || '[]');
    } catch {
      return [];
    }
  });

  const toggleTheme = (themeId: string) => {
    let nextThemes: string[];
    if (themeId === 'any') {
      nextThemes = [];
    } else {
      if (selectedThemes.includes(themeId)) {
        nextThemes = selectedThemes.filter(t => t !== themeId);
      } else {
        nextThemes = [...selectedThemes, themeId];
      }
    }
    setSelectedThemes(nextThemes);
    localStorage.setItem('chessmaster_puzzleThemes', JSON.stringify(nextThemes));

    // Clear the pre-loaded queue because the themes filter changed!
    queueRef.current = [];
    setQueueState([]);

    // Fetch immediately to load a puzzle matching new filter
    setTimeout(() => {
      fetchNextPuzzle();
    }, 0);
  };

  // Queue of pre-fetched puzzles
  const queueRef = useRef<Puzzle[]>([]);
  const [queueState, setQueueState] = useState<Puzzle[]>([]);
  const replenishingRef = useRef(false);
  const ratingUpdatedRef = useRef(false);

  // Load rating details from Supabase on mount
  useEffect(() => {
    const loadUserRating = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data, error } = await supabase
            .from('puzzle_ratings')
            .select('rating, rating_deviation, volatility, games_played')
            .eq('user_id', user.id)
            .single();

          if (data && !error) {
            setUserRating(data.rating);
            setUserRD(data.rating_deviation);
            setUserVol(data.volatility);
            setGamesCount(data.games_played || 0);
          } else {
            const defaultRecord = {
              user_id: user.id,
              rating: 1200,
              rating_deviation: 350,
              volatility: 0.06,
              games_played: 0
            };
            await supabase.from('puzzle_ratings').insert(defaultRecord);
            setUserRating(1200);
            setUserRD(350);
            setUserVol(0.06);
            setGamesCount(0);
          }
        } else {
          // Guest User
          const localRating = localStorage.getItem('guest_puzzle_rating');
          if (localRating) {
            try {
              const parsed = JSON.parse(localRating);
              setUserRating(parsed.rating ?? 1200);
              setUserRD(parsed.rating_deviation ?? 350);
              setUserVol(parsed.volatility ?? 0.06);
              setGamesCount(parsed.games_played ?? 0);
            } catch {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.error('Error loading rating details:', err);
      } finally {
        setRatingLoaded(true);
      }
    };

    loadUserRating();
  }, []);

  // Fetch a single puzzle from Supabase RPC
  const fetchSinglePuzzle = async (targetRating: number, excludeIds: string[], themesFilter: string[]): Promise<Puzzle | null> => {
    try {
      const { data, error } = await supabase.rpc('get_puzzle_for_rating', {
        target_rating: Math.round(targetRating),
        exclude_ids: excludeIds,
        selected_themes: themesFilter
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const raw = data[0] as Puzzle;

      // Filter out equality theme or rating < 500
      const isEquality = raw.themes?.includes('equality');
      const isLowRating = raw.rating < 500;

      if (isEquality || isLowRating) {
        return fetchSinglePuzzle(targetRating, [...excludeIds, raw.id], themesFilter);
      }

      return raw;
    } catch (err) {
      console.error('Error in fetchSinglePuzzle:', err);
      return null;
    }
  };

  // Pre-fetch next puzzles to queue
  const replenishQueue = async (targetRating: number) => {
    if (replenishingRef.current) return;
    replenishingRef.current = true;

    try {
      const solvedIds = JSON.parse(localStorage.getItem('solved_puzzle_ids') || '[]');
      const queueIds = queueRef.current.map(p => p.id);
      const excludeIds = [...solvedIds, ...queueIds];
      const themesFilter = JSON.parse(localStorage.getItem('chessmaster_puzzleThemes') || '[]');

      while (queueRef.current.length < 5) {
        const p = await fetchSinglePuzzle(targetRating, excludeIds, themesFilter);
        if (!p) break;
        queueRef.current.push(p);
        excludeIds.push(p.id);
      }
      setQueueState([...queueRef.current]);
    } catch (err) {
      console.error('Error replenishing queue:', err);
    } finally {
      replenishingRef.current = false;
    }
  };

  // Load next puzzle from queue or RPC
  const fetchNextPuzzle = async () => {
    setLoading(true);
    try {
      let nextPuzzle: Puzzle | null = null;
      if (mode === 'daily') {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.rpc('get_daily_puzzle', { today_date: todayStr });
        if (data && data.length > 0 && !error) {
          nextPuzzle = data[0];
        } else {
          // Fallback daily puzzle if no DB entries
          const chosen = offlinePuzzles[0];
          nextPuzzle = {
            id: chosen.id,
            fen: chosen.fen,
            moves: Array.isArray(chosen.moves) ? chosen.moves.join(' ') : chosen.moves,
            rating: chosen.rating,
            themes: chosen.themes || [],
          };
        }
      } else {
        const solvedIds = JSON.parse(localStorage.getItem('solved_puzzle_ids') || '[]');
        const themesFilter = JSON.parse(localStorage.getItem('chessmaster_puzzleThemes') || '[]');

        if (queueRef.current.length > 0) {
          nextPuzzle = queueRef.current.shift()!;
          setQueueState([...queueRef.current]);
        } else {
          nextPuzzle = await fetchSinglePuzzle(userRating, solvedIds, themesFilter);
        }
      }

      if (nextPuzzle) {
        setPuzzle(nextPuzzle);
      } else {
        // Fallback to offline puzzles
        const offline = offlinePuzzles.filter(p => !solvedIds.includes(p.id));
        const chosen = offline.length > 0
          ? offline[Math.floor(Math.random() * offline.length)]
          : offlinePuzzles[Math.floor(Math.random() * offlinePuzzles.length)];

        const mapped: Puzzle = {
          id: chosen.id,
          fen: chosen.fen,
          moves: Array.isArray(chosen.moves) ? chosen.moves.join(' ') : chosen.moves,
          rating: chosen.rating,
          themes: chosen.themes || [],
        };
        setPuzzle(mapped);
      }

      setBestMoveArrow(null);
      setHintUsed(false);
      setRatingChange(null);
      ratingUpdatedRef.current = false;

      // Replenish in background if rated
      if (mode !== 'daily') {
        replenishQueue(userRating);
      }
    } catch (err) {
      console.error('Failed to load next puzzle:', err);
      // Fast fallback
      const chosen = offlinePuzzles[Math.floor(Math.random() * offlinePuzzles.length)];
      const mapped: Puzzle = {
        id: chosen.id,
        fen: chosen.fen,
        moves: Array.isArray(chosen.moves) ? chosen.moves.join(' ') : chosen.moves,
        rating: chosen.rating,
        themes: chosen.themes || [],
      };
      setPuzzle(mapped);
      setBestMoveArrow(null);
      setHintUsed(false);
      setRatingChange(null);
      ratingUpdatedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading initial puzzle when userRating is ready
  useEffect(() => {
    if (ratingLoaded) {
      fetchNextPuzzle();
    }
  }, [ratingLoaded]);

  // Hook instance managing board state and rules
  const {
    boardState,
    handleSquareClick,
    handlePromotion,
    status: currentStatus,
    attempts,
    flash,
    getHint,
    showSolution,
    resetPuzzle,
  } = usePuzzle(puzzle);

  // Update ratings in db/local
  const updateRatingInDb = async (newRating: number, newRD: number, newVol: number) => {
    const finalRating = Math.round(newRating);
    const finalRD = Math.round(newRD);

    setUserRating(finalRating);
    setUserRD(finalRD);
    setUserVol(newVol);
    setGamesCount(prev => prev + 1);

    if (userId) {
      try {
        await supabase
          .from('puzzle_ratings')
          .upsert({
            user_id: userId,
            rating: finalRating,
            rating_deviation: finalRD,
            volatility: newVol,
            games_played: gamesCount + 1,
            updated_at: new Date().toISOString()
          });
      } catch (err) {
        console.error('Supabase save rating failed:', err);
      }
    } else {
      localStorage.setItem('guest_puzzle_rating', JSON.stringify({
        rating: finalRating,
        rating_deviation: finalRD,
        volatility: newVol,
        games_played: gamesCount + 1
      }));
    }
  };

  // Listen to status change to apply ratings and save activity
  useEffect(() => {
    if (!puzzle || ratingUpdatedRef.current) return;

    if (currentStatus === 'solved' || currentStatus === 'failed') {
      ratingUpdatedRef.current = true;
      const isSolved = currentStatus === 'solved';
      const outcome = isSolved ? 1 : 0;

      // Calculate new ratings
      const result = calculateNewRating(
        userRating,
        userRD,
        userVol,
        puzzle.rating,
        puzzle.rating_deviation || 350,
        outcome
      );

      const diff = Math.round(result.newRating) - Math.round(userRating);
      setRatingChange(diff);

      // Save new ratings
      updateRatingInDb(result.newRating, result.newRD, result.newVolatility);

      // Save activity in background if logged in
      if (userId) {
        supabase.from('puzzle_activity').insert({
          user_id: userId,
          puzzle_id: puzzle.id,
          solved: isSolved,
          time_taken_ms: 0,
          mode: mode,
          rating_before: Math.round(userRating),
          rating_after: Math.round(result.newRating)
        }).then(({ error }) => {
          if (error) console.error('Error saving activity:', error);
        });

        // If daily, update daily streak
        if (mode === 'daily' && isSolved) {
          supabase.rpc('update_daily_streak', { uid: userId }).then(({ error }) => {
            if (error) console.error('Failed to update daily streak in Supabase:', error);
          });
        }
      } else {
        // Save guest activity for statistics calculation
        try {
          const localAct = JSON.parse(localStorage.getItem('guest_puzzle_activity') || '[]');
          const newAct = {
            puzzle_id: puzzle.id,
            solved: isSolved,
            rating_before: Math.round(userRating),
            rating_after: Math.round(result.newRating),
            created_at: new Date().toISOString(),
            themes: puzzle.themes || [],
            rating: puzzle.rating
          };
          localAct.unshift(newAct);
          localStorage.setItem('guest_puzzle_activity', JSON.stringify(localAct.slice(0, 50)));
        } catch (e) {
          console.error('Failed to save guest puzzle activity:', e);
        }

        // Guest local storage streak increment for daily mode
        if (mode === 'daily' && isSolved) {
          const todayStr = new Date().toISOString().split('T')[0];
          const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const lastSolvedDate = localStorage.getItem('guest_daily_solved_date');
          const guestStreak = parseInt(localStorage.getItem('guest_daily_streak') || '0', 10);

          let nextStreak = 1;
          if (lastSolvedDate === yesterdayStr) {
            nextStreak = guestStreak + 1;
          } else if (lastSolvedDate === todayStr) {
            nextStreak = guestStreak;
          }

          localStorage.setItem('guest_daily_streak', nextStreak.toString());
          localStorage.setItem('guest_daily_solved_date', todayStr);
          localStorage.setItem('guest_daily_solved_status', 'true');
        }
      }

      // Add to local solved puzzles tracker to prevent repeats
      const solvedIds = JSON.parse(localStorage.getItem('solved_puzzle_ids') || '[]');
      if (!solvedIds.includes(puzzle.id)) {
        solvedIds.push(puzzle.id);
        localStorage.setItem('solved_puzzle_ids', JSON.stringify(solvedIds));
      }

      if (isSolved) {
        showToast('Tactics puzzle solved successfully!', 'success');
      } else {
        showToast('Puzzle failed! Try analyzing the position.', 'error');
      }
    }
  }, [currentStatus, puzzle]);

  // Use hint handler (-10 Elo cost)
  const handleHintClick = async () => {
    if (hintUsed || !puzzle || currentStatus !== 'playing') return;

    const hint = getHint();
    if (hint) {
      setBestMoveArrow(hint);
      setHintUsed(true);

      const newRatingVal = Math.max(100, userRating - 10);
      setUserRating(newRatingVal);
      setRatingChange(prev => (prev ?? 0) - 10);

      // Update in Supabase
      if (userId) {
        await supabase
          .from('puzzle_ratings')
          .update({ rating: newRatingVal, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } else {
        localStorage.setItem('guest_puzzle_rating', JSON.stringify({
          rating: newRatingVal,
          rating_deviation: userRD,
          volatility: userVol,
          games_played: gamesCount
        }));
      }

      showToast('Hint used! -10 rating applied.', 'info');
    }
  };

  const getPlayerOrientationName = () => {
    if (!puzzle) return 'White';
    return boardState.playerColor === 'w' ? 'White' : 'Black';
  };

  return (
    <PageShell>
      <div className="puzzle-trainer-wrapper">
        <style>{`
          .puzzle-trainer-wrapper {
            background: radial-gradient(circle at 50% 10%, #1e1d1a, #0c0b0a);
            min-height: calc(100vh - 64px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
            box-sizing: border-box;
          }

          .puzzle-trainer-container {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 40px;
            max-width: 1100px;
            width: 100%;
            padding: 32px 24px;
            box-sizing: border-box;
          }

          @media (max-width: 900px) {
            .puzzle-trainer-container {
              grid-template-columns: 1fr;
              gap: 24px;
              padding: 16px 12px;
            }
          }

          /* Left board styles */
          .board-column {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
          }

          .board-card {
            width: 100%;
            max-width: 500px;
            aspect-ratio: 1;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 8px;
            box-sizing: border-box;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
          }

          /* Dynamic board flashing */
          .flash-correct {
            animation: pulse-correct 0.6s ease;
          }
          .flash-wrong {
            animation: shake-wrong 0.4s ease;
          }

          @keyframes pulse-correct {
            0% { box-shadow: 0 0 0 transparent; }
            50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.7); }
            100% { box-shadow: 0 0 0 transparent; }
          }

          @keyframes shake-wrong {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }

          /* Right panel styles */
          .details-column {
            display: flex;
            flex-direction: column;
            gap: 20px;
            justify-content: flex-start;
          }

          .panel-card {
            background: rgba(30, 29, 27, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: relative;
            overflow: hidden;
          }

          .badge-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
          }

          .puzzle-id-badge {
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
            border: 1px solid rgba(212, 175, 55, 0.3);
            color: #f5c518;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .rating-badge {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
          }

          .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .theme-pill {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: #cccccc;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            transition: background 0.2s;
          }
          .theme-pill:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          /* Solving instructions & feedback overlay */
          .instruction-box {
            text-align: center;
            padding: 20px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 120px;
            box-sizing: border-box;
          }

          .instruction-pulse {
            color: #d4af37;
            font-size: 18px;
            font-weight: 800;
            animation: pulse-glow 2s infinite ease-in-out;
            margin: 0;
          }

          @keyframes pulse-glow {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); text-shadow: 0 0 10px rgba(212, 175, 55, 0.5); }
          }

          .sub-instruction {
            font-size: 13px;
            color: #aaaaaa;
            margin: 0;
          }

          /* Result states animations */
          .result-correct {
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.25);
          }

          .result-failed {
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.25);
          }

          .result-icon-animate {
            font-size: 32px;
            animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }

          @keyframes bounce-in {
            0% { transform: scale(0); opacity: 0; }
            70% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }

          /* Stats cards block */
          .stats-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .stat-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .stat-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888888;
            font-weight: 700;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .stat-change-up {
            color: #10B981;
            font-size: 13px;
            font-weight: 800;
            animation: slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .stat-change-down {
            color: #EF4444;
            font-size: 13px;
            font-weight: 800;
            animation: slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          @keyframes slide-up-fade {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          /* Buttons */
          .action-btn {
            width: 100%;
            height: 48px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
            border: none;
            box-sizing: border-box;
          }

          .btn-primary {
            background: linear-gradient(135deg, #81b64c, #639035);
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(129, 182, 76, 0.3);
          }
          .btn-primary:hover {
            background: linear-gradient(135deg, #95d05a, #73a73e);
            transform: translateY(-1px);
          }
          .btn-primary:active {
            transform: translateY(1px);
          }

          .btn-danger {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
          }
          .btn-danger:hover {
            background: linear-gradient(135deg, #ff6b5b, #d64535);
            transform: translateY(-1px);
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
          }
          .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
          }
          .btn-secondary:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .btn-hint {
            background: transparent;
            border: 1px dashed rgba(245, 197, 24, 0.4);
            color: #f5c518;
          }
          .btn-hint:hover:not(:disabled) {
            background: rgba(245, 197, 24, 0.05);
            border-color: rgba(245, 197, 24, 0.8);
            transform: translateY(-1px);
          }
          .btn-hint:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .back-nav {
            align-self: flex-start;
            background: transparent;
            border: none;
            color: #888888;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: color 0.2s;
            padding: 0;
          }
          .back-nav:hover {
            color: #ffffff;
          }

          /* Shimmer loading */
          .shimmer {
            background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
            background-size: 200% 100%;
            animation: loading-shimmer 1.5s infinite;
          }

          @keyframes loading-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          .filter-panel {
            background: rgba(30, 29, 27, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: -8px;
            margin-bottom: -4px;
            text-align: left;
          }
          
          .filter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
          }
          
          .chips-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            max-height: 160px;
            overflow-y: auto;
            padding-right: 4px;
            margin-top: 8px;
          }
          
          .chips-grid::-webkit-scrollbar {
            width: 4px;
          }
          .chips-grid::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.01);
          }
          .chips-grid::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.15);
            border-radius: 2px;
          }
          
          .chip {
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            color: #aaaaaa;
          }
          
          .chip:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.15);
            color: #ffffff;
          }
          
          .chip.active {
            background: rgba(129, 182, 76, 0.15);
            border-color: #81b64c;
            color: #ffffff;
            box-shadow: 0 2px 6px rgba(129, 182, 76, 0.2);
          }
        `}</style>

        <div className="puzzle-trainer-container">
          {/* LEFT: Chess board view */}
          <div className="board-column">
            <button className="back-nav" onClick={() => navigate('/puzzles')}>
              ← Back to Dashboard
            </button>
            <div style={{ height: '16px' }} />
            <div className={`board-card flash-${flash}`}>
              {loading || !puzzle ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #81b64c', borderRadius: '50%', width: '48px', height: '48px', animation: 'pulse-glow 1.5s infinite linear' }} />
                  <span style={{ fontSize: '13px', color: '#888' }}>Arranging Board...</span>
                </div>
              ) : (
                <ChessBoard
                  customState={boardState}
                  customHandleSquareClick={handleSquareClick}
                  customHandlePromotion={handlePromotion}
                  bestMoveArrow={bestMoveArrow}
                />
              )}
            </div>
          </div>

          {/* RIGHT: Control and details panel */}
          <div className="details-column">
            {loading || !puzzle ? (
              <div className="panel-card shimmer" style={{ minHeight: '380px' }} />
            ) : (
              <div className="panel-card">
                <div className="badge-row">
                  <span className="puzzle-id-badge">
                    <Sparkles size={16} /> Puzzle #{puzzle.id}
                  </span>
                  <span className="rating-badge">
                    🎯 Rating: {puzzle.rating} ELO
                  </span>
                </div>

                <div className="tags-container">
                  {puzzle.themes && puzzle.themes.length > 0 ? (
                    puzzle.themes.slice(0, 4).map(theme => (
                      <span className="theme-pill" key={theme}>
                        {THEME_NAMES[theme] || theme}
                      </span>
                    ))
                  ) : (
                    <span className="theme-pill">Tactics 🧠</span>
                  )}
                </div>

                {/* State Feedback Area */}
                {currentStatus === 'playing' && (
                  <div className="instruction-box">
                    <h3 className="instruction-pulse">Your Turn</h3>
                    <p className="sub-instruction">
                      Find the best move for {getPlayerOrientationName()}
                    </p>
                    {attempts === 1 && (
                      <span style={{ fontSize: '12px', color: '#ff9800', fontWeight: 600 }}>
                        ⚠️ Wrong move. 1 retry remaining!
                      </span>
                    )}
                  </div>
                )}

                {currentStatus === 'solved' && (
                  <div className="instruction-box result-correct">
                    <span className="result-icon-animate">✅</span>
                    <h3 style={{ color: '#10b981', fontWeight: 800, margin: '4px 0 0', fontSize: '20px' }}>Solved!</h3>
                    <p className="sub-instruction">You found the exact target moves.</p>
                  </div>
                )}

                {(currentStatus === 'failed' || currentStatus === 'viewing_solution') && (
                  <div className="instruction-box result-failed">
                    <span className="result-icon-animate">❌</span>
                    <h3 style={{ color: '#ef4444', fontWeight: 800, margin: '4px 0 0', fontSize: '20px' }}>
                      {currentStatus === 'failed' ? 'Puzzle Failed' : 'Solution Revealed'}
                    </h3>
                    <p className="sub-instruction">
                      {currentStatus === 'failed'
                        ? 'No attempts left. Try checking the correct solution.'
                        : 'Reviewing the correct solution path.'
                      }
                    </p>
                  </div>
                )}

                {/* Rating display card */}
                <div className="stats-card">
                  <div className="stat-item">
                    <span className="stat-label">Your Puzzle Rating</span>
                    <div className="stat-value">
                      <Award size={20} color="#f5c518" />
                      {userRating}
                      {ratingChange !== null && (
                        <span className={ratingChange >= 0 ? 'stat-change-up' : 'stat-change-down'}>
                          {ratingChange >= 0 ? `+${ratingChange}` : ratingChange}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="stat-item" style={{ textAlign: 'right' }}>
                    <span className="stat-label">Tactics Solved</span>
                    <div className="stat-value" style={{ justifyContent: 'flex-end' }}>
                      <Zap size={18} color="#f59e0b" />
                      {gamesCount}
                    </div>
                  </div>
                </div>

                {/* Theme filter panel (only in rated mode) */}
                {mode === 'rated' && (
                  <div className="filter-panel">
                    <div className="filter-header" onClick={() => setFilterExpanded(e => !e)}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#eeeeee', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚙️ Filter by Theme
                      </span>
                      <span style={{ fontSize: '11px', color: '#888888', fontWeight: 700 }}>
                        {filterExpanded ? 'Collapse ▲' : 'Expand ▼'}
                      </span>
                    </div>
                    {filterExpanded && (
                      <div className="chips-grid">
                        <span 
                          className={`chip ${selectedThemes.length === 0 ? 'active' : ''}`}
                          onClick={() => toggleTheme('any')}
                        >
                          Any Theme 🌍
                        </span>
                        {TOP_20_THEMES.map(theme => {
                          const isActive = selectedThemes.includes(theme.id);
                          return (
                            <span
                              key={theme.id}
                              className={`chip ${isActive ? 'active' : ''}`}
                              onClick={() => toggleTheme(theme.id)}
                            >
                              {theme.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentStatus === 'playing' && (
                    <button
                      className="action-btn btn-hint"
                      onClick={handleHintClick}
                      disabled={hintUsed}
                    >
                      <HelpCircle size={18} />
                      {hintUsed ? 'Hint Arrow Active' : 'Reveal Hint (-10 Elo)'}
                    </button>
                  )}

                  {currentStatus === 'failed' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="action-btn btn-secondary" onClick={resetPuzzle}>
                        <RefreshCw size={16} /> Retry Puzzle
                      </button>
                      <button className="action-btn btn-secondary" onClick={showSolution}>
                        <Eye size={16} /> Show Solution
                      </button>
                    </div>
                  )}

                  {(currentStatus === 'solved' || currentStatus === 'failed' || currentStatus === 'viewing_solution') && (
                    mode === 'daily' ? (
                      <button className="action-btn btn-primary" onClick={() => navigate('/puzzles')}>
                        Back to Puzzle Hub
                      </button>
                    ) : (
                      <button className="action-btn btn-primary" onClick={fetchNextPuzzle}>
                        Next Puzzle <ChevronRight size={18} />
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {mode !== 'daily' && (
              <div className="panel-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaaaaa' }}>
                  <BookOpen size={16} />
                  <span>Queue Status: {queueState.length} / 5 pre-loaded puzzles.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
