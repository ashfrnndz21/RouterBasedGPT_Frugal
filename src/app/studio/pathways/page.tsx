'use client'
// src/app/studio/pathways/page.tsx — Warm Workera-inspired pathway builder with AI auto-design + module picker
import { useEffect, useState, useRef, useCallback } from 'react'
import { GripVertical, BookOpen, Target, Plus, X, Route, Sparkles, Loader2, Search, Clock, Link2 } from 'lucide-react'

const DOMAINS = ['ai_essentials','data_science','mlops','responsible_ai','prompt_engineering','cloud_ai','ai_strategy','ai_security']
const PERSONAS = ['builder','analyst','strategist','explorer']
const SOURCE_COLORS: Record<string, string> = { coursera: '#0056D2', aws: '#FF9900', youtube: '#FF0000', internal: '#d65cc6' }
const TIER_COLORS: Record<string, string> = { spark: '#EF6461', build: '#fac957', lead: '#4ECDC4', apex: '#d65cc6' }

export default function PathwaysPage() {
  const [pathways, setPathways] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // AI auto-design state
  const [autoDesigning, setAutoDesigning] = useState(false)
  const [autoDesignDomain, setAutoDesignDomain] = useState('ai_essentials')

  // Module picker state
  const [pickerStageIdx, setPickerStageIdx] = useState<number | null>(null)
  const [allModules, setAllModules] = useState<any[]>([])
  const [moduleSearch, setModuleSearch] = useState('')
  const [modulesLoading, setModulesLoading] = useState(false)

  const load = () => {
    fetch('/api/studio/pathways')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setPathways(d.pathways ?? []))
      .catch(() => {})
  }
  useEffect(() => { load() }, [])

  const newPathway = async () => {
    const res = await fetch('/api/studio/pathways', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Pathway', description: '', target_persona: 'builder', stages: [] }),
    })
    if (!res.ok) return
    const d = await res.json()
    load()
    setSelected({ ...d.pathway, stages: [] })
  }

  const save = async () => {
    if (!selected) return
    setSaving(true)
    await fetch('/api/studio/pathways', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
    setSaving(false); setSaved(true); load()
    setTimeout(() => setSaved(false), 2000)
  }

  const addStage = (type: 'learn' | 'assess_gate') => {
    const newStage = {
      id: Math.random().toString(36).slice(2),
      type,
      title: type === 'learn' ? 'Learning Block' : 'Assessment Gate',
      module_ids: [],
      assess_domain: type === 'assess_gate' ? 'ai_essentials' : undefined,
      min_score: type === 'assess_gate' ? 150 : undefined,
      fail_action: 'loop',
    }
    setSelected((p: any) => ({ ...p, stages: [...(p.stages ?? []), newStage] }))
  }

  const updateStage = (idx: number, updates: any) => {
    setSelected((p: any) => {
      const stages = [...(p.stages ?? [])]
      stages[idx] = { ...stages[idx], ...updates }
      return { ...p, stages }
    })
  }

  const removeStage = (idx: number) => {
    setSelected((p: any) => ({ ...p, stages: (p.stages ?? []).filter((_: any, i: number) => i !== idx) }))
  }

  const handleDragStart = (idx: number) => { setDragging(idx) }
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOver(idx) }
  const handleDragEnd = () => {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      setSelected((p: any) => {
        const stages = [...(p.stages ?? [])]
        const [moved] = stages.splice(dragging, 1)
        stages.splice(dragOver, 0, moved)
        return { ...p, stages }
      })
    }
    setDragging(null)
    setDragOver(null)
  }

  // AI auto-design pathway
  const autoDesign = async () => {
    if (!selected || autoDesigning) return
    setAutoDesigning(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-pathway',
          targetPersona: selected.target_persona || 'builder',
          domain: autoDesignDomain,
        }),
      })
      const data = await res.json()
      if (res.ok && data.stages) {
        const stages = data.stages.map((s: any) => ({
          id: Math.random().toString(36).slice(2),
          type: s.type,
          title: s.title,
          module_ids: [],
          assess_domain: s.assess_domain || (s.type === 'assess_gate' ? autoDesignDomain : undefined),
          min_score: s.min_score || (s.type === 'assess_gate' ? 150 : undefined),
          fail_action: s.fail_action || 'loop',
        }))
        setSelected((p: any) => ({ ...p, stages }))
      }
    } catch { /* silently handle */ }
    setAutoDesigning(false)
  }

  // Module picker: open for a stage, load modules
  const openPicker = async (stageIdx: number) => {
    setPickerStageIdx(stageIdx)
    setModuleSearch('')
    if (allModules.length === 0) {
      setModulesLoading(true)
      try {
        const res = await fetch('/api/studio/content')
        const data = await res.json()
        setAllModules(data.modules ?? [])
      } catch { /* silently handle */ }
      setModulesLoading(false)
    }
  }

  const toggleModule = (stageIdx: number, moduleId: string) => {
    setSelected((p: any) => {
      const stages = [...(p.stages ?? [])]
      const stage = { ...stages[stageIdx] }
      const ids = [...(stage.module_ids ?? [])]
      const i = ids.indexOf(moduleId)
      if (i >= 0) ids.splice(i, 1)
      else ids.push(moduleId)
      stage.module_ids = ids
      stages[stageIdx] = stage
      return { ...p, stages }
    })
  }

  const stageModuleDuration = (stage: any) => {
    if (!stage.module_ids?.length) return 0
    return stage.module_ids.reduce((sum: number, id: string) => {
      const m = allModules.find(mod => mod.id === id)
      return sum + (m?.duration_m ?? 0)
    }, 0)
  }

  const filteredModules = allModules.filter(m =>
    !moduleSearch || m.title?.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.domain?.toLowerCase().includes(moduleSearch.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(146,53,134,0.12)' }}>
            <Route className="w-4.5 h-4.5" style={{ color: 'var(--studio-plum)' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Pathway Builder</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Design staged learning journeys with assessment gates
            </p>
          </div>
        </div>
        <button onClick={newPathway} className="studio-btn-primary">+ New Pathway</button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Pathway list */}
        <div className="studio-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--studio-border)' }}>
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Pathways</h2>
          </div>
          {pathways.length === 0 && (
            <p className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
              No pathways yet
            </p>
          )}
          {pathways.map(p => (
            <button key={p.id} onClick={() => setSelected({ ...p, stages: JSON.parse(p.stages ?? '[]') })}
              className="w-full text-left px-5 py-4 transition-colors duration-200"
              style={{
                borderBottom: '1px solid rgba(219,197,169,0.06)',
                background: selected?.id === p.id ? 'rgba(214,92,198,0.06)' : 'transparent',
              }}
              onMouseEnter={e => { if (selected?.id !== p.id) e.currentTarget.style.background = 'rgba(214,92,198,0.03)' }}
              onMouseLeave={e => { if (selected?.id !== p.id) e.currentTarget.style.background = 'transparent' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--studio-dune)' }}>{p.name}</span>
                {p.active ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(78,205,196,0.1)', color: '#4ECDC4' }}>Live</span>
                ) : null}
              </div>
              <div className="text-[11px] capitalize" style={{ color: 'var(--studio-dust)' }}>
                {p.target_persona} · {(JSON.parse(p.stages ?? '[]')).length} stages
              </div>
            </button>
          ))}
        </div>

        {/* Stage builder */}
        <div className="col-span-2 flex flex-col gap-5">
          {!selected ? (
            <div className="studio-card flex items-center justify-center h-48 text-[13px]"
              style={{ color: 'var(--studio-ash)' }}>
              Select or create a pathway
            </div>
          ) : (
            <>
              {/* Pathway metadata */}
              <div className="studio-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[14px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Pathway Settings</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setSelected((p: any) => ({ ...p, active: !p.active }))}
                      className="px-3.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors duration-200"
                      style={{
                        borderColor: selected.active ? 'rgba(78,205,196,0.3)' : 'var(--studio-border)',
                        color: selected.active ? '#4ECDC4' : 'var(--studio-dust)',
                        background: selected.active ? 'rgba(78,205,196,0.06)' : 'transparent',
                      }}>
                      {selected.active ? '● Live' : '○ Draft'}
                    </button>
                    <button onClick={save} disabled={saving} className="studio-btn-primary disabled:opacity-40">
                      {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="studio-label">Pathway Name</label>
                    <input value={selected.name ?? ''} onChange={e => setSelected((p: any) => ({ ...p, name: e.target.value }))}
                      className="studio-input" />
                  </div>
                  <div>
                    <label className="studio-label">Target Persona</label>
                    <select value={selected.target_persona ?? 'builder'} onChange={e => setSelected((p: any) => ({ ...p, target_persona: e.target.value }))}
                      className="studio-input" style={{ cursor: 'pointer' }}>
                      {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="studio-label">Description</label>
                    <input value={selected.description ?? ''} onChange={e => setSelected((p: any) => ({ ...p, description: e.target.value }))}
                      className="studio-input" />
                  </div>
                </div>
              </div>

              {/* Stages */}
              <div className="studio-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[14px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                    Stages ({(selected.stages ?? []).length})
                  </h2>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 px-1 rounded-lg" style={{ background: 'rgba(250,201,87,0.04)', border: '1px solid rgba(250,201,87,0.12)' }}>
                      <select value={autoDesignDomain} onChange={e => setAutoDesignDomain(e.target.value)}
                        className="bg-transparent text-[10px] py-1 px-1.5 outline-none" style={{ color: 'var(--studio-dust)' }}>
                        {DOMAINS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                      </select>
                      <button onClick={autoDesign} disabled={autoDesigning}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition-colors disabled:opacity-40"
                        style={{ color: 'var(--studio-gold)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                        {autoDesigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Auto-design
                      </button>
                    </div>
                    <button onClick={() => addStage('learn')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border rounded-lg transition-colors duration-200"
                      style={{ borderColor: 'rgba(126,200,227,0.3)', color: '#7EC8E3' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(126,200,227,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <Plus className="w-3 h-3" /> Learn Block
                    </button>
                    <button onClick={() => addStage('assess_gate')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border rounded-lg transition-colors duration-200"
                      style={{ borderColor: 'rgba(250,201,87,0.3)', color: '#fac957' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <Plus className="w-3 h-3" /> Assessment Gate
                    </button>
                  </div>
                </div>

                {(selected.stages ?? []).length === 0 && (
                  <p className="text-center text-[13px] py-6" style={{ color: 'var(--studio-ash)' }}>
                    Add stages to build the pathway
                  </p>
                )}

                <div className="flex flex-col gap-0">
                  {(selected.stages ?? []).map((stage: any, idx: number) => {
                    const isLearn = stage.type === 'learn'
                    const color = isLearn ? '#7EC8E3' : '#fac957'
                    const isDragged = dragging === idx
                    const isOver = dragOver === idx
                    return (
                      <div key={stage.id}>
                        {/* Connector line */}
                        {idx > 0 && (
                          <div className="flex justify-center py-0.5">
                            <div className="w-px h-6" style={{ background: 'var(--studio-border)' }} />
                          </div>
                        )}
                        <div
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={e => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isDragged ? 'opacity-40 scale-[0.97]' : ''
                          }`}
                          style={{
                            borderColor: isOver ? 'var(--studio-orchid)' : `${color}33`,
                            background: `${color}08`,
                            boxShadow: isOver ? 'var(--studio-shadow-glow)' : 'none',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <GripVertical className="w-3.5 h-3.5 cursor-grab active:cursor-grabbing flex-shrink-0"
                              style={{ color: 'var(--studio-ash)' }} />
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${color}20`, color }}>
                              {isLearn ? <BookOpen className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                              <span className="text-[10px] font-bold font-mono uppercase">
                                {idx + 1}. {isLearn ? 'Learn' : 'Gate'}
                              </span>
                            </div>
                            <input value={stage.title} onChange={e => updateStage(idx, { title: e.target.value })}
                              className="flex-1 bg-transparent text-[12px] font-semibold outline-none pb-0.5"
                              style={{ color: 'var(--studio-dune)', borderBottom: '1px solid var(--studio-border)' }} />
                            <button onClick={() => removeStage(idx)}
                              className="transition-colors duration-200 flex-shrink-0"
                              style={{ color: 'var(--studio-ash)' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#EF6461' }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Learn block: module picker */}
                          {stage.type === 'learn' && (
                            <div className="ml-9">
                              {/* Assigned modules chips */}
                              {(stage.module_ids ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {(stage.module_ids ?? []).map((mid: string) => {
                                    const mod = allModules.find(m => m.id === mid)
                                    return (
                                      <span key={mid} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                                        style={{ background: 'rgba(126,200,227,0.08)', border: '1px solid rgba(126,200,227,0.15)', color: 'var(--studio-dune)' }}>
                                        {mod?.title || mid}
                                        <button onClick={() => toggleModule(idx, mid)}
                                          className="ml-0.5" style={{ color: 'var(--studio-ash)' }}>
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </span>
                                    )
                                  })}
                                  <span className="text-[10px] font-mono px-2 py-1 flex items-center gap-1" style={{ color: 'var(--studio-dust)' }}>
                                    <Clock className="w-3 h-3" />
                                    {stageModuleDuration(stage)}m
                                  </span>
                                </div>
                              )}
                              <button onClick={() => openPicker(idx)}
                                className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors duration-200"
                                style={{ color: '#7EC8E3', background: 'rgba(126,200,227,0.06)', border: '1px solid rgba(126,200,227,0.12)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(126,200,227,0.12)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(126,200,227,0.06)' }}>
                                <Link2 className="w-3 h-3" />
                                {(stage.module_ids ?? []).length > 0
                                  ? `${(stage.module_ids ?? []).length} modules · Edit`
                                  : 'Assign Modules'}
                              </button>

                              {/* Module picker panel */}
                              {pickerStageIdx === idx && (
                                <div className="mt-2 p-3 rounded-xl" style={{ background: 'rgba(126,200,227,0.04)', border: '1px solid rgba(126,200,227,0.15)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="relative flex-1">
                                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'var(--studio-ash)' }} />
                                      <input value={moduleSearch} onChange={e => setModuleSearch(e.target.value)}
                                        placeholder="Search modules..."
                                        className="studio-input text-[10px] py-1.5 pl-7 pr-2" />
                                    </div>
                                    <button onClick={() => setPickerStageIdx(null)}
                                      className="text-[10px] font-bold px-2 py-1 rounded-md"
                                      style={{ color: '#4ECDC4' }}>Done</button>
                                  </div>
                                  {modulesLoading ? (
                                    <div className="flex items-center gap-2 py-3 justify-center text-[10px]" style={{ color: 'var(--studio-dust)' }}>
                                      <Loader2 className="w-3 h-3 animate-spin" /> Loading modules...
                                    </div>
                                  ) : (
                                    <div className="max-h-48 overflow-y-auto studio-scroll flex flex-col gap-1">
                                      {filteredModules.map(m => {
                                        const isAssigned = (stage.module_ids ?? []).includes(m.id)
                                        return (
                                          <button key={m.id} onClick={() => toggleModule(idx, m.id)}
                                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors w-full"
                                            style={{
                                              background: isAssigned ? 'rgba(78,205,196,0.08)' : 'transparent',
                                              border: `1px solid ${isAssigned ? 'rgba(78,205,196,0.2)' : 'transparent'}`,
                                            }}
                                            onMouseEnter={e => { if (!isAssigned) e.currentTarget.style.background = 'rgba(126,200,227,0.06)' }}
                                            onMouseLeave={e => { if (!isAssigned) e.currentTarget.style.background = 'transparent' }}>
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${isAssigned ? 'border-[#4ECDC4]' : ''}`}
                                              style={{ borderColor: isAssigned ? '#4ECDC4' : 'var(--studio-border)', background: isAssigned ? '#4ECDC4' : 'transparent' }}>
                                              {isAssigned && <span className="text-white text-[8px] font-bold">✓</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-[10px] font-medium truncate" style={{ color: 'var(--studio-dune)' }}>{m.title}</div>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] font-bold px-1 py-0 rounded capitalize"
                                                  style={{ background: `${SOURCE_COLORS[m.source] || '#666'}15`, color: SOURCE_COLORS[m.source] || '#666' }}>
                                                  {m.source}
                                                </span>
                                                <span className="text-[9px] font-bold px-1 py-0 rounded capitalize"
                                                  style={{ background: `${TIER_COLORS[m.tier]}18`, color: TIER_COLORS[m.tier] }}>
                                                  {m.tier}
                                                </span>
                                                <span className="text-[9px] font-mono" style={{ color: 'var(--studio-ash)' }}>{m.duration_m}m</span>
                                              </div>
                                            </div>
                                          </button>
                                        )
                                      })}
                                      {filteredModules.length === 0 && (
                                        <p className="text-center text-[10px] py-3" style={{ color: 'var(--studio-ash)' }}>No modules found</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {stage.type === 'assess_gate' && (
                            <div className="grid grid-cols-3 gap-3 ml-9">
                              <div>
                                <label className="block text-[9px] font-semibold uppercase tracking-[0.06em] mb-1"
                                  style={{ color: 'var(--studio-ash)' }}>Domain</label>
                                <select value={stage.assess_domain ?? ''} onChange={e => updateStage(idx, { assess_domain: e.target.value })}
                                  className="studio-input text-[11px] py-1.5 px-2">
                                  {DOMAINS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-semibold uppercase tracking-[0.06em] mb-1"
                                  style={{ color: 'var(--studio-ash)' }}>Min Score</label>
                                <input type="number" value={stage.min_score ?? 150} onChange={e => updateStage(idx, { min_score: +e.target.value })}
                                  className="studio-input text-[11px] py-1.5 px-2" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-semibold uppercase tracking-[0.06em] mb-1"
                                  style={{ color: 'var(--studio-ash)' }}>On Fail</label>
                                <select value={stage.fail_action ?? 'loop'} onChange={e => updateStage(idx, { fail_action: e.target.value })}
                                  className="studio-input text-[11px] py-1.5 px-2">
                                  <option value="loop">Loop back</option>
                                  <option value="remediate">Remediation path</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
