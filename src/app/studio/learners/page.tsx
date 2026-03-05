'use client'
// src/app/studio/learners/page.tsx — Warm Workera-inspired learner records
import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'

const TIER_COLORS: Record<string, string> = { spark: '#EF6461', build: '#fac957', lead: '#4ECDC4', apex: '#d65cc6' }
const PERSONA_COLORS: Record<string, string> = { builder: '#7EC8E3', analyst: '#4ECDC4', strategist: '#fac957', explorer: '#d65cc6' }

export default function LearnersPage() {
  const [learners, setLearners] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = new URLSearchParams({ search, limit: '50' })
    fetch(`/api/studio/learners?${q}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setLearners(d.learners ?? []); setTotal(d.total ?? 0); setLoading(false) })
      .catch(() => {})
  }, [search])

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(214,92,198,0.12)' }}>
            <Users className="w-4.5 h-4.5" style={{ color: 'var(--studio-orchid)' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Learner Records</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Individual profiles, scores, progress, and persona assignments
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learners..."
            className="studio-input" style={{ width: 220 }} />
          <button className="studio-btn-ghost">Export</button>
        </div>
      </div>

      <div className="studio-card overflow-hidden">
        <div className="flex items-center px-5 py-3"
          style={{ borderBottom: '1px solid var(--studio-border)', background: 'rgba(219,197,169,0.02)' }}>
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase w-52" style={{ color: 'var(--studio-dust)' }}>Learner</span>
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase w-24" style={{ color: 'var(--studio-dust)' }}>Persona</span>
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase flex-1" style={{ color: 'var(--studio-dust)' }}>Domain Scores</span>
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase w-24" style={{ color: 'var(--studio-dust)' }}>Progress</span>
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase w-16" style={{ color: 'var(--studio-dust)' }}>Streak</span>
          <span className="w-24" />
        </div>

        {loading && <div className="py-12 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>Loading...</div>}

        {!loading && learners.length === 0 && (
          <div className="py-12 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
            No learners yet. <a href="/learn" style={{ color: 'var(--studio-orchid)' }} className="hover:underline">Open learner app</a> to register.
          </div>
        )}

        {learners.map(l => {
          const persona = l.persona_id ?? 'explorer'
          const initials = (l.name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)
          return (
            <div key={l.id} className="flex items-center px-5 py-3 transition-colors duration-200"
              style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,92,198,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <div className="flex items-center gap-3 w-52">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: `${PERSONA_COLORS[persona]}18`, color: PERSONA_COLORS[persona] }}>
                  {initials}
                </div>
                <div>
                  <div className="text-[12px] font-medium" style={{ color: 'var(--studio-dune)' }}>{l.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--studio-ash)' }}>{l.email}</div>
                </div>
              </div>
              <div className="w-24">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize"
                  style={{ background: `${PERSONA_COLORS[persona]}18`, color: PERSONA_COLORS[persona] }}>
                  {persona}
                </span>
              </div>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {(l.domainScores ?? []).slice(0, 4).map((s: any) => (
                  <span key={s.domain} className="text-[10px] px-2.5 py-0.5 rounded-full font-mono"
                    style={{ background: `${TIER_COLORS[s.tier]}18`, color: TIER_COLORS[s.tier] }}>
                    {s.domain.split('_').map((w: string) => w[0].toUpperCase()).join('')}: {s.score}
                  </span>
                ))}
              </div>
              <div className="w-24">
                <div className="text-[11px] mb-1" style={{ color: 'var(--studio-dust)' }}>{l.modules_completed ?? 0} modules</div>
                <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: 'var(--studio-bg-elevated)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (l.modules_completed ?? 0) * 10)}%`, background: '#4ECDC4' }} />
                </div>
              </div>
              <div className="w-16 text-[12px] font-mono" style={{ color: 'var(--studio-gold)' }}>
                {l.streak > 0 ? `${l.streak}d` : '-'}
              </div>
              <div className="w-24">
                <button className="studio-btn-ghost text-[11px] px-3 py-1">View Profile</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[11px]" style={{ color: 'var(--studio-ash)' }}>{total} total learners</div>
    </div>
  )
}
