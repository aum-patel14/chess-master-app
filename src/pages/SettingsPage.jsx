import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from '../hooks/useToast'
import { useGame } from '../context/GameContext'
import ConfirmModal from '../components/ConfirmModal'

const THEMES = [
  { id: 'classic', label: 'Classic', light: '#f0d9b5', dark: '#b58863' },
  { id: 'ocean', label: 'Ocean', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'wood', label: 'Wood', light: '#f0c070', dark: '#8a4f2a' },
  { id: 'midnight', label: 'Midnight', light: '#6f8fa4', dark: '#2e4057' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { dispatch } = useGame()

  const [theme, setTheme] = useLocalStorage('chess_theme', 'classic')
  const [, setPieces] = useLocalStorage('chess_pieces', 'standard')
  const [soundTheme, setSoundTheme] = useLocalStorage('chess_sound_theme', 'wood')
  const [animationSpeed, setAnimationSpeed] = useLocalStorage('chess_animation_speed', 'normal')
  const [highlightStyle, setHighlightStyle] = useLocalStorage('chess_highlight_style', 'glow')
  const [confirmMove, setConfirmMove] = useLocalStorage('chess_confirm_move', false)
  const [difficulty, setDifficulty] = useLocalStorage('chess_difficulty', 'medium')
  const [timeControl, setTimeControl] = useLocalStorage('chess_timecontrol', 600)
  const [showHints, setShowHints] = useLocalStorage('chess_show_hints', true)
  const [showCoords, setShowCoords] = useLocalStorage('chess_show_coords', true)
  const [autoPromote, setAutoPromote] = useLocalStorage('chess_autopromote', false)

  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }, [theme, dispatch])

  useEffect(() => {
    const map = { easy: 2, medium: 3, hard: 4 }
    const lvl = map[difficulty] || 3
    dispatch({ type: 'SET_DIFFICULTY', payload: lvl })
  }, [difficulty, dispatch])

  useEffect(() => {
    const mins = timeControl === 0 ? null : Math.max(1, Math.round(timeControl / 60))
    dispatch({ type: 'SET_TIME_CONTROL', payload: mins })
  }, [timeControl, dispatch])

  const toggle = (val, set) => set(!val)

  const pill = (active) => ({
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    background: active ? '#d4af37' : 'rgba(255,255,255,0.06)',
    color: active ? '#0a0a14' : '#aaa',
  })

  const doReset = () => {
      'chess_theme',
      'chess_sound_theme',
      'chess_animation_speed',
      'chess_highlight_style',
      'chess_confirm_move',
      'chess_difficulty',
      'chess_timecontrol',
      'chess_show_hints',
      'chess_show_coords',
      'chess_autopromote',
    keys.forEach((k) => localStorage.removeItem(k))
    showToast('Settings reset to defaults', 'info')
    setResetOpen(false)
    window.location.reload()
  }

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [navigate])

  const Switch = ({ on, onToggle, label, help }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{help}</div>
      </div>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          onToggle()
          if (label.includes('Sound') && !on) showToast('Sound on', 'info')
        }}
        style={{
          width: 52,
          height: 28,
          borderRadius: 14,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          background: on ? '#d4af37' : '#333',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 26 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  )

  return (
    <PageShell>
      <div
        style={{
          background: '#0a0a14',
          color: '#e8e8e8',
          minHeight: '100vh',
          padding: '20px 16px 100px',
          maxWidth: 1000,
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

        <h1 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 20 }}>Settings</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <section style={{ background: '#1a1a2e', borderRadius: 14, padding: 18, border: '1px solid rgba(212,175,55,0.12)' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 14, fontSize: '1.05rem' }}>Gameplay</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} type="button" style={pill(difficulty === d)} onClick={() => { setDifficulty(d); showToast('Difficulty saved', 'success') }}>
                  {d}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {[60, 180, 600, 1800, 0].map((s) => (
                <button
                  key={s}
                  type="button"
                  style={pill(timeControl === s)}
                  onClick={() => {
                    setTimeControl(s)
                    showToast('Time control saved', 'success')
                  }}
                >
                  {s === 0 ? '∞' : `${s / 60}m`}
                </button>
              ))}
            </div>
            <Switch on={showHints} onToggle={() => setShowHints(!showHints)} label="Show hints" help="In-game hint availability" />
            <Switch on={autoPromote} onToggle={() => setAutoPromote(!autoPromote)} label="Auto-promote" help="Auto-queen on promotion" />
            <Switch on={confirmMove} onToggle={() => setConfirmMove(!confirmMove)} label="Confirm Move" help="Require confirmation to send move" />
          </section>

          <section style={{ background: '#1a1a2e', borderRadius: 14, padding: 18, border: '1px solid rgba(212,175,55,0.12)' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 14, fontSize: '1.05rem' }}>Appearance</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10,
              }}
            >
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id)
                    setPieces('standard')
                    showToast('Theme changed ✓', 'success')
                  }}
                  style={{
                    position: 'relative',
                    borderRadius: 10,
                    padding: 10,
                    border: theme === t.id ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                    background: '#0a0a14',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {theme === t.id && (
                    <span style={{ position: 'absolute', top: 6, right: 6, color: '#d4af37', fontWeight: 900 }}>✓</span>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: 48, height: 48, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ background: t.light }} />
                    <div style={{ background: t.dark }} />
                    <div style={{ background: t.dark }} />
                    <div style={{ background: t.light }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
                </button>
              ))}
            </div>
            <Switch on={showCoords} onToggle={() => setShowCoords(!showCoords)} label="Coordinates" help="Show rank & file labels" />
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Animation Speed</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['slow', 'normal', 'instant'].map(s => (
                  <button key={s} type="button" style={pill(animationSpeed === s)} onClick={() => setAnimationSpeed(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Highlight Style</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['dot', 'arrow', 'glow'].map(s => (
                  <button key={s} type="button" style={pill(highlightStyle === s)} onClick={() => setHighlightStyle(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section style={{ background: '#1a1a2e', borderRadius: 14, padding: 18, marginTop: 20, border: '1px solid rgba(212,175,55,0.12)' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 12 }}>Audio</h2>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Move Sound</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['wood', 'digital', 'silent'].map(s => (
              <button key={s} type="button" style={pill(soundTheme === s)} onClick={() => { setSoundTheme(s); if(s!=='silent') showToast(`${s} sound selected`, 'info'); }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setResetOpen(true)}
          style={{
            marginTop: 24,
            width: '100%',
            minHeight: 48,
            borderRadius: 10,
            border: '1px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>

        <ConfirmModal
          isOpen={resetOpen}
          title="Reset All Settings?"
          message="All your preferences will be reset to defaults. Game history and stats will be kept."
          confirmText="Reset"
          cancelText="Cancel"
          danger
          onCancel={() => setResetOpen(false)}
          onConfirm={doReset}
        />
      </div>
    </PageShell>
  )
}
