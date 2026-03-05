'use client'
// src/app/learn/results/[sessionId]/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { scoreToTier, TIER_THRESHOLDS } from '@/lib/types/learning'

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [data, setData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/learn/assess?sessionId=${sessionId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(setData)
      .catch(() => {})
  }, [sessionId])

  if (!data) return <div className="flex items-center justify-center h-64 text-white/30">Loading…</div>

  const session = data.session
  const events = data.events ?? []
  const score = session?.final_score ?? 0
  const tier = scoreToTier(score)
  const tierInfo = TIER_THRESHOLDS[tier]
  const pct = score / 300
  const r = 36, circ = 2 * Math.PI * r, dash = circ * pct

  const TIER_ICONS: Record<string, string> = { spark: '⚡', build: '🔨', lead: '💎', apex: '⭐' }
  const correct = events.filter((e: any) => e.correct).length

  return (
    <div className="px-5 pb-6">
      <div className="text-center py-6">
        {/* Score ring */}
        <div className="relative w-[90px] h-[90px] mx-auto mb-3">
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
            <circle cx="45" cy="45" r={r} fill="none" stroke={tierInfo.color} strokeWidth="7"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[20px] font-semibold" style={{ color: tierInfo.color }}>{score}</span>
            <span className="text-[8px] text-white/30">/300</span>
          </div>
        </div>

        <h1 className="font-display text-[20px] font-bold mb-2">
          {session?.domain?.replace('_', ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase())}
        </h1>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-2"
          style={{ background: `${tierInfo.color}18`, borderColor: `${tierInfo.color}40` }}>
          <span>{TIER_ICONS[tier]}</span>
          <span className="font-display text-[14px] font-bold" style={{ color: tierInfo.color }}>{tierInfo.label}</span>
        </div>

        <p className="text-[12px] text-white/40">{correct} / {events.length} correct</p>
      </div>

      {/* Q review */}
      {events.length > 0 && (
        <div className="mb-5">
          <h2 className="font-display text-[14px] font-bold mb-3">Question Review</h2>
          <div className="flex flex-col gap-2">
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
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <Link href="/learn/library"
          className="block py-3 text-center border border-white/[0.08] rounded-xl text-[13px] text-white/70 hover:border-white/20">
          📚 View Learning Resources
        </Link>
        <Link href="/learn/assess"
          className="block py-3 text-center bg-[#4F8EF7] text-white font-bold text-[13px] rounded-xl hover:bg-[#3a7de8]">
          Take Another Assessment →
        </Link>
      </div>
    </div>
  )
}
