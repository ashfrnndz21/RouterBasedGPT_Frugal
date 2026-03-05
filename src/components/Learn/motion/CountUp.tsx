'use client'
import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValue, useTransform, motion, animate } from 'framer-motion'

interface Props {
  target: number
  duration?: number
  delay?: number
  decimals?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function CountUp({ target, duration = 1, delay = 0, decimals = 0, className, prefix = '', suffix = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => {
    const val = decimals > 0 ? v.toFixed(decimals) : Math.round(v)
    return `${prefix}${val}${suffix}`
  })
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    if (!isInView) return
    const timeout = setTimeout(() => {
      const controls = animate(motionValue, target, {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
      })
      return () => controls.stop()
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [isInView, target, duration, delay, motionValue])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v))
    return () => unsubscribe()
  }, [rounded])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
