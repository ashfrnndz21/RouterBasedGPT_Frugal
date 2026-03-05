'use client'
import { motion } from 'framer-motion'

interface Props {
  streak: number
  className?: string
}

export function StreakFlame({ streak, className }: Props) {
  return (
    <motion.div
      key={streak}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.35, 1] }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={{
        display: 'inline-flex',
        filter: streak >= 3 ? `drop-shadow(0 0 ${Math.min(streak * 2, 12)}px rgba(240,165,0,0.5))` : 'none',
      }}
    >
      <span className="text-base">🔥</span>
      <span className="text-[10px] font-mono font-bold ml-0.5" style={{ color: '#F0A500' }}>{streak}</span>
    </motion.div>
  )
}
