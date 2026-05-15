import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { readStats, readElo } from '../utils/chessStats'

const AI_PLAYERS = [
  { name: 'Magnus_Bot', elo: 2850, wins: 1240, country: '🇳🇴' },
  { name: 'Hikaru_AI', elo: 2750, wins: 980, country: '🇺🇸' },
  { name: 'DeepBlue_v2', elo: 2680, wins: 876, country: '🤖' },
  { name: 'ChessWizard', elo: 2100, wins: 340, country: '🇩🇪' },
  { name: 'PawnStar', elo: 1850, wins: 220, country: '🇧🇷' },
  { name: 'RookRider', elo: 1600, wins: 145, country: '🇮🇳' },
  { name: 'KnightMare', elo: 1400, wins: 89, country: '🇬🇧' },
  { name: 'BishopBoss', elo: 1200, wins: 54, country: '🇯🇵' },
  { name: 'EndgamePro', elo: 1050, wins: 28, country: '🇦🇺' },
]

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('local')
  const [q, setQ] = useState('')

  const myElo = readElo()
  const myStats = readStats()

  const rows = useMemo(() => {
    const me = { name: 'You', elo: myElo, wins: myStats.wins || 0, country: '🇮🇳', isUser: true }
    const all = [...AI_PLAYERS, me].sort((a, b) => b.elo - a.elo)
    return all.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [myElo, myStats.wins])

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())), [rows, q])

  const userRank = rows.find((r) => r.isUser)?.rank ?? '—'

  return (
    <PageShell>
      <div style={{ background: '#0a0a14', color: '#e8e8e8', minHeight: '100vh', padding: '20px 16px 100px', maxWidth: 960, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginBottom: 16,
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['local', 'global'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                minHeight: 44,
                padding: '0 18px',
                borderRadius: 8,
                border: tab === t ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.12)',
                background: tab === t ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: tab === t ? '#d4af37' : '#aaa',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'global' ? 'Global (Coming Soon)' : 'Local'}
            </button>
          ))}
        </div>

        {tab === 'global' ? (
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: 14,
              padding: 28,
              textAlign: 'center',
              border: '1px solid rgba(212,175,55,0.15)',
            }}
          >
            🌍 Global rankings coming soon! Complete 10 games to unlock.
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#1a1a2e',
                borderRadius: 14,
                padding: 20,
                marginBottom: 16,
                border: '1px solid rgba(212,175,55,0.25)',
                fontFamily: 'Cinzel, serif',
                color: '#d4af37',
                textAlign: 'center',
              }}
            >
              You are ranked #{userRank} of {rows.length}
            </div>

            <input
              type="search"
              placeholder="Search players…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: '100%',
                minHeight: 44,
                marginBottom: 14,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: '#1a1a2e',
                color: '#e8e8e8',
                padding: '0 14px',
                fontSize: 16,
                boxSizing: 'border-box',
              }}
            />

            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.85 }}>No players found matching &apos;{q}&apos;</p>
            ) : (
              <>
                <div className="lb-desktop" style={{ display: 'none', flexDirection: 'column', gap: 4 }}>
                  <style>{`
                    @media (min-width: 768px) {
                      .lb-desktop { display: flex !important; }
                      .lb-mobile { display: none !important; }
                    }
                  `}</style>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 40px 1fr 80px 72px',
                      gap: 8,
                      fontSize: 12,
                      opacity: 0.7,
                      padding: '8px 12px',
                    }}
                  >
                    <span>#</span>
                    <span />
                    <span>Name</span>
                    <span>ELO</span>
                    <span>Wins</span>
                  </div>
                  {filtered.map((r) => (
                    <div
                      key={r.name + r.rank}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 40px 1fr 80px 72px',
                        gap: 8,
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: r.isUser ? 'rgba(212,175,55,0.18)' : '#1a1a2e',
                        border: r.isUser ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.06)',
                        fontWeight: r.isUser ? 700 : 500,
                      }}
                    >
                      <span>
                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
                      </span>
                      <span>{r.country}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      <span style={{ color: '#d4af37' }}>{r.elo}</span>
                      <span>{r.wins}</span>
                    </div>
                  ))}
                </div>

                <div className="lb-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map((r) => (
                    <div
                      key={r.name + r.rank}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: r.isUser ? 'rgba(212,175,55,0.18)' : '#1a1a2e',
                        border: r.isUser ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ fontSize: 20 }}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.country} {r.name}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Wins {r.wins}</div>
                      </div>
                      <div style={{ color: '#d4af37', fontWeight: 800 }}>{r.elo}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
