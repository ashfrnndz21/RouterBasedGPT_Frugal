'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  scale?: number
  haptic?: boolean
  onClick?: () => void
}

export function ScalePress({ children, className, scale = 0.97, haptic = false, onClick }: Props) {
  return (
    <motion.div
      whileTap={{ scale }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      onClick={() => {
        if (haptic) navigator?.vibrate?.(10)
        onClick?.()
      }}
    >
      {children}
    </motion.div>
  )
}
