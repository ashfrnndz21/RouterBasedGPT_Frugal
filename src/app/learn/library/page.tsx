'use client'
// src/app/learn/library/page.tsx — Learning library with staggered cards + skeleton loading
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/Learn/motion/FadeIn'
import { StaggerList } from '@/components/Learn/motion/StaggerList'
import { ScalePress } from '@/components/Learn/motion/ScalePress'
import { SkeletonCard, SkeletonLine } from '@/components/Learn/motion/Skeleton'

const TYPE_ICONS: Record<string, string> = { video: '📹', article: '📄', lab: '💻', quiz: '🎮', interactive: '⚡' }
const TIER_COLORS: Record<string, string> = { spark: '#4F8EF7', build: '#F0A500', lead: '#00E5A0', apex: '#A78BFA' }

const DOMAIN_FILTERS = [
  { id: '', label: 'All' },
  { id: 'ai_essentials', label: 'AI Core' },
  { id: 'mlops', label: 'MLOps' },
  { id: 'data_science', label: 'Data Sci' },
  { id: 'prompt_engineering', label: 'Prompts' },
  { id: 'cloud_ai', label: 'Cloud AI' },
]

export default function LibraryPage() {
  const { status } = useSession()
  const router = useRouter()
  const [modules, setModules] = useState<any[]>([])
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/learn/login'); return }
    if (status !== 'authenticated') return
    setLoading(true)
    const q = domain ? `?domain=${domain}` : ''
    fetch(`/api/learn/modules${q}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => { setModules(d.modules ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [domain, status, router])

  return (
    <div className="px-5 pb-4">
      <FadeIn>
        <h1 className="font-display text-[18px] font-bold mt-4 mb-4">Learning Library</h1>
      </FadeIn>

      {/* Domain filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {DOMAIN_FILTERS.map(f => (
          <ScalePress key={f.id} scale={0.95}>
            <button onClick={() => setDomain(f.id)}
              className={`relative px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all ${
                domain === f.id ? 'bg-[#4F8EF7] text-white' : 'bg-[#1c1c26] border border-white/[0.07] text-white/50 hover:text-white/80'
              }`}>
              {f.label}
            </button>
          </ScalePress>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard height={120} />
          <SkeletonCard height={64} />
          <SkeletonCard height={64} />
          <SkeletonCard height={64} />
        </div>
      )}

      {!loading && modules.length === 0 && (
        <FadeIn>
          <div className="py-8 text-center text-white/30 text-sm">No modules found</div>
        </FadeIn>
      )}

      {/* Featured (top recommended) */}
      {!loading && modules[0] && (
        <FadeIn delay={0.1}>
          <ScalePress>
            <a href={modules[0].url} target="_blank" rel="noopener noreferrer"
              className="block rounded-xl p-4 mb-4 border cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.10), rgba(79,142,247,0.07))', borderColor: 'rgba(0,229,160,0.2)' }}>
              <div className="text-[10px] font-bold text-[#00E5A0] uppercase tracking-widest font-mono mb-1.5">
                🎯 {modules[0].reason ?? 'Recommended'}
              </div>
              <div className="text-[14px] font-bold mb-1">{modules[0].title}</div>
              <div className="text-[11px] text-white/50 mb-3 line-clamp-2">{modules[0].description}</div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">{modules[0].source}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">{modules[0].duration_m}m</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full capitalize font-bold"
                  style={{ background: `${TIER_COLORS[modules[0].tier]}18`, color: TIER_COLORS[modules[0].tier] }}>
                  {modules[0].tier}
                </span>
              </div>
            </a>
          </ScalePress>
        </FadeIn>
      )}

      {/* Module list */}
      {!loading && modules.length > 1 && (
        <StaggerList stagger={0.05} delay={0.15} className="flex flex-col gap-2">
          {modules.slice(1).map(m => (
            <ScalePress key={m.id}>
              <a href={m.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-[#1c1c26] border border-white/[0.06] rounded-xl hover:border-[#4F8EF7]/30 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0 bg-white/[0.05]">
                  {TYPE_ICONS[m.type] ?? '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate">{m.title}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{m.source} · {m.duration_m}m</div>
                  {m.progress && m.progress.pct > 0 && (
                    <>
                      <div className="mt-1.5 h-0.5 bg-white/[0.05] rounded overflow-hidden">
                        <motion.div
                          className="h-full bg-[#4F8EF7]"
                          initial={{ width: 0 }}
                          animate={{ width: `${m.progress.pct}%` }}
                          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />
                      </div>
                      <div className="text-[9px] text-white/20 mt-0.5">{m.progress.pct}% complete</div>
                    </>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 capitalize"
                  style={{ background: `${TIER_COLORS[m.tier]}18`, color: TIER_COLORS[m.tier] }}>
                  {m.tier}
                </span>
              </a>
            </ScalePress>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
