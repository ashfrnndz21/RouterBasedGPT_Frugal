'use client'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ReactNode, Children } from 'react'

interface Props {
  children: ReactNode
  stagger?: number
  delay?: number
  y?: number
  className?: string
}

const container = (stagger: number, delay: number): Variants => ({
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: delay,
      staggerChildren: stagger,
    },
  },
})

const item = (y: number): Variants => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
})

export function StaggerList({ children, stagger = 0.06, delay = 0, y = 14, className }: Props) {
  return (
    <motion.div
      variants={container(stagger, delay)}
      initial="hidden"
      animate="show"
      className={className}
    >
      {Children.map(children, (child) =>
        child ? (
          <motion.div variants={item(y)}>
            {child}
          </motion.div>
        ) : null
      )}
    </motion.div>
  )
}
