import { AnimatePresence, motion } from 'framer-motion'

const TYPE_META = {
  success: { border: '#22c55e', icon: '✓' },
  error: { border: '#ef4444', icon: '✗' },
  info: { border: '#3b82f6', icon: 'ℹ' },
  warning: { border: '#f59e0b', icon: '⚠' },
  'coming-soon': { border: '#d4af37', icon: 'ℹ' },
}

function metaFor(type) {
  return TYPE_META[type] || TYPE_META.info
}

export function ToastContainer({ toasts }) {
  return (
    <div
      className="toast-stack"
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: 20,
        right: 20,
        left: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        pointerEvents: 'none',
        maxWidth: '100vw',
        paddingLeft: 12,
        paddingRight: 12,
        boxSizing: 'border-box',
      }}
      aria-live="polite"
    >
      <style>{`
        @media (max-width: 767px) {
          .toast-stack {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%);
            align-items: center !important;
          }
        }
      `}</style>
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { border, icon } = metaFor(t.type)
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                pointerEvents: 'auto',
                minWidth: 280,
                maxWidth: 360,
                width: 'min(360px, calc(100vw - 24px))',
                background: '#1a1a2e',
                color: '#e8e8e8',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${border}`,
                padding: '12px 14px 10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  style={{
                    fontSize: 16,
                    lineHeight: 1.2,
                    flexShrink: 0,
                    marginTop: 1,
                    color: border,
                  }}
                  aria-hidden
                >
                  {icon}
                </span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, flex: 1 }}>{t.message}</p>
              </div>
              <div
                style={{
                  marginTop: 10,
                  height: 3,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ scaleX: 1, transformOrigin: 'left' }}
                  animate={{ scaleX: 0, transformOrigin: 'left' }}
                  transition={{ duration: (t.duration || 3000) / 1000, ease: 'linear' }}
                  style={{
                    height: '100%',
                    width: '100%',
                    background: border,
                  }}
                />
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
