import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Calendar, Zap, Share2, CheckCircle, Flame } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useGame, BOARD_THEMES } from '../context/GameContext';

interface Puzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
}

function fenToGrid(fen: string) {
  const rows = fen.split(' ')[0].split('/');
  const grid = [];
  for (const row of rows) {
    const r = [];
    for (const char of row) {
      if (isNaN(char as any)) {
        r.push(char);
      } else {
        const emptyCount = parseInt(char, 10);
        for (let i = 0; i < emptyCount; i++) r.push('');
      }
    }
    grid.push(r);
  }
  return grid;
}

export default function DailyPuzzle() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { state } = useGame();
  const theme = state?.theme || 'classic';
  const currentTheme = BOARD_THEMES[theme] || BOARD_THEMES.classic;
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const pieceTheme = typeof localStorage !== 'undefined' ? (localStorage.getItem('chess_pieces') || 'cburnett') : 'cburnett';
  const getPieceImage = (color: string, type: string) => {
    const key = `${color}${type.toUpperCase()}`;
    return `${import.meta.env.BASE_URL || '/'}pieces/${pieceTheme}/${key}.svg`;
  };

  useEffect(() => {
    const loadDailyStatus = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch daily puzzle
        const { data: pData, error: pError } = await supabase.rpc('get_daily_puzzle', { today_date: todayStr });
        if (pData && pData.length > 0 && !pError) {
          setPuzzle(pData[0]);
        } else {
          // Fallback daily puzzle if no DB entries
          setPuzzle({
            id: 'daily_fallback',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
            moves: 'd3d4 e5d4',
            rating: 1000,
            themes: ['opening', 'center'],
          });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: rData } = await supabase
            .from('puzzle_ratings')
            .select('daily_last_solved, daily_streak_days')
            .eq('user_id', user.id)
            .single();

          if (rData) {
            setStreak(rData.daily_streak_days || 0);
            setIsSolved(rData.daily_last_solved === todayStr);
          }
        } else {
          const solvedDate = localStorage.getItem('guest_daily_solved_date');
          const guestStreak = parseInt(localStorage.getItem('guest_daily_streak') || '0', 10);
          setStreak(guestStreak);
          setIsSolved(solvedDate === todayStr);
        }
      } catch (err) {
        console.error('Failed to load daily status:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDailyStatus();
  }, []);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!puzzle) return;

    const shareLink = `${window.location.origin}${window.location.pathname}#/puzzles/daily?fen=${encodeURIComponent(puzzle.fen)}`;
    const text = `I solved today's ChessMaster puzzle! Can you? 👑 Try it here: ${shareLink}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Share link copied to clipboard! 📋', 'success');
    } else {
      showToast(shareLink, 'info');
    }
  };

  const handleSolveClick = () => {
    navigate('/puzzles/daily');
  };

  if (loading) {
    return (
      <div className="daily-puzzle-shimmer" style={{ height: '320px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <style>{`
          .daily-puzzle-shimmer {
            background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
            background-size: 200% 100%;
            animation: loading-shimmer 1.5s infinite;
          }
          @keyframes loading-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const grid = puzzle ? fenToGrid(puzzle.fen) : [];

  return (
    <div className="daily-puzzle-card" onClick={handleSolveClick}>
      <style>{`
        .daily-puzzle-card {
          background: rgba(30, 29, 27, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }

        .daily-puzzle-card:hover {
          transform: translateY(-2px);
          border-color: rgba(129, 182, 76, 0.4);
        }

        .daily-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .daily-badge-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .daily-icon-badge {
          background: rgba(129, 182, 76, 0.1);
          color: #81b64c;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .solved-badge {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .flame-badge {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .thumbnail-board {
          width: 100%;
          aspect-ratio: 1;
          background: #B58863;
          border-radius: 8px;
          overflow: hidden;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(8, 1fr);
          box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.6);
          pointer-events: none;
        }

        .thumbnail-square {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .thumbnail-square.light {
          background: #F0D9B5;
        }

        .thumbnail-square.dark {
          background: #B58863;
        }

        .thumbnail-piece {
          width: 85%;
          height: 85%;
          object-fit: contain;
        }

        .solve-cta-btn {
          width: 100%;
          height: 40px;
          background: linear-gradient(135deg, #81b64c, #639035);
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(129, 182, 76, 0.35);
          transition: all 0.2s;
        }

        .solve-cta-btn:hover {
          background: linear-gradient(135deg, #95d05a, #73a73e);
        }

        .solved-action-group {
          display: flex;
          gap: 8px;
        }

        .btn-share {
          flex: 1;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-share:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <div className="daily-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="daily-icon-badge">
            <Calendar size={18} />
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#81b64c', fontWeight: 800, letterSpacing: '0.5px' }}>Daily Puzzle</span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0', color: '#ffffff' }}>Solve & Win</h3>
          </div>
        </div>

        <div className="daily-badge-group">
          {isSolved && (
            <span className="solved-badge">
              <CheckCircle size={12} /> Solved
            </span>
          )}
          {streak > 0 && (
            <span className="flame-badge">
              <Flame size={12} /> {streak}d streak
            </span>
          )}
        </div>
      </div>

      <div className="thumbnail-board" style={{ background: currentTheme.dark }}>
        {grid.map((row, rIdx) =>
          row.map((piece, cIdx) => {
            const isLight = (rIdx + cIdx) % 2 === 0;
            const pieceColor = piece && piece === piece.toUpperCase() ? 'w' : 'b';
            const pieceType = piece.toLowerCase();

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="thumbnail-square"
                style={{ background: isLight ? currentTheme.light : currentTheme.dark }}
              >
                {piece && (
                  <img
                    src={getPieceImage(pieceColor, pieceType)}
                    className="thumbnail-piece"
                    alt={piece}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {!isSolved ? (
        <button className="solve-cta-btn" onClick={handleSolveClick}>
          <Zap size={16} /> Solve Today&apos;s Puzzle
        </button>
      ) : (
        <div className="solved-action-group">
          <button className="btn-share" onClick={handleShare}>
            <Share2 size={16} /> Share Puzzle
          </button>
        </div>
      )}
    </div>
  );
}
