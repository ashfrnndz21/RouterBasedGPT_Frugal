'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'

interface Props {
  trigger: boolean
  count?: number
  duration?: number
  colors?: string[]
}

interface Particle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  shape: 'circle' | 'square' | 'star'
}

const DEFAULT_COLORS = ['#4F8EF7', '#A78BFA', '#00E5A0', '#F0A500', '#EF4444', '#22D3EE', '#F471B5']

export function Confetti({ trigger, count = 32, duration = 1.8, colors = DEFAULT_COLORS }: Props) {
  const [show, setShow] = useState(false)

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 300,
      y: -(Math.random() * 250 + 80),
      rotation: Math.random() * 720 - 360,
      scale: Math.random() * 0.6 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: (['circle', 'square', 'star'] as const)[Math.floor(Math.random() * 3)],
    }))
  }, [trigger, count, colors])

  useEffect(() => {
    if (trigger) {
      setShow(true)
      const t = setTimeout(() => setShow(false), duration * 1000 + 200)
      return () => clearTimeout(t)
    }
  }, [trigger, duration])

  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={`${trigger}-${p.id}`}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: [0, p.y * 0.3, p.y * -0.5],
            scale: [0, p.scale, p.scale * 0.5],
            rotate: p.rotation,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            position: 'absolute',
            width: p.shape === 'star' ? 10 : 8,
            height: p.shape === 'star' ? 10 : 8,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'star' ? '2px' : '2px',
            background: p.color,
          }}
        />
      ))}
    </div>
  )
}
