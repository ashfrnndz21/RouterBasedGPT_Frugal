'use client'
// src/app/studio/personas/page.tsx — Warm Workera-inspired persona manager with AI weight suggestions + Intelligence Map
import { useEffect, useState } from 'react'
import { UserCircle, Sparkles, Loader2, ArrowRight, Route, BookOpen, Layers, Brain } from 'lucide-react'
import ColorPicker from '@/components/Studio/ColorPicker'
import IconSelector, { ICON_MAP } from '@/components/Studio/IconSelector'

const DOMAINS = ['ai_essentials','data_science','mlops','responsible_ai','prompt_engineering','cloud_ai','ai_strategy','ai_security']
const DOMAIN_LABELS: Record<string,string> = { ai_essentials:'AI Essentials', data_science:'Data Science', mlops:'MLOps', responsible_ai:'Responsible AI', prompt_engineering:'Prompt Eng.', cloud_ai:'Cloud AI', ai_strategy:'AI Strategy', ai_security:'AI Security' }
const DOMAIN_COLORS: Record<string,string> = { ai_essentials:'#7EC8E3', data_science:'#4ECDC4', mlops:'#fac957', responsible_ai:'#EF6461', prompt_engineering:'#d65cc6', cloud_ai:'#FF9900', ai_strategy:'#0056D2', ai_security:'#923586' }

export default function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = () => {
    fetch('/api/studio/personas')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { const p = d.personas ?? []; setPersonas(p); if (p[0] && !selected) setSelected(JSON.parse(JSON.stringify(p[0]))) })
      .catch(() => {})
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    await fetch('/api/studio/personas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
    setSaving(false); setSaved(true); load()
    setTimeout(() => setSaved(false), 2000)
  }

  // AI weight suggestion state
  const [weightRecs, setWeightRecs] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [showRecs, setShowRecs] = useState(false)

  const suggestWeights = async () => {
    if (!selected || loadingRecs) return
    setLoadingRecs(true)
    setWeightRecs([])
    setShowRecs(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-weights', personaId: selected.id }),
      })
      const data = await res.json()
      if (res.ok) setWeightRecs(data.recommendations ?? [])
    } catch { /* silently handle */ }
    setLoadingRecs(false)
  }

  const applyRec = (domain: string, suggested: number) => {
    setSelected((p: any) => ({
      ...p,
      domain_weights: { ...(p.domain_weights ?? {}), [domain]: suggested },
    }))
  }

  const applyAllRecs = () => {
    weightRecs.forEach(r => applyRec(r.domain, r.suggested))
    setShowRecs(false)
  }

  const setWeight = (domain: string, val: number) => {
    setSelected((p: any) => ({
      ...p,
      domain_weights: { ...(p.domain_weights ?? {}), [domain]: val },
    }))
  }

  const weights = selected?.domain_weights ?? {}

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(250,201,87,0.12)' }}>
            <UserCircle className="w-4.5 h-4.5" style={{ color: 'var(--studio-gold)' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Persona Manager</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Configure how Scout and Sage adapt to each learner type
            </p>
          </div>
        </div>
      </div>

      {/* Persona selector */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {personas.map(p => {
          const isSelected = selected?.id === p.id
          const personaColor = p.color || '#d65cc6'
          return (
            <button key={p.id} onClick={() => setSelected(JSON.parse(JSON.stringify(p)))}
              className={`studio-card p-5 text-left ${isSelected ? 'studio-card-selected' : ''}`}>
              <div className="mb-3">
                {ICON_MAP[p.emoji]
                  ? (() => { const I = ICON_MAP[p.emoji]; return <I className="w-6 h-6" style={{ color: personaColor }} /> })()
                  : <span className="text-2xl">{p.emoji}</span>}
              </div>
              <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--studio-dune)' }}>{p.label}</div>
              <div className="text-[12px]" style={{ color: 'var(--studio-dust)' }}>{p.subtitle}</div>
              <div className="mt-2.5 text-[10px] font-mono" style={{ color: 'var(--studio-orchid)' }}>
                {(p.learner_count ?? 0)} learners
              </div>
            </button>
          )
        })}
      </div>

      {selected && (<>
        <div className="grid grid-cols-2 gap-6">
          {/* Left: metadata */}
          <div className="studio-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold flex items-center gap-2.5"
                style={{ color: 'var(--studio-dune)' }}>
                {ICON_MAP[selected.emoji]
                  ? (() => { const I = ICON_MAP[selected.emoji]; return <I className="w-4.5 h-4.5" style={{ color: selected.color || '#d65cc6' }} /> })()
                  : <span>{selected.emoji}</span>}
                {selected.label}
              </h2>
              <button onClick={save} disabled={saving} className="studio-btn-primary disabled:opacity-40">
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {[
                { key: 'label', label: 'Label' },
                { key: 'subtitle', label: 'Subtitle' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="studio-label">{label}</label>
                  <input value={selected[key] ?? ''} onChange={e => setSelected((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="studio-input" />
                </div>
              ))}

              <div>
                <label className="studio-label">Icon</label>
                <IconSelector
                  value={selected.emoji ?? ''}
                  onChange={val => setSelected((p: any) => ({ ...p, emoji: val }))}
                  accentColor={selected.color || '#d65cc6'}
                />
              </div>

              <div>
                <label className="studio-label">Accent Color</label>
                <ColorPicker
                  value={selected.color ?? '#d65cc6'}
                  onChange={val => setSelected((p: any) => ({ ...p, color: val }))}
                />
              </div>

              <div>
                <label className="studio-label">Description</label>
                <textarea value={selected.description ?? ''} onChange={e => setSelected((p: any) => ({ ...p, description: e.target.value }))} rows={3}
                  className="studio-input" style={{ resize: 'none' }} />
              </div>
            </div>
          </div>

          {/* Right: domain weights + prompt modifiers */}
          <div className="flex flex-col gap-5">
            <div className="studio-card p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Domain Weights</h3>
                <button onClick={suggestWeights} disabled={loadingRecs}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors duration-200 disabled:opacity-40"
                  style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
                  {loadingRecs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Recommend
                </button>
              </div>
              <p className="text-[12px] mb-5" style={{ color: 'var(--studio-dust)' }}>
                Controls which domains Scout prioritises and Sage emphasises for this persona.
              </p>

              {/* AI Weight Recommendations */}
              {showRecs && (
                <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(250,201,87,0.04)', border: '1px solid rgba(250,201,87,0.12)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--studio-gold)' }} />
                      AI Recommendations
                    </div>
                    <div className="flex gap-2">
                      <button onClick={applyAllRecs} disabled={weightRecs.length === 0}
                        className="text-[10px] font-bold px-2 py-1 rounded-md transition-colors disabled:opacity-30"
                        style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.08)' }}>
                        Apply All
                      </button>
                      <button onClick={() => setShowRecs(false)} className="text-[10px]" style={{ color: 'var(--studio-ash)' }}>Dismiss</button>
                    </div>
                  </div>
                  {loadingRecs ? (
                    <div className="flex items-center gap-2 py-3 justify-center text-[11px]" style={{ color: 'var(--studio-dust)' }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--studio-gold)' }} /> Analyzing learner performance...
                    </div>
                  ) : weightRecs.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {weightRecs.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] py-1.5 px-3 rounded-lg"
                          style={{ background: 'rgba(250,201,87,0.04)' }}>
                          <span className="w-24 flex-shrink-0" style={{ color: 'var(--studio-sand)' }}>{DOMAIN_LABELS[r.domain] || r.domain}</span>
                          <span className="font-mono" style={{ color: 'var(--studio-ash)' }}>{r.current}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: r.suggested > r.current ? '#4ECDC4' : r.suggested < r.current ? '#EF6461' : 'var(--studio-ash)' }} />
                          <span className="font-mono font-bold" style={{ color: r.suggested > r.current ? '#4ECDC4' : r.suggested < r.current ? '#EF6461' : 'var(--studio-dust)' }}>{r.suggested}</span>
                          <span className="flex-1 text-[10px] truncate" style={{ color: 'var(--studio-dust)' }}>{r.reason}</span>
                          <button onClick={() => applyRec(r.domain, r.suggested)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
                            style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.08)' }}>
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] py-2 text-center" style={{ color: 'var(--studio-ash)' }}>No recommendations yet. Try again.</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3.5">
                {DOMAINS.map(d => {
                  const w = weights[d] ?? 3
                  return (
                    <div key={d} className="flex items-center gap-3">
                      <div className="text-[12px] w-28 flex-shrink-0" style={{ color: 'var(--studio-sand)' }}>
                        {DOMAIN_LABELS[d]}
                      </div>
                      <input type="range" min={1} max={5} step={1} value={w}
                        onChange={e => setWeight(d, +e.target.value)}
                        className="studio-range flex-1" />
                      <span className="text-[12px] font-mono w-4 text-right" style={{ color: 'var(--studio-orchid)' }}>{w}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="studio-card p-6">
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--studio-dune)' }}>Sage Tone Modifier</h3>
              <textarea value={selected.sage_modifier ?? ''} onChange={e => setSelected((p: any) => ({ ...p, sage_modifier: e.target.value }))} rows={4}
                placeholder="Injected into Sage's system prompt for this persona..."
                className="studio-input font-mono" style={{ resize: 'none' }} />
              <h3 className="text-[14px] font-semibold mb-3 mt-5" style={{ color: 'var(--studio-dune)' }}>Scout Question Modifier</h3>
              <textarea value={selected.scout_modifier ?? ''} onChange={e => setSelected((p: any) => ({ ...p, scout_modifier: e.target.value }))} rows={4}
                placeholder="Injected into Scout's system prompt for this persona..."
                className="studio-input font-mono" style={{ resize: 'none' }} />
            </div>
          </div>
        </div>

        {/* Intelligence Map */}
        <div className="mt-6 studio-card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Brain className="w-4.5 h-4.5" style={{ color: 'var(--studio-orchid)' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Intelligence Map</h2>
          </div>

          {/* Flow summary */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl"
            style={{ background: 'rgba(214,92,198,0.04)', border: '1px solid rgba(214,92,198,0.1)' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(214,92,198,0.08)' }}>
              <UserCircle className="w-4 h-4" style={{ color: selected.color || '#d65cc6' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--studio-dune)' }}>{selected.label}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--studio-ash)' }} />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(250,201,87,0.08)' }}>
              <Layers className="w-3.5 h-3.5" style={{ color: 'var(--studio-gold)' }} />
              <span className="text-[12px] font-mono" style={{ color: 'var(--studio-dune)' }}>
                {Object.values(weights).filter((w: any) => w >= 3).length} Domains
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--studio-ash)' }} />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(146,53,134,0.08)' }}>
              <Route className="w-3.5 h-3.5" style={{ color: 'var(--studio-plum)' }} />
              <span className="text-[12px] font-mono" style={{ color: 'var(--studio-dune)' }}>
                {selected.pathway_count ?? 0} Pathways
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--studio-ash)' }} />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(126,200,227,0.08)' }}>
              <BookOpen className="w-3.5 h-3.5" style={{ color: '#7EC8E3' }} />
              <span className="text-[12px] font-mono" style={{ color: 'var(--studio-dune)' }}>
                {selected.total_modules ?? 0} Modules · {selected.total_hours ?? 0}h
              </span>
            </div>
          </div>

          {/* Domain breakdown bars */}
          <div className="flex flex-col gap-3">
            {[...DOMAINS]
              .sort((a, b) => (weights[b] ?? 3) - (weights[a] ?? 3))
              .map(d => {
                const w = weights[d] ?? 3
                const stats = selected.domain_stats?.[d] ?? { skills: 0, modules: 0 }
                const isHighWeight = w >= 4
                const isLowWeight = w <= 2
                const domColor = DOMAIN_COLORS[d] || '#888'
                return (
                  <div key={d} className="flex items-center gap-3 py-2 px-3 rounded-lg transition-all"
                    style={{
                      background: isHighWeight ? `${domColor}08` : 'transparent',
                      opacity: isLowWeight ? 0.55 : 1,
                    }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: domColor }} />
                    <div className="text-[12px] w-28 flex-shrink-0 font-medium" style={{ color: 'var(--studio-dune)' }}>
                      {DOMAIN_LABELS[d]}
                    </div>
                    {/* Weight bar */}
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(219,197,169,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(w / 5) * 100}%`, background: domColor, opacity: 0.7 }} />
                    </div>
                    <span className="text-[11px] font-mono w-4 text-right font-bold" style={{ color: domColor }}>{w}</span>
                    {/* Skill count */}
                    <span className="text-[10px] font-mono w-16 text-right" style={{ color: 'var(--studio-dust)' }}>
                      {stats.skills} skill{stats.skills !== 1 ? 's' : ''}
                    </span>
                    {/* Module count */}
                    {stats.modules > 0 ? (
                      <span className="text-[10px] font-mono w-20 text-right" style={{ color: '#4ECDC4' }}>
                        {stats.modules} module{stats.modules !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <a href="/studio/content" className="text-[10px] font-bold w-20 text-right"
                        style={{ color: 'var(--studio-ash)', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--studio-gold)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)' }}>
                        Curate →
                      </a>
                    )}
                  </div>
                )
              })}
          </div>

          {/* Pathway connections */}
          {(selected.pathways_summary ?? []).length > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--studio-border)' }}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--studio-dust)' }}>
                Connected Pathways
              </h4>
              <div className="flex flex-wrap gap-2">
                {(selected.pathways_summary ?? []).map((pw: any) => (
                  <div key={pw.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(146,53,134,0.04)', border: '1px solid rgba(146,53,134,0.1)' }}>
                    <Route className="w-3 h-3" style={{ color: 'var(--studio-plum)' }} />
                    <span className="text-[11px] font-medium" style={{ color: 'var(--studio-dune)' }}>{pw.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: 'var(--studio-ash)' }}>{pw.stage_count} stages</span>
                    {pw.active ? (
                      <span className="text-[8px] font-bold px-1.5 py-0 rounded-full"
                        style={{ background: 'rgba(78,205,196,0.1)', color: '#4ECDC4' }}>Live</span>
                    ) : (
                      <span className="text-[8px] font-bold px-1.5 py-0 rounded-full"
                        style={{ background: 'rgba(219,197,169,0.08)', color: 'var(--studio-ash)' }}>Draft</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>)}
    </div>
  )
}
