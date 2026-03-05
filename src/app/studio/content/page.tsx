'use client'
// src/app/studio/content/page.tsx — Content Library with AI curation
import { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Plus, Search, Loader2, Sparkles, ExternalLink,
  Video, FileText, FlaskConical, CircleHelp, Zap,
  X, Star, Clock, Link2, Pencil, Trash2,
} from 'lucide-react'

const TIERS = ['spark', 'build', 'lead', 'apex'] as const
const TIER_COLORS: Record<string, string> = { spark: '#EF6461', build: '#fac957', lead: '#4ECDC4', apex: '#d65cc6' }
const TYPES = ['video', 'article', 'lab', 'quiz', 'interactive'] as const
const TYPE_ICONS: Record<string, any> = { video: Video, article: FileText, lab: FlaskConical, quiz: CircleHelp, interactive: Zap }
const SOURCES = ['internal', 'aws', 'coursera', 'youtube'] as const
const SOURCE_COLORS: Record<string, string> = { coursera: '#0056D2', aws: '#FF9900', youtube: '#FF0000', internal: '#d65cc6' }

export default function ContentPage() {
  const [modules, setModules] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterSource, setFilterSource] = useState('')

  // Taxonomy data for linking
  const [domains, setDomains] = useState<any[]>([])
  const [subdomains, setSubdomains] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])

  // Editor state
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // AI curate state
  const [curating, setCurating] = useState(false)
  const [curatedSuggestions, setCuratedSuggestions] = useState<any[]>([])

  // Load modules
  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterDomain) params.set('domain', filterDomain)
    if (filterTier) params.set('tier', filterTier)
    if (filterType) params.set('type', filterType)
    if (filterSource) params.set('source', filterSource)

    fetch(`/api/studio/content?${params}`)
      .then(r => r.json())
      .then(d => { setModules(d.modules ?? []); setTotal(d.total ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, filterDomain, filterTier, filterType, filterSource])

  useEffect(() => { load() }, [load])

  // Load taxonomy for skill linking
  useEffect(() => {
    fetch('/api/studio/taxonomy?type=all')
      .then(r => r.json())
      .then(d => {
        setDomains(d.domains ?? [])
        setSubdomains(d.subdomains ?? [])
        setSkills(d.skills ?? [])
      })
      .catch(() => {})
  }, [])

  const saveModule = async () => {
    if (!editing) return
    setSaving(true)
    const isNew = !editing.id || editing._isNew
    const method = isNew ? 'POST' : 'PUT'
    await fetch('/api/studio/content', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    setSaving(false)
    setEditing(null)
    load()
  }

  const deleteModule = async (id: string) => {
    await fetch('/api/studio/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const newModule = () => {
    setEditing({
      _isNew: true,
      title: '', description: '', domain: 'ai_essentials', tier: 'spark',
      type: 'video', source: 'internal', url: '', duration_m: 30,
      tags: [], rating: null, skill_id: null,
    })
  }

  // AI curate content for a skill
  const curateContent = async () => {
    if (!editing?.skill_id || curating) return
    const skill = skills.find(s => s.id === editing.skill_id)
    const sub = skill ? subdomains.find(s => s.id === skill.subdomain_id) : null
    const dom = sub ? domains.find(d => d.id === sub.domain_id) : null
    if (!skill) return

    setCurating(true)
    setCuratedSuggestions([])
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'curate-content',
          skillName: skill.name,
          domainName: dom?.name || editing.domain,
          subdomainName: sub?.name,
        }),
      })
      const data = await res.json()
      if (res.ok) setCuratedSuggestions(data.suggestions ?? [])
    } catch { /* silently handle */ }
    setCurating(false)
  }

  const applySuggestion = (s: any) => {
    setEditing((p: any) => ({
      ...p,
      title: s.title || p.title,
      description: s.description || p.description,
      source: s.source || p.source,
      url: s.url || p.url,
      type: s.type || p.type,
      duration_m: s.durationMinutes || p.duration_m,
      tier: s.tier || p.tier,
    }))
    setCuratedSuggestions([])
  }

  // Filtered subdomains/skills for linking cascade
  const editDomain = editing?.domain || ''
  const filteredSubs = subdomains.filter(s => {
    const dom = domains.find(d => d.name === editDomain || d.id === editDomain)
    return dom ? s.domain_id === dom.id : false
  })
  const editSubId = editing?.subdomain ? subdomains.find(s => s.name === editing.subdomain)?.id : filteredSubs[0]?.id
  const filteredSkills = skills.filter(s => s.subdomain_id === editSubId)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(126,200,227,0.12)' }}>
            <BookOpen className="w-4.5 h-4.5" style={{ color: '#7EC8E3' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Content Library</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Manage learning modules — link to taxonomy skills, curate from external LMS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono" style={{ color: 'var(--studio-ash)' }}>{total} modules</span>
          <button onClick={newModule} className="studio-btn-primary">+ Add Module</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--studio-ash)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="studio-input pl-9" />
        </div>
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
          className="studio-input" style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="">All domains</option>
          {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
          className="studio-input" style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="">All tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="studio-input" style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="studio-input" style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex gap-5">
        {/* Module table */}
        <div className={`studio-card overflow-hidden ${editing ? 'flex-1' : 'w-full'}`}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--studio-border)' }}>
                {['Source', 'Module', 'Domain', 'Tier', 'Type', 'Duration', 'Skill', 'Rating', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.08em] uppercase"
                    style={{ color: 'var(--studio-dust)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="py-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--studio-orchid)' }} />
                </td></tr>
              )}
              {!loading && modules.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
                  No modules found
                </td></tr>
              )}
              {modules.map(m => {
                const TypeIcon = TYPE_ICONS[m.type] || FileText
                return (
                  <tr key={m.id} className="transition-colors duration-200"
                    style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(126,200,227,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: `${SOURCE_COLORS[m.source] || '#666'}15`, color: SOURCE_COLORS[m.source] || '#666' }}>
                        {m.source}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ maxWidth: 250 }}>
                      <div className="text-[12px] font-medium truncate" style={{ color: 'var(--studio-dune)' }}>{m.title}</div>
                      <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--studio-ash)' }}>{m.description}</div>
                    </td>
                    <td className="px-4 py-3 text-[11px] capitalize" style={{ color: 'var(--studio-dust)' }}>
                      {m.domain?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: `${TIER_COLORS[m.tier]}18`, color: TIER_COLORS[m.tier] }}>
                        {m.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TypeIcon className="w-3.5 h-3.5" style={{ color: 'var(--studio-dust)' }} />
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono" style={{ color: 'var(--studio-dust)' }}>
                      {m.duration_m}m
                    </td>
                    <td className="px-4 py-3 text-[10px]" style={{ color: m.skill_name ? '#4ECDC4' : 'var(--studio-ash)' }}>
                      {m.skill_name || 'Unlinked'}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono" style={{ color: 'var(--studio-gold)' }}>
                      {m.rating ? `${m.rating}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditing({ ...m, tags: typeof m.tags === 'string' ? JSON.parse(m.tags || '[]') : (m.tags || []) })}
                          className="p-1 rounded transition-colors" style={{ color: 'var(--studio-ash)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--studio-orchid)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)' }}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noopener noreferrer"
                            className="p-1 rounded transition-colors" style={{ color: 'var(--studio-ash)' }}>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Edit drawer */}
        {editing && (
          <div className="w-[380px] flex-shrink-0 studio-card p-5 self-start sticky top-8 max-h-[calc(100vh-120px)] overflow-y-auto studio-scroll">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                {editing._isNew ? 'New Module' : 'Edit Module'}
              </h2>
              <button onClick={() => { setEditing(null); setCuratedSuggestions([]) }}>
                <X className="w-4 h-4" style={{ color: 'var(--studio-ash)' }} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="studio-label">Title</label>
                <input value={editing.title ?? ''} onChange={e => setEditing((p: any) => ({ ...p, title: e.target.value }))}
                  className="studio-input" />
              </div>
              <div>
                <label className="studio-label">Description</label>
                <textarea value={editing.description ?? ''} onChange={e => setEditing((p: any) => ({ ...p, description: e.target.value }))}
                  rows={3} className="studio-input" style={{ resize: 'none' }} />
              </div>
              <div>
                <label className="studio-label">URL</label>
                <input value={editing.url ?? ''} onChange={e => setEditing((p: any) => ({ ...p, url: e.target.value }))}
                  className="studio-input" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="studio-label">Source</label>
                  <select value={editing.source ?? 'internal'} onChange={e => setEditing((p: any) => ({ ...p, source: e.target.value }))}
                    className="studio-input" style={{ cursor: 'pointer' }}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="studio-label">Type</label>
                  <select value={editing.type ?? 'video'} onChange={e => setEditing((p: any) => ({ ...p, type: e.target.value }))}
                    className="studio-input" style={{ cursor: 'pointer' }}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="studio-label">Domain</label>
                  <select value={editing.domain ?? 'ai_essentials'} onChange={e => setEditing((p: any) => ({ ...p, domain: e.target.value }))}
                    className="studio-input" style={{ cursor: 'pointer' }}>
                    {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="studio-label">Tier</label>
                  <select value={editing.tier ?? 'spark'} onChange={e => setEditing((p: any) => ({ ...p, tier: e.target.value }))}
                    className="studio-input" style={{ cursor: 'pointer' }}>
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="studio-label">Duration (min)</label>
                  <input type="number" value={editing.duration_m ?? 0} onChange={e => setEditing((p: any) => ({ ...p, duration_m: +e.target.value }))}
                    className="studio-input font-mono" />
                </div>
                <div>
                  <label className="studio-label">Rating</label>
                  <input type="number" step="0.1" min="0" max="5" value={editing.rating ?? ''} onChange={e => setEditing((p: any) => ({ ...p, rating: e.target.value ? +e.target.value : null }))}
                    className="studio-input font-mono" placeholder="0-5" />
                </div>
              </div>

              {/* Skill linker */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(78,205,196,0.04)', border: '1px solid rgba(78,205,196,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Link2 className="w-3.5 h-3.5" style={{ color: '#4ECDC4' }} />
                  <label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: '#4ECDC4' }}>Link to Taxonomy Skill</label>
                </div>
                <select value={editing.skill_id ?? ''} onChange={e => setEditing((p: any) => ({ ...p, skill_id: e.target.value || null }))}
                  className="studio-input text-[11px]" style={{ cursor: 'pointer' }}>
                  <option value="">No skill linked</option>
                  {domains.map(dom => {
                    const domSubs = subdomains.filter(s => s.domain_id === dom.id)
                    return domSubs.map(sub => {
                      const subSkills = skills.filter(s => s.subdomain_id === sub.id)
                      return subSkills.map(sk => (
                        <option key={sk.id} value={sk.id}>
                          {dom.name} &rsaquo; {sub.name} &rsaquo; {sk.name}
                        </option>
                      ))
                    })
                  })}
                </select>
              </div>

              {/* AI Curate button */}
              {editing.skill_id && (
                <button onClick={curateContent} disabled={curating}
                  className="flex items-center gap-1.5 justify-center text-[11px] font-bold py-2 rounded-lg transition-colors duration-200 disabled:opacity-40"
                  style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)', border: '1px solid rgba(250,201,87,0.12)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
                  {curating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Curate for This Skill
                </button>
              )}

              {/* AI suggestions */}
              {curatedSuggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--studio-gold)' }}>AI Suggestions</label>
                  {curatedSuggestions.map((s, i) => (
                    <button key={i} onClick={() => applySuggestion(s)}
                      className="text-left p-3 rounded-lg transition-colors"
                      style={{ background: 'rgba(250,201,87,0.04)', border: '1px solid rgba(250,201,87,0.1)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.04)' }}>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--studio-dune)' }}>{s.title}</div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--studio-dust)' }}>
                        <span className="capitalize">{s.source}</span>
                        {s.durationMinutes && <span>{s.durationMinutes}m</span>}
                        <span style={{ color: 'var(--studio-gold)' }}>Click to apply</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save / Delete buttons */}
            <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--studio-border)' }}>
              {!editing._isNew && (
                <button onClick={() => { deleteModule(editing.id); setEditing(null) }}
                  className="p-2 rounded-lg transition-colors" style={{ color: 'var(--studio-ash)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#EF6461' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setEditing(null); setCuratedSuggestions([]) }} className="studio-btn-ghost">Cancel</button>
              <button onClick={saveModule} disabled={saving} className="studio-btn-primary disabled:opacity-40">
                {saving ? 'Saving...' : editing._isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
