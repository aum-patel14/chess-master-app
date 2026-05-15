import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onCancel])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onCancel?.()}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(100%, 420px)',
              background: '#1a1a2e',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 12,
              padding: '24px 22px',
              color: '#e8e8e8',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <h2 id="confirm-modal-title" style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 700 }}>
              {title}
            </h2>
            <p style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.5, color: 'rgba(232,232,232,0.85)' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onCancel?.()}
                style={{
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#e8e8e8',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => onConfirm?.()}
                style={{
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: danger ? '#ef4444' : '#d4af37',
                  color: danger ? '#fff' : '#0a0a14',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
