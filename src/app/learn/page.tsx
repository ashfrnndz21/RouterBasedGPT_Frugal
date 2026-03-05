'use client'
// src/app/learn/page.tsx — Learner Home Dashboard with staggered animations + skeleton loading
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { scoreToTier, BENCHMARK_SCORE } from '@/lib/types/learning'
import type { DomainScore, ModuleProgress } from '@/lib/types/learning'
import { Flame, Target, Play, ChevronRight, Zap, TrendingUp } from 'lucide-react'
import { FadeIn } from '@/components/Learn/motion/FadeIn'
import { StaggerList } from '@/components/Learn/motion/StaggerList'
import { ScalePress } from '@/components/Learn/motion/ScalePress'
import { SkeletonCard, SkeletonCircle, SkeletonLine } from '@/components/Learn/motion/Skeleton'

interface DashData {
  learner: any
  domainScores: DomainScore[]
  moduleProgress: ModuleProgress[]
}

function ScoreRing({ score, domain, color, emoji, delay }: { score: number; domain: string; color: string; emoji: string; delay: number }) {
  const pct = score / 300
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const tier = scoreToTier(score)

  return (
    <ScalePress>
      <Link href={`/learn/assess/${domain}`} className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
        <motion.div
          className="relative w-[64px] h-[64px]"
          whileHover={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
            <motion.circle
              cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4"
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${dash} ${circ}` }}
              transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg">{emoji}</span>
          </div>
        </motion.div>
        <div className="text-center">
          <div className="text-[10px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">{domain}</div>
          <div className="text-[9px] font-mono font-bold" style={{ color }}>{score} · {tier}</div>
        </div>
      </Link>
    </ScalePress>
  )
}

export default function LearnHome() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/learn/login'); return }
    if (status !== 'authenticated') return
    fetch('/api/learn/profile')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, router])

  if (loading) {
    return (
      <div className="px-5 pb-4 space-y-5 mt-2">
        {/* Skeleton greeting card */}
        <SkeletonCard height={120} />
        {/* Skeleton score rings */}
        <div>
          <SkeletonLine width="30%" height={10} className="mb-3" />
          <div className="flex gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <SkeletonCircle size={64} />
                <SkeletonLine width={40} height={8} />
              </div>
            ))}
          </div>
        </div>
        {/* Skeleton recommended */}
        <SkeletonCard height={100} />
        {/* Skeleton continue learning */}
        <div>
          <SkeletonLine width="40%" height={10} className="mb-3" />
          <SkeletonCard height={70} />
          <div className="mt-2.5">
            <SkeletonCard height={70} />
          </div>
        </div>
      </div>
    )
  }

  const learner = data?.learner
  const scores = data?.domainScores ?? []
  const progress = data?.moduleProgress ?? []
  const lowestDomain = scores.length > 0
    ? scores.reduce((a, b) => a.score < b.score ? a : b)
    : null
  const inProgress = progress.filter(p => p.status === 'in_progress')

  const DOMAIN_META: Record<string, { color: string; emoji: string; label: string }> = {
    ai_essentials:      { color: '#4F8EF7', emoji: '🤖', label: 'AI Core' },
    data_science:       { color: '#00E5A0', emoji: '📊', label: 'Data Sci' },
    mlops:              { color: '#EF4444', emoji: '⚙️', label: 'MLOps' },
    responsible_ai:     { color: '#A78BFA', emoji: '⚖️', label: 'Ethics' },
    prompt_engineering: { color: '#F0A500', emoji: '✍️', label: 'Prompts' },
    cloud_ai:           { color: '#22D3EE', emoji: '☁️', label: 'Cloud' },
    ai_strategy:        { color: '#F471B5', emoji: '🗺️', label: 'Strategy' },
    ai_security:        { color: '#FB923C', emoji: '🔒', label: 'Security' },
  }

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0)
  const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0

  return (
    <div className="px-5 pb-4">
      {/* Greeting card */}
      <FadeIn delay={0}>
        <div className="relative overflow-hidden rounded-2xl p-5 mb-5 mt-2"
          style={{ background: 'linear-gradient(135deg, #4F8EF7 0%, #A78BFA 50%, #F471B5 100%)' }}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-[20px] font-bold leading-tight">
                  Hey {learner?.name?.split(' ')[0] ?? 'there'}
                </h1>
                <p className="text-[12px] text-white/70 mt-0.5">
                  Ready to level up today?
                </p>
              </div>
              <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center font-bold text-[13px]">
                {(learner?.name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
            </div>
            <StaggerList stagger={0.08} delay={0.15} y={8} className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                <Flame size={13} />
                <span className="font-bold">{learner?.streak ?? 0}-day streak</span>
              </div>
              {scores.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                  <TrendingUp size={13} />
                  <span className="font-bold">Avg {avgScore}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                <Zap size={13} />
                <span className="font-bold">{learner?.total_pts ?? 0} pts</span>
              </div>
            </StaggerList>
          </div>
        </div>
      </FadeIn>

      {/* Score rings */}
      {scores.length > 0 && (
        <FadeIn delay={0.15}>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold text-white/80">Your Domains</h2>
              <Link href="/learn/assess" className="text-[11px] text-[#4F8EF7] font-semibold flex items-center gap-0.5">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {scores.map((s, i) => {
                const meta = DOMAIN_META[s.domain] ?? { color: '#4F8EF7', emoji: '🔹', label: s.domain }
                return (
                  <ScoreRing key={s.domain} score={s.score} domain={meta.label} color={meta.color} emoji={meta.emoji} delay={i * 0.08} />
                )
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Recommended action */}
      {lowestDomain && (
        <FadeIn delay={0.3}>
          <ScalePress>
            <Link href={`/learn/assess/${lowestDomain.domain}`}
              className="block rounded-2xl p-4 mb-5 border border-[#4F8EF7]/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4F8EF7]/8 via-transparent to-[#A78BFA]/5" />
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4F8EF7]/5 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-[#4F8EF7]" />
                  <span className="text-[10px] font-bold text-[#4F8EF7] uppercase tracking-widest">Recommended</span>
                </div>
                <div className="text-[15px] font-bold mb-1">
                  Improve {DOMAIN_META[lowestDomain.domain]?.label ?? lowestDomain.domain}
                </div>
                <div className="text-[11px] text-white/50 mb-3">
                  Score: {lowestDomain.score} / {BENCHMARK_SCORE} benchmark. Scout will guide you.
                </div>
                <div className="inline-flex items-center gap-2 bg-[#4F8EF7] text-white text-[12px] font-bold px-4 py-2 rounded-xl group-hover:shadow-lg group-hover:shadow-[#4F8EF7]/20 transition-shadow">
                  <Play size={14} fill="white" />
                  Start Assessment
                </div>
              </div>
            </Link>
          </ScalePress>
        </FadeIn>
      )}

      {/* Continue learning */}
      {inProgress.length > 0 && (
        <FadeIn delay={0.4}>
          <div className="mb-5">
            <h2 className="text-[13px] font-bold text-white/80 mb-3">Continue Learning</h2>
            <StaggerList stagger={0.08} delay={0.1} className="flex flex-col gap-2.5">
              {inProgress.slice(0, 3).map(p => (
                <ScalePress key={p.moduleId}>
                  <div className="bg-[#13131a] border border-white/[0.06] rounded-xl p-3.5 cursor-pointer hover:border-[#4F8EF7]/20 transition-all group">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] flex-shrink-0"
                        style={{ background: `${DOMAIN_META[p.module?.domain ?? '']?.color ?? '#4F8EF7'}15` }}>
                        {p.module?.type === 'video' ? '📹' : p.module?.type === 'lab' ? '💻' : '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold truncate group-hover:text-[#4F8EF7] transition-colors">{p.module?.title}</div>
                        <div className="text-[10px] text-white/35">{p.module?.source} · {p.module?.durationMinutes}m</div>
                      </div>
                      <ChevronRight size={16} className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" />
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{
                          background: `linear-gradient(90deg, ${DOMAIN_META[p.module?.domain ?? '']?.color ?? '#4F8EF7'}, ${DOMAIN_META[p.module?.domain ?? '']?.color ?? '#4F8EF7'}80)`,
                        }}
                      />
                    </div>
                    <div className="text-[9px] text-white/25 mt-1 font-mono">{p.pct}% complete</div>
                  </div>
                </ScalePress>
              ))}
            </StaggerList>
          </div>
        </FadeIn>
      )}

      {/* No scores yet — onboarding CTA */}
      {scores.length === 0 && (
        <FadeIn delay={0.2}>
          <div className="text-center py-12 px-4">
            <motion.div
              className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F8EF7 0%, #A78BFA 100%)' }}
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
            >
              <Target size={32} className="text-white" />
            </motion.div>
            <h2 className="text-[18px] font-bold mb-2">Map your AI skills</h2>
            <p className="text-[12px] text-white/40 mb-6 max-w-[280px] mx-auto leading-relaxed">
              Scout assesses 8 AI domains in about 12 minutes. Track your growth from beginner to expert.
            </p>
            <ScalePress>
              <Link href="/learn/assess"
                className="inline-flex items-center gap-2 text-white text-[13px] font-bold px-6 py-3 rounded-xl shadow-lg shadow-[#4F8EF7]/25"
                style={{ background: 'linear-gradient(135deg, #4F8EF7, #A78BFA)' }}>
                <Play size={16} fill="white" />
                Begin Assessment
              </Link>
            </ScalePress>
          </div>
        </FadeIn>
      )}
    </div>
  )
}
