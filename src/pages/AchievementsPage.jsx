import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../components/PageShell'
import { ACHIEVEMENTS, getUnlockedAchievements } from '../utils/achievements'
import { useToast } from '../hooks/useToast'

export default function AchievementsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [unlocked, setUnlocked] = useState(() => getUnlockedAchievements())

  useEffect(() => {
    setUnlocked(getUnlockedAchievements())
  }, [])

  const count = unlocked.length
  const total = ACHIEVEMENTS.length

  const list = useMemo(
    () =>
      ACHIEVEMENTS.map((a) => ({
        ...a,
        ok: unlocked.includes(a.id),
      })),
    [unlocked]
  )

  const share = async () => {
    const lines = ACHIEVEMENTS.map((a) => `${a.icon} ${a.title}${unlocked.includes(a.id) ? ' ✓' : ''}`).join('\n')
    const text = `ChessMaster Pro Achievements (${count}/${total})\n${lines}`
    try {
      await navigator.clipboard.writeText(text)
      showToast('Achievement list copied ✓', 'success')
    } catch {
      showToast('Could not copy', 'error')
    }
  }

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

        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>Achievements</h1>
          <p style={{ opacity: 0.85 }}>{count} / {total} unlocked</p>
          <div style={{ height: 8, borderRadius: 4, background: '#333', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ width: `${(count / total) * 100}%`, height: '100%', background: '#d4af37', transition: 'width 0.3s' }} />
          </div>
        </header>

        <button
          type="button"
          onClick={share}
          style={{
            width: '100%',
            minHeight: 48,
            marginBottom: 20,
            borderRadius: 10,
            border: 'none',
            background: '#d4af37',
            color: '#0a0a14',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Share Achievements
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {list.map((a) => (
            <div
              key={a.id}
              style={{
                background: a.ok ? '#1a1a2e' : '#12121f',
                borderRadius: 12,
                padding: 14,
                border: a.ok ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.08)',
                opacity: a.ok ? 1 : 0.55,
                filter: a.ok ? 'none' : 'grayscale(1)',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 28 }}>{a.ok ? a.icon : a.secret ? '🔒' : a.icon}</div>
              <div style={{ fontWeight: 800, color: a.ok ? '#d4af37' : '#888', fontSize: 14 }}>
                {a.ok ? a.title : a.secret ? '???' : a.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>{a.ok || !a.secret ? a.desc : 'Hidden achievement'}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

export function AchievementUnlockModal({ achievement, onClose }) {
  useEffect(() => {
    if (!achievement) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [achievement, onClose])

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 24,
            zIndex: 15000,
            background: '#1a1a2e',
            border: '2px solid #d4af37',
            borderRadius: 16,
            padding: 20,
            color: '#e8e8e8',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: 'Cinzel, serif', color: '#d4af37', fontWeight: 800, marginBottom: 8 }}>Achievement Unlocked!</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 48 }}>{achievement.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{achievement.title}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{achievement.desc}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
