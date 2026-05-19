import { motion } from 'framer-motion'

export default function PageShell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'circOut' }}
      style={{ minHeight: '100vh', width: '100%' }}
    >
      {children}
    </motion.div>
  )
}
