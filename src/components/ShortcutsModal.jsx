import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ROWS = [
  ['?', 'Show this help'],
  ['N', 'New game'],
  ['F', 'Flip board'],
  ['U', 'Undo move'],
  ['H', 'Hint'],
  ['S', 'Save game'],
  ['←', 'Previous move (review)'],
  ['→', 'Next move (review)'],
  ['Esc', 'Close modal'],
]

export default function ShortcutsModal({ open, onClose, isMobile }) {
  useEffect(() => {
    if (!open) return
    const fn = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 12000,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#1a1a2e',
                borderRadius: 12,
                padding: 20,
                maxWidth: 400,
                color: '#e8e8e8',
                border: '1px solid rgba(212,175,55,0.25)',
              }}
            >
              <h2 style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', marginBottom: 12 }}>Controls Help</h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Tap squares to move pieces. Use on-screen buttons for undo, new game, hints, and more.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  minHeight: 44,
                  borderRadius: 10,
                  border: 'none',
                  background: '#d4af37',
                  color: '#0a0a14',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kbd-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a2e',
              borderRadius: 12,
              padding: '22px 24px',
              maxWidth: 520,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#e8e8e8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 id="kbd-title" style={{ fontFamily: 'Cinzel, serif', color: '#d4af37', margin: 0 }}>
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  border: 'none',
                  background: 'transparent',
                  color: '#e8e8e8',
                  fontSize: 22,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px 16px', fontSize: 14 }}>
              {ROWS.map(([k, a]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <div style={{ fontFamily: 'monospace', color: '#d4af37', fontWeight: 700 }}>{k}</div>
                  <div>{a}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
