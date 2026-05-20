import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { readStats, readElo, STATS_KEY, ELO_KEY, HISTORY_KEY } from '../utils/chessStats'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { useState } from 'react'

export default function StatsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)

  const stats = useMemo(() => readStats(), [])
  const elo = useMemo(() => readElo(), [])

  let history = []
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(0, 5)
  } catch {
    history = []
  }

  const total = stats.wins + stats.losses + stats.draws || 1
  const wPct = Math.round((stats.wins / total) * 100)
  const lPct = Math.round((stats.losses / total) * 100)
  const dPct = Math.max(0, 100 - wPct - lPct)

  const circumference = 2 * Math.PI * 52
  const seg = (pct) => (pct / 100) * circumference

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

        {/* Rating History Chart (Mock SVG) */}
        <section style={{ background: '#1a1a2e', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid rgba(212,175,55,0.15)' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 16, fontSize: '1.1rem' }}>Rating History (Last 30 Games)</h2>
          <div style={{ width: '100%', height: '200px', position: 'relative', borderBottom: '1px solid #333', borderLeft: '1px solid #333' }}>
            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,100 0,60 10,55 20,65 30,50 40,45 50,30 60,40 70,25 80,15 90,20 100,10 100,100" fill="url(#chartGradient)" />
              <polyline points="0,60 10,55 20,65 30,50 40,45 50,30 60,40 70,25 80,15 90,20 100,10" fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: '-30px', fontSize: '10px', color: '#666' }}>Max</div>
            <div style={{ position: 'absolute', bottom: 0, left: '-30px', fontSize: '10px', color: '#666' }}>Min</div>
          </div>
        </section>

        {/* 2x3 Stats Grid */}
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
            ['🎯', 'Average Accuracy', '82.4%'],
            ['🔥', 'Best Win Streak', stats.bestStreak || 0],
            ['⏱️', 'Longest Game', '68 moves'],
            ['♟️', 'Favourite Opening', 'Sicilian Defence'],
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
