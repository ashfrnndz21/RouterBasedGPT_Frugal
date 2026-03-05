'use client'
import { useState, useEffect } from 'react'

interface Props {
  text: string
  speed?: number // words per second
  className?: string
  onComplete?: () => void
}

export function CharacterReveal({ text, speed = 20, className, onComplete }: Props) {
  const words = text.split(' ')
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= words.length) {
      onComplete?.()
      return
    }
    const interval = 1000 / speed
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1)
    }, interval)
    return () => clearTimeout(timer)
  }, [visibleCount, words.length, speed, onComplete])

  return (
    <span className={className}>
      {words.slice(0, visibleCount).join(' ')}
      {visibleCount < words.length && (
        <span className="inline-block w-[2px] h-[1em] ml-0.5 animate-pulse" style={{ background: '#A78BFA', verticalAlign: 'text-bottom' }} />
      )}
    </span>
  )
}
