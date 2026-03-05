'use client'
// src/app/learn/results/[sessionId]/page.tsx — Phased score reveal + tier celebration
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { scoreToTier, TIER_THRESHOLDS, BENCHMARK_SCORE } from '@/lib/types/learning'
import { CountUp } from '@/components/Learn/motion/CountUp'
import { Confetti } from '@/components/Learn/motion/Confetti'
import { StaggerList } from '@/components/Learn/motion/StaggerList'
import { FadeIn } from '@/components/Learn/motion/FadeIn'
import { ScalePress } from '@/components/Learn/motion/ScalePress'
import { SkeletonCircle, SkeletonLine, SkeletonCard } from '@/components/Learn/motion/Skeleton'

const TIER_ICONS: Record<string, string> = { spark: '⚡', build: '🔨', lead: '💎', apex: '⭐' }

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [data, setData] = useState<any>(null)
  const router = useRouter()

  // Phased reveal timing
  const [phase, setPhase] = useState(0) // 0=loading, 1=ring, 2=tier, 3=review

  useEffect(() => {
    fetch(`/api/learn/assess?sessionId=${sessionId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => {
        setData(d)
        // Start reveal phases
        setPhase(1)
        setTimeout(() => setPhase(2), 1200)
        setTimeout(() => setPhase(3), 1800)
      })
      .catch(() => {})
  }, [sessionId])

  if (!data) return (
    <div className="px-5 py-8 space-y-6">
      <div className="flex flex-col items-center gap-3">
        <SkeletonCircle size={90} />
        <SkeletonLine width="50%" height={16} />
        <SkeletonLine width="30%" height={12} />
      </div>
      <div className="space-y-2">
        <SkeletonCard height={56} />
        <SkeletonCard height={56} />
        <SkeletonCard height={56} />
      </div>
    </div>
  )

  const session = data.session
  const events = data.events ?? []
  const score = session?.final_score ?? 0
  const tier = scoreToTier(score)
  const tierInfo = TIER_THRESHOLDS[tier]
  const pct = score / 300
  const r = 36, circ = 2 * Math.PI * r, dash = circ * pct
  const correct = events.filter((e: any) => e.correct).length
  const passedBenchmark = score >= BENCHMARK_SCORE

  return (
    <div className="px-5 pb-6">
      {/* Confetti on high scores */}
      <Confetti trigger={phase >= 2 && (tier === 'lead' || tier === 'apex')} />

      <div className="text-center py-6">
        {/* Phase 1: Score ring draws from 0 */}
        <div className="relative w-[90px] h-[90px] mx-auto mb-3">
          {/* Glow ring */}
          <motion.div
            className="absolute inset-[-8px] rounded-full"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? {
              opacity: [0, 0.4, 0.2],
              boxShadow: `0 0 30px ${tierInfo.color}40, 0 0 60px ${tierInfo.color}20`,
            } : {}}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
            <motion.circle
              cx="45" cy="45" r={r} fill="none" stroke={tierInfo.color} strokeWidth="7"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={phase >= 1 ? { strokeDasharray: `${dash} ${circ}` } : {}}
              transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase >= 1 ? (
              <>
                <CountUp target={score} duration={1} delay={0.2} className="font-mono text-[20px] font-semibold" />
                <span className="text-[8px] text-white/30">/300</span>
              </>
            ) : (
              <span className="font-mono text-[20px] font-semibold text-white/20">0</span>
            )}
          </div>
        </div>

        <motion.h1
          className="font-display text-[20px] font-bold mb-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {session?.domain?.replace('_', ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase())}
        </motion.h1>

        {/* Phase 2: Tier badge pops in */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.15, 1], opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-2"
              style={{ background: `${tierInfo.color}18`, borderColor: `${tierInfo.color}40` }}
            >
              <span>{TIER_ICONS[tier]}</span>
              <span className="font-display text-[14px] font-bold" style={{ color: tierInfo.color }}>{tierInfo.label}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {phase >= 2 && (
          <FadeIn delay={0.2}>
            <p className="text-[12px] text-white/40">
              <CountUp target={correct} duration={0.5} className="font-mono" /> / {events.length} correct
            </p>
          </FadeIn>
        )}

        {/* Benchmark banner */}
        <AnimatePresence>
          {phase >= 2 && passedBenchmark && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
              className="mt-3 px-4 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: `${tierInfo.color}15`, color: tierInfo.color, border: `1px solid ${tierInfo.color}30` }}
            >
              🎉 You passed the benchmark!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phase 3: Question review */}
      {phase >= 3 && events.length > 0 && (
        <FadeIn delay={0}>
          <h2 className="font-display text-[14px] font-bold mb-3">Question Review</h2>
          <StaggerList stagger={0.06} className="flex flex-col gap-2 mb-5">
            {events.map((e: any, i: number) => (
              <div key={e.id} className={`p-3 rounded-xl border text-[11px] ${
                e.correct ? 'border-[#00E5A0]/20 bg-[#00E5A0]/05' : 'border-[#EF4444]/20 bg-[#EF4444]/05'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{e.correct ? '✓' : '✗'}</span>
                  <span className="font-mono text-white/30">Q{i + 1}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/30 capitalize">{e.difficulty}</span>
                  <span className="ml-auto font-mono" style={{ color: e.correct ? '#00E5A0' : '#EF4444' }}>
                    {e.score_delta > 0 ? '+' : ''}{e.score_delta}
                  </span>
                </div>
                <p className="text-white/60 leading-relaxed">{e.question_text}</p>
              </div>
            ))}
          </StaggerList>
        </FadeIn>
      )}

      {/* CTAs */}
      {phase >= 3 && (
        <FadeIn delay={0.3}>
          <div className="flex flex-col gap-3">
            <ScalePress>
              <Link href="/learn/library"
                className="block py-3 text-center border border-white/[0.08] rounded-xl text-[13px] text-white/70 hover:border-white/20 transition-colors">
                📚 View Learning Resources
              </Link>
            </ScalePress>
            <ScalePress>
              <Link href="/learn/assess"
                className="block py-3 text-center bg-[#4F8EF7] text-white font-bold text-[13px] rounded-xl hover:bg-[#3a7de8] transition-colors">
                Take Another Assessment →
              </Link>
            </ScalePress>
          </div>
        </FadeIn>
      )}
    </div>
  )
}
