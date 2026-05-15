import { motion } from 'framer-motion'

export default function PageShell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  )
}
