'use client'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

const shimmer: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear' as const,
    },
  },
}

const baseStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
}

export function SkeletonLine({ width = '100%', height = 12, className = '' }: { width?: string | number; height?: number; className?: string }) {
  return (
    <motion.div
      initial={{ backgroundPosition: '-200% 0' }}
      animate={{ backgroundPosition: '200% 0' }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      className={`rounded-md ${className}`}
      style={{ ...baseStyle, width, height }}
    />
  )
}

export function SkeletonCircle({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <motion.div
      initial={{ backgroundPosition: '-200% 0' }}
      animate={{ backgroundPosition: '200% 0' }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      className={`rounded-full ${className}`}
      style={{ ...baseStyle, width: size, height: size }}
    />
  )
}

export function SkeletonCard({ height = 120, className = '' }: { height?: number; className?: string }) {
  return (
    <motion.div
      initial={{ backgroundPosition: '-200% 0' }}
      animate={{ backgroundPosition: '200% 0' }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      className={`rounded-2xl ${className}`}
      style={{ ...baseStyle, width: '100%', height }}
    />
  )
}
