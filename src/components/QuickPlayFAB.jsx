import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function QuickPlayFAB() {
  const loc = useLocation()
  const navigate = useNavigate()
  const [pulse, setPulse] = useState(false)

  const show = loc.pathname === '/' || loc.pathname === '/puzzles'

  useEffect(() => {
    if (!show) return
    const clicked = localStorage.getItem('chess_fab_clicked')
    if (clicked) return
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 5000)
    return () => clearTimeout(t)
  }, [show])

  if (!show) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const go = () => {
    localStorage.setItem('chess_fab_clicked', '1')
    setPulse(false)
    const difficulty = parseInt(localStorage.getItem('chess_difficulty') || '3', 10) || 3
    const color = localStorage.getItem('chess_playercolor') || 'w'
    const tc = parseInt(localStorage.getItem('chess_timecontrol') || '600', 10)
    navigate('/game', { state: { mode: 'ai', difficulty, timeControl: tc, playerColor: color } })
  }

  return (
    <motion.button
      type="button"
      aria-label="Quick Play"
      onClick={go}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: pulse ? [1, 1.06, 1] : 1,
        opacity: 1,
      }}
      transition={pulse ? { repeat: Infinity, duration: 1.2 } : { duration: 0.2 }}
      title="Quick Play"
      style={{
        position: 'fixed',
        zIndex: 95,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: 'linear-gradient(145deg, #d4af37, #b8962e)',
        color: '#fff',
        fontSize: 24,
        boxShadow: '0 4px 24px rgba(212,175,55,0.45)',
        bottom: isMobile ? 80 : 32,
        right: isMobile ? 20 : 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ♟
    </motion.button>
  )
}
