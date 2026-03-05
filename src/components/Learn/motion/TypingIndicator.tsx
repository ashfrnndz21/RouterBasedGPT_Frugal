'use client'
import { motion } from 'framer-motion'

interface Props {
  color?: string
}

export function TypingIndicator({ color = '#A78BFA' }: Props) {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  )
}
