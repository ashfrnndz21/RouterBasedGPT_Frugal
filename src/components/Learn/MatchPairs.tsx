'use client'
// src/components/Learn/MatchPairs.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScalePress } from '@/components/Learn/motion/ScalePress'

interface Pair { left: string; right: string }
interface Props {
  pairs: Pair[]
  onSubmit: (matches: Pair[]) => void
  disabled?: boolean
}

export default function MatchPairs({ pairs, onSubmit, disabled }: Props) {
  // Shuffle right side
  const [rights] = useState(() => [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5))
  const [matches, setMatches] = useState<Record<string, string>>({}) // left → right
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [justMatched, setJustMatched] = useState<string | null>(null)

  const handleLeft = (left: string) => {
    if (disabled) return
    setSelectedLeft(prev => prev === left ? null : left)
  }

  const handleRight = (right: string) => {
    if (disabled || !selectedLeft) return

    setMatches(prev => {
      const next = { ...prev }
      // Remove previous match for this right if any
      for (const k of Object.keys(next)) {
        if (next[k] === right) delete next[k]
      }
      next[selectedLeft] = right
      return next
    })
    // Flash match feedback
    setJustMatched(selectedLeft)
    navigator?.vibrate?.(10)
    setTimeout(() => setJustMatched(null), 600)
    setSelectedLeft(null)
  }

  const usedRights = new Set(Object.values(matches))
  const isComplete = pairs.every(p => matches[p.left])

  const handleSubmit = () => {
    const result = pairs.map(p => ({ left: p.left, right: matches[p.left] ?? '' }))
    onSubmit(result)
  }

  return (
    <div>
      <p className="text-[11px] text-white/30 mb-3">
        {selectedLeft ? `Now tap the matching right item for: "${selectedLeft}"` : 'Tap a left item, then tap its match on the right.'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          {pairs.map((p, i) => {
            const isSelected = selectedLeft === p.left
            const isMatched = !!matches[p.left]
            const isFlashing = justMatched === p.left
            return (
              <ScalePress key={p.left}>
                <motion.button
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25 }}
                  onClick={() => handleLeft(p.left)}
                  disabled={disabled}
                  className={`w-full p-2.5 rounded-xl border text-left text-[11px] leading-snug transition-all min-h-[52px] ${
                    isFlashing  ? 'border-[#00E5A0] bg-[#00E5A0]/15 text-[#00E5A0]' :
                    isSelected  ? 'border-[#4F8EF7] bg-[#4F8EF7]/10 text-[#4F8EF7]' :
                    isMatched   ? 'border-[#00E5A0]/40 bg-[#00E5A0]/05 text-white/70' :
                                  'border-white/[0.08] bg-[#1c1c26] text-white/80 hover:border-white/20'
                  }`}
                >
                  {p.left}
                  <AnimatePresence>
                    {isMatched && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[9px] text-[#00E5A0] mt-1 truncate"
                      >
                        → {matches[p.left]}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </ScalePress>
            )
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {rights.map((r, i) => {
            const isUsed = usedRights.has(r)
            const isMatchedToSelected = matches[selectedLeft ?? ''] === r
            return (
              <ScalePress key={r}>
                <motion.button
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25 }}
                  onClick={() => handleRight(r)}
                  disabled={disabled || (!selectedLeft)}
                  className={`w-full p-2.5 rounded-xl border text-left text-[11px] leading-snug transition-all min-h-[52px] ${
                    isMatchedToSelected ? 'border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0]' :
                    isUsed              ? 'border-white/[0.04] bg-white/[0.02] text-white/30 cursor-default' :
                    selectedLeft        ? 'border-[#A78BFA]/30 bg-[#A78BFA]/05 text-white/80 hover:border-[#A78BFA] cursor-pointer' :
                                          'border-white/[0.08] bg-[#1c1c26] text-white/80 cursor-default'
                  }`}
                >
                  {r}
                </motion.button>
              </ScalePress>
            )
          })}
        </div>
      </div>

      {!disabled && (
        <ScalePress>
          <button onClick={handleSubmit} disabled={!isComplete}
            className="mt-4 w-full bg-[#4F8EF7] disabled:opacity-30 text-white font-bold text-[13px] py-3 rounded-xl hover:bg-[#3a7de8] transition-colors">
            Submit Matches →
          </button>
        </ScalePress>
      )}
    </div>
  )
}
