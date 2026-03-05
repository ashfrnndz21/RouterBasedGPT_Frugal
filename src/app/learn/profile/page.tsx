'use client'
// src/app/learn/profile/page.tsx
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { scoreToTier } from '@/lib/types/learning'

const TIER_COLOR: Record<string, string> = {
  spark: '#EF4444', build: '#F0A500', lead: '#00E5A0', apex: '#4F8EF7'
}

const DOMAIN_EMOJI: Record<string, string> = {
  ai_essentials: '🧠', data_science: '📊', mlops: '⚙️',
  responsible_ai: '⚖️', prompt_engineering: '✏️',
  cloud_ai: '☁️', ai_strategy: '🎯', ai_security: '🔒',
}

const PERSONA_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  builder:    { label: 'Builder',    emoji: '🔨', color: '#4F8EF7' },
  analyst:    { label: 'Analyst',    emoji: '📊', color: '#00E5A0' },
  strategist: { label: 'Strategist', emoji: '🎯', color: '#A78BFA' },
  explorer:   { label: 'Explorer',   emoji: '🔭', color: '#F0A500' },
}

export default function ProfilePage() {
  const { data: authSession, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/learn/login'); return }
    if (status !== 'authenticated') return

    fetch('/api/learn/profile')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, router])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut({ callbackUrl: '/learn/login' })
  }

  if (loading || status === 'loading') {
    return <div className="flex items-center justify-center h-64 text-white/30 text-sm">Loading…</div>
  }

  const learner = data?.learner
  const scores: any[] = data?.domainScores ?? []
  const progress: any[] = data?.moduleProgress ?? []

  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((sum: number, s: any) => sum + s.score, 0) / scores.length)
    : 0
  const overallTier = scoreToTier(overallScore)
  const persona = PERSONA_MAP[learner?.persona_id] ?? PERSONA_MAP.explorer
  const completedModules = progress.filter(p => p.status === 'completed').length

  return (
    <div className="px-5 py-4">
      {/* Header card */}
      <div className="bg-[#13131a] border border-white/[0.06] rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[18px] font-bold mb-0.5">{learner?.name || 'Learner'}</div>
            <div className="text-[11px] text-white/40">{learner?.email}</div>
          </div>
          <div className="flex flex-col items-center gap-1 ml-3">
            {/* Overall score ring */}
            <div className="relative w-[56px] h-[56px]">
              <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke={TIER_COLOR[overallTier]}
                  strokeWidth="5"
                  strokeDasharray={`${(overallScore / 300) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold"
                style={{ color: TIER_COLOR[overallTier] }}>{overallScore}</div>
            </div>
            <div className="text-[9px] font-mono font-bold uppercase tracking-widest"
              style={{ color: TIER_COLOR[overallTier] }}>{overallTier}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Streak', value: `🔥 ${learner?.streak || 0}d` },
            { label: 'Modules', value: `${completedModules} done` },
            { label: 'Persona', value: `${persona.emoji} ${persona.label}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0a0a0f] rounded-xl p-2.5">
              <div className="text-[10px] text-white/30 mb-0.5">{label}</div>
              <div className="text-[12px] font-bold text-white/80">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain scores */}
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Domain Scores</div>
        {scores.length === 0 ? (
          <div className="bg-[#13131a] border border-white/[0.06] rounded-xl p-4 text-center">
            <div className="text-[13px] text-white/40 mb-2">No assessments yet</div>
            <button onClick={() => router.push('/learn/assess')}
              className="text-[11px] text-[#4F8EF7] font-bold">
              Start your first assessment →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {scores.map((s: any) => {
              const tier = scoreToTier(s.score)
              const color = TIER_COLOR[tier]
              return (
                <div key={s.domain} className="bg-[#13131a] border border-white/[0.06] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{DOMAIN_EMOJI[s.domain] || '🔹'}</span>
                      <span className="text-[12px] font-semibold capitalize">{s.domain.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold" style={{ color }}>{s.score}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                        style={{ background: `${color}15`, color }}>{tier}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(s.score / 300) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent module progress */}
      {progress.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Module Progress</div>
          <div className="flex flex-col gap-2">
            {progress.slice(0, 5).map((p: any) => (
              <div key={p.module_id} className="bg-[#13131a] border border-white/[0.06] rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-semibold text-white/90">{p.title}</div>
                  <div className="text-[10px] text-white/30">{p.source} · {p.duration_m}m</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <div className="text-[10px] font-mono text-white/40">{p.pct_complete}%</div>
                  <div className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    p.status === 'completed' ? 'bg-[#00E5A0]/10 text-[#00E5A0]' :
                    p.status === 'in_progress' ? 'bg-[#F0A500]/10 text-[#F0A500]' :
                    'bg-white/[0.05] text-white/30'
                  }`}>{p.status === 'in_progress' ? 'In Progress' : p.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full py-3 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/05 text-[#EF4444] text-[12px] font-bold hover:bg-[#EF4444]/10 transition-colors disabled:opacity-40"
      >
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  )
}
