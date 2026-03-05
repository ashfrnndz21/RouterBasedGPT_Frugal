'use client'
// src/app/studio/scores/page.tsx — Warm Workera-inspired score review
import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'

const TIER_COLORS: Record<string,string> = { spark:'#EF6461', build:'#fac957', lead:'#4ECDC4', apex:'#d65cc6' }
const DOMAINS = ['all','ai_essentials','data_science','mlops','responsible_ai','prompt_engineering','cloud_ai','ai_strategy','ai_security']

export default function ScoresPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [distrib, setDistrib] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDomain, setFilterDomain] = useState('all')
  const [filterStatus, setFilterStatus] = useState('completed')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [overrideScore, setOverrideScore] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [saving, setSaving] = useState(false)

  const loadSessions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        page: String(page),
        ...(filterDomain !== 'all' ? { domain: filterDomain } : {})
      })
      const res = await fetch(`/api/studio/scores?${params}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setSessions(data.sessions ?? [])
      setTotalPages(data.pages ?? 1)
    } catch { /* silently handle */ }
    setLoading(false)
  }

  useEffect(() => {
    loadSessions()
    fetch('/api/studio/overview')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => setDistrib(d.domainStats ?? []))
      .catch(() => {})
  }, [filterDomain, filterStatus, page])

  const openDetail = async (sessionId: string) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch('/api/studio/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detail', sessionId }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setDetail(data)
      setOverrideScore(String(data.session?.final_score ?? ''))
      setOverrideReason('')
    } catch { setDetail(null) }
    setDetailLoading(false)
  }

  const saveOverride = async () => {
    if (!detail || !overrideScore) return
    setSaving(true)
    await fetch('/api/studio/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'override',
        sessionId: detail.session.id,
        newScore: parseInt(overrideScore),
        reason: overrideReason || 'Admin override',
      }),
    })
    setSaving(false)
    setDetail(null)
    loadSessions()
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(78,205,196,0.12)' }}>
            <BarChart3 className="w-4.5 h-4.5" style={{ color: '#4ECDC4' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Score Review</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Assessment results, tier distributions, and score overrides
            </p>
          </div>
        </div>
      </div>

      {/* Domain distribution heatmap */}
      <div className="studio-card p-6 mb-6">
        <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>
          Tier Distribution by Domain
        </h2>
        <div className="flex flex-col gap-4">
          {distrib.map((d: any) => {
            const total = Math.max(1, d.spark_count + d.build_count + d.lead_count + d.apex_count)
            return (
              <div key={d.domain}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] capitalize" style={{ color: 'var(--studio-sand)' }}>
                    {d.domain?.replace(/_/g,' ')}
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--studio-dust)' }}>
                    avg {Math.round(d.avg_score ?? 0)}
                  </span>
                </div>
                <div className="h-6 rounded-lg overflow-hidden flex" style={{ background: 'var(--studio-bg-elevated)' }}>
                  {[['spark_count','#EF6461'],['build_count','#fac957'],['lead_count','#4ECDC4'],['apex_count','#d65cc6']].map(([key,color]) => {
                    const pct = ((d[key] ?? 0) / total) * 100
                    return pct > 0 ? (
                      <div key={key} title={`${key.replace('_count','')}: ${d[key]}`}
                        className="flex items-center justify-center text-[9px] font-bold"
                        style={{ width: `${pct}%`, background: color, opacity: 0.75, color: '#fff' }}>
                        {pct > 8 ? `${Math.round(pct)}%` : ''}
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )
          })}
          {distrib.length === 0 && (
            <p className="text-center py-4 text-[13px]" style={{ color: 'var(--studio-ash)' }}>
              No assessment data yet
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filterDomain} onChange={e => { setFilterDomain(e.target.value); setPage(1) }}
          className="studio-input" style={{ width: 'auto', cursor: 'pointer' }}>
          {DOMAINS.map(d => <option key={d} value={d}>{d === 'all' ? 'All domains' : d.replace(/_/g,' ')}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="studio-input" style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Sessions table */}
      <div className="studio-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--studio-border)' }}>
              {['Learner','Domain','Score','Tier','Questions','Date','Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold tracking-[0.08em] uppercase"
                  style={{ color: 'var(--studio-dust)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr key={s.id}
                className="transition-colors duration-200"
                style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,92,198,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <td className="px-5 py-3">
                  <div className="text-[12px] font-medium" style={{ color: 'var(--studio-dune)' }}>{s.learner_name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--studio-ash)' }}>{s.learner_email}</div>
                </td>
                <td className="px-5 py-3 text-[12px] capitalize" style={{ color: 'var(--studio-dust)' }}>
                  {s.domain?.replace(/_/g,' ')}
                </td>
                <td className="px-5 py-3 font-mono text-[12px]" style={{ color: TIER_COLORS[s.final_tier ?? 'spark'] }}>
                  {s.final_score ?? '-'}
                  {s.overridden_at && <span className="text-[9px] ml-1" style={{ color: 'var(--studio-gold)' }}>*</span>}
                </td>
                <td className="px-5 py-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize"
                    style={{ background: `${TIER_COLORS[s.final_tier ?? 'spark']}18`, color: TIER_COLORS[s.final_tier ?? 'spark'] }}>
                    {s.final_tier ?? '-'}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-[12px]" style={{ color: 'var(--studio-dust)' }}>
                  {s.correct_count}/{s.question_count}
                </td>
                <td className="px-5 py-3 text-[12px]" style={{ color: 'var(--studio-ash)' }}>
                  {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : s.status}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => openDetail(s.id)}
                    className="text-[11px] font-semibold transition-colors duration-200"
                    style={{ color: 'var(--studio-orchid)' }}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>No sessions found</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--studio-border)' }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="text-[12px] transition-colors disabled:opacity-20"
              style={{ color: 'var(--studio-dust)' }}>
              &larr; Prev
            </button>
            <span className="text-[11px] font-mono" style={{ color: 'var(--studio-ash)' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="text-[12px] transition-colors disabled:opacity-20"
              style={{ color: 'var(--studio-dust)' }}>
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,18,32,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null) }}>
          <div className="studio-card w-full max-w-lg max-h-[80vh] overflow-y-auto studio-scroll">
            {detailLoading ? (
              <div className="p-8 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>Loading...</div>
            ) : detail && (
              <>
                <div className="px-6 py-4 flex items-start justify-between"
                  style={{ borderBottom: '1px solid var(--studio-border)' }}>
                  <div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--studio-dune)' }}>{detail.learner?.name}</div>
                    <div className="text-[12px]" style={{ color: 'var(--studio-dust)' }}>
                      {detail.session?.domain?.replace(/_/g,' ')} · {detail.session?.mode}
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-[18px] leading-none"
                    style={{ color: 'var(--studio-ash)' }}>x</button>
                </div>

                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--studio-border)' }}>
                  <label className="studio-label">Score Override</label>
                  <div className="flex gap-2">
                    <input type="number" min={0} max={300} value={overrideScore}
                      onChange={e => setOverrideScore(e.target.value)}
                      className="studio-input font-mono text-center" style={{ width: 80 }} />
                    <input value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="studio-input flex-1" />
                    <button onClick={saveOverride} disabled={saving || !overrideScore}
                      className="studio-btn-primary disabled:opacity-40">
                      {saving ? '...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <label className="studio-label">Question Events</label>
                  <div className="flex flex-col gap-2">
                    {detail.events?.map((e: any, i: number) => (
                      <div key={e.id} className="p-3 rounded-xl border"
                        style={{
                          borderColor: e.correct ? 'rgba(78,205,196,0.25)' : 'rgba(239,100,97,0.25)',
                          background: e.correct ? 'rgba(78,205,196,0.05)' : 'rgba(239,100,97,0.05)',
                        }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[12px] flex-1" style={{ color: 'var(--studio-sand)' }}>
                            {i+1}. {e.question_text || e.question_text_full}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] font-mono" style={{ color: e.correct ? '#4ECDC4' : '#EF6461' }}>
                              {e.correct ? `+${e.score_delta}` : e.score_delta}
                            </span>
                            <span className="text-[9px] px-1 rounded"
                              style={{ color: e.difficulty === 'hard' ? '#EF6461' : e.difficulty === 'medium' ? '#fac957' : '#4ECDC4' }}>
                              {e.difficulty}
                            </span>
                          </div>
                        </div>
                        {e.answer && (
                          <div className="mt-1 text-[10px] truncate" style={{ color: 'var(--studio-ash)' }}>
                            Answer: {e.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
