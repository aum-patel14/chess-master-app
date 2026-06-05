import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { readStats, readElo, STATS_KEY, ELO_KEY, HISTORY_KEY } from '../utils/chessStats'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { useState } from 'react'

function getOpeningFromMoves(moves) {
  if (!moves || moves.length === 0) return 'King\'s Pawn Game';
  const m1 = moves[0];
  const m2 = moves[1];
  
  if (m1 === 'e4') {
    if (m2 === 'c5') return 'Sicilian Defence';
    if (m2 === 'e5') return 'King\'s Pawn Game';
    if (m2 === 'e6') return 'French Defence';
    if (m2 === 'c6') return 'Caro-Kann Defence';
    if (m2 === 'd6') return 'Pirc Defence';
    if (m2 === 'Nf6') return 'Alekhine\'s Defence';
  } else if (m1 === 'd4') {
    if (m2 === 'd5') return 'Queen\'s Gambit';
    if (m2 === 'Nf6') return 'Indian Defence';
    if (m2 === 'f5') return 'Dutch Defence';
    if (m2 === 'e6') return 'Queen\'s Pawn Game';
  } else if (m1 === 'Nf3') {
    return 'Réti Opening';
  } else if (m1 === 'c4') {
    return 'English Opening';
  } else if (m1 === 'f4') {
    return 'Bird\'s Opening';
  }
  return 'King\'s Pawn Game';
}

export default function StatsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)

  const stats = useMemo(() => readStats(), [])
  const elo = useMemo(() => readElo(), [])

  const allHistory = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    } catch {
      return []
    }
  }, [])

  const history = useMemo(() => allHistory.slice(0, 5), [allHistory])

  const total = stats.wins + stats.losses + stats.draws || 1
  const wPct = Math.round((stats.wins / total) * 100)
  const lPct = Math.round((stats.losses / total) * 100)
  const dPct = Math.max(0, 100 - wPct - lPct)

  const circumference = 2 * Math.PI * 52
  const seg = (pct) => (pct / 100) * circumference

  const currentStreakLabel = useMemo(() => {
    if (stats.winStreak > 0) return `🔥 ${stats.winStreak} Win${stats.winStreak > 1 ? 's' : ''}`;
    if (stats.lossStreak > 0) return `💀 ${stats.lossStreak} Loss${stats.lossStreak > 1 ? 'es' : ''}`;
    if (stats.drawStreak > 0) return `🤝 ${stats.drawStreak} Draw${stats.drawStreak > 1 ? 's' : ''}`;
    return '0';
  }, [stats]);

  const longestGame = useMemo(() => {
    return allHistory.reduce((max, g) => Math.max(max, g.moveCount || 0), 0);
  }, [allHistory]);

  const favOpening = useMemo(() => {
    const gamesWithMoves = allHistory.filter(g => g.moves && g.moves.length > 0);
    if (gamesWithMoves.length === 0) return 'King\'s Pawn Game';
    
    const openingCounts = {};
    gamesWithMoves.forEach(g => {
      const op = getOpeningFromMoves(g.moves);
      openingCounts[op] = (openingCounts[op] || 0) + 1;
    });
    
    let bestOp = 'King\'s Pawn Game';
    let maxCount = 0;
    for (const [op, count] of Object.entries(openingCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestOp = op;
      }
    }
    return bestOp;
  }, [allHistory]);

  const eloHistory = useMemo(() => {
    const list = [...allHistory].reverse()
    const ratings = list.map(g => g.ratingAfter).filter(r => typeof r === 'number')
    
    if (ratings.length === 0) {
      ratings.push(elo)
    }
    if (ratings.length === 1) {
      ratings.unshift(ratings[0] > 800 ? 800 : ratings[0] - 50)
    }
    return ratings.slice(-30)
  }, [allHistory, elo])

  const { polylinePoints, polygonPoints, minElo, maxElo } = useMemo(() => {
    const min = Math.min(...eloHistory)
    const max = Math.max(...eloHistory)
    const range = max - min
    const pad = range === 0 ? 100 : range * 0.15
    const minElo = Math.max(100, Math.round(min - pad))
    const maxElo = Math.round(max + pad)
    const eloRange = maxElo - minElo || 100
    const N = eloHistory.length

    const points = eloHistory.map((val, idx) => {
      const x = N > 1 ? (idx / (N - 1)) * 100 : 50
      const y = 100 - ((val - minElo) / eloRange) * 80 - 10
      return { x, y }
    })

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
    const polygonPoints = `0,100 ${polylinePoints} 100,100`

    return { polylinePoints, polygonPoints, minElo, maxElo }
  }, [eloHistory])

  const onReset = () => {
    localStorage.removeItem(STATS_KEY)
    localStorage.removeItem(ELO_KEY)
    localStorage.removeItem(HISTORY_KEY)
    showToast('Stats reset', 'warning')
    setConfirmReset(false)
    navigate('/')
  }

  return (
    <PageShell>
      <div
        style={{
          background: '#0a0a14',
          color: '#e8e8e8',
          minHeight: '100vh',
          padding: '24px 16px 100px',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginBottom: 20,
            minHeight: 44,
            padding: '0 16px',
            borderRadius: 8,
            border: '1px solid rgba(212,175,55,0.35)',
            background: 'transparent',
            color: '#d4af37',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back
        </button>

        <section
          style={{
            background: '#1a1a2e',
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            border: '1px solid rgba(212,175,55,0.2)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#888', fontSize: 14, marginBottom: 8 }}>Your ELO Rating</div>
          <div style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d4af37', fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: 700 }}>{elo}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>Keep playing to improve!</div>
        </section>

        <section
          style={{
            background: '#1a1a2e',
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', fontSize: '1.1rem', alignSelf: 'flex-start' }}>Results</h2>
          <svg width="140" height="140" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#333" strokeWidth="14" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#22c55e"
              strokeWidth="14"
              strokeDasharray={`${seg(wPct)} ${circumference}`}
              strokeDashoffset={0}
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#ef4444"
              strokeWidth="14"
              strokeDasharray={`${seg(lPct)} ${circumference}`}
              strokeDashoffset={-seg(wPct)}
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#6b7280"
              strokeWidth="14"
              strokeDasharray={`${seg(dPct)} ${circumference}`}
              strokeDashoffset={-(seg(wPct) + seg(lPct))}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="64" textAnchor="middle" fill="#e8e8e8" fontSize="12" fontWeight="700">
              {wPct}% / {lPct}% / {dPct}%
            </text>
          </svg>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', fontSize: 13 }}>
            <span>
              <span style={{ color: '#22c55e' }}>●</span> Wins {stats.wins}
            </span>
            <span>
              <span style={{ color: '#ef4444' }}>●</span> Losses {stats.losses}
            </span>
            <span>
              <span style={{ color: '#9ca3af' }}>●</span> Draws {stats.draws}
            </span>
          </div>
        </section>

        {/* Rating History Chart (Real SVG) */}
        <section style={{ background: '#1a1a2e', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid rgba(212,175,55,0.15)' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 16, fontSize: '1.1rem' }}>Rating History (Last 30 Games)</h2>
          <div style={{ width: '100%', height: '200px', position: 'relative', borderBottom: '1px solid #333', borderLeft: '1px solid #333' }}>
            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#81b64c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#81b64c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={polygonPoints} fill="url(#chartGradient)" />
              <polyline points={polylinePoints} fill="none" stroke="#81b64c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ position: 'absolute', top: 5, left: 10, fontSize: '10px', color: '#888', fontWeight: 600 }}>{maxElo}</div>
            <div style={{ position: 'absolute', bottom: 5, left: 10, fontSize: '10px', color: '#888', fontWeight: 600 }}>{minElo}</div>
          </div>
        </section>

        {/* 2x4 Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            ['🏆', 'Total Games', stats.gamesPlayed || 0],
            ['📈', 'Win Rate %', `${wPct || 0}%`],
            ['🎯', 'Average Accuracy', stats.avgAccuracy ? `${stats.avgAccuracy}%` : '—'],
            ['⚡', 'Current Streak', currentStreakLabel],
            ['🔥', 'Best Win Streak', stats.bestStreak || 0],
            ['🧩', 'Puzzles Solved', stats.puzzlesSolved || 0],
            ['⏱️', 'Longest Game', longestGame > 0 ? `${longestGame} moves` : '—'],
            ['♟️', 'Favourite Opening', favOpening],
          ].map(([icon, label, val]) => (
            <div
              key={label}
              style={{
                background: '#1a1a2e',
                borderRadius: 12,
                padding: 20,
                border: '1px solid rgba(212,175,55,0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <span style={{ fontSize: 13, opacity: 0.85 }}>{label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#d4af37' }}>{val}</div>
            </div>
          ))}
        </div>

        <section style={{ background: '#1a1a2e', borderRadius: 16, padding: 20, border: '1px solid rgba(212,175,55,0.12)' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 12, fontSize: '1.1rem' }}>Recent Games</h2>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ marginBottom: 16, opacity: 0.85 }}>No games yet — Play your first game!</p>
              <button
                type="button"
                onClick={() => navigate('/game')}
                style={{
                  minHeight: 44,
                  padding: '0 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#d4af37',
                  color: '#0a0a14',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Play
              </button>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((g, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 14,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    paddingBottom: 8,
                  }}
                >
                  <span>{g.result === 'win' ? '✓' : g.result === 'loss' ? '✗' : '='}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.opponent || '—'}</span>
                  <span style={{ opacity: 0.7, fontSize: 12 }}>{g.moveCount ?? '—'} mv</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          style={{
            marginTop: 28,
            width: '100%',
            minHeight: 48,
            borderRadius: 10,
            border: '1px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reset Stats
        </button>

        <ConfirmModal
          isOpen={confirmReset}
          title="Reset all statistics?"
          message="This will permanently delete all your game history, ELO, and stats."
          confirmText="Reset"
          cancelText="Cancel"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={onReset}
        />
      </div>
    </PageShell>
  )
}
