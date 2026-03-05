'use client'
// src/app/studio/taxonomy/page.tsx — Visual taxonomy builder with AI suggestions
import { useEffect, useState, useCallback } from 'react'
import { Layers, Loader2, Sparkles, Plus, X } from 'lucide-react'
import TaxonomyGraph from '@/components/Studio/TaxonomyGraph'
import TaxonomyNodeEditor from '@/components/Studio/TaxonomyNodeEditor'
import type { Domain, Subdomain, Skill } from '@/components/Studio/TaxonomyGraph'

export default function TaxonomyPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [subdomains, setSubdomains] = useState<Subdomain[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [selected, setSelected] = useState<{ type: 'domain' | 'subdomain' | 'skill'; id: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // AI Suggest Skills state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [skillSuggestions, setSkillSuggestions] = useState<any[]>([])
  const [suggestDomain, setSuggestDomain] = useState('')
  const [addingSuggestion, setAddingSuggestion] = useState<number | null>(null)

  const load = useCallback(() => {
    fetch('/api/studio/taxonomy?type=all')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        setDomains(d.domains ?? [])
        setSubdomains(d.subdomains ?? [])
        setSkills(d.skills ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // AI: Suggest skills for a domain
  const suggestSkills = async (domainId: string) => {
    setSuggesting(true)
    setSkillSuggestions([])
    setSuggestDomain(domainId)
    setShowSuggestions(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest-skills', domainId }),
      })
      const data = await res.json()
      if (res.ok) setSkillSuggestions(data.suggestions ?? [])
      else setSkillSuggestions([])
    } catch { /* silently handle */ }
    setSuggesting(false)
  }

  // Add a suggested skill to the taxonomy
  const addSuggestedSkill = async (suggestion: any, idx: number) => {
    setAddingSuggestion(idx)
    // Find matching subdomain or use the first one
    const matchingSub = subdomains.find(s =>
      s.name.toLowerCase().includes(suggestion.subdomain.toLowerCase().replace('new: ', ''))
    )
    if (matchingSub) {
      await fetch('/api/studio/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skill',
          subdomain_id: matchingSub.id,
          name: suggestion.skill,
          description: suggestion.reason,
        }),
      })
      load()
    }
    setAddingSuggestion(null)
  }

  const selectedItem = selected
    ? selected.type === 'domain' ? domains.find(d => d.id === selected.id)
    : selected.type === 'subdomain' ? subdomains.find(s => s.id === selected.id)
    : skills.find(s => s.id === selected.id)
    : null

  // Compute parent name for editor context
  const parentName = selected
    ? selected.type === 'skill'
      ? (() => { const sk = skills.find(s => s.id === selected.id) as any; return sk ? subdomains.find(sub => sub.id === sk.subdomain_id)?.name : undefined })()
      : selected.type === 'subdomain'
        ? (() => { const sub = subdomains.find(s => s.id === selected.id) as any; return sub ? domains.find(d => d.id === sub.domain_id)?.name : undefined })()
        : undefined
    : undefined

  const handleSelect = useCallback((type: 'domain' | 'subdomain' | 'skill', id: string) => {
    setSelected({ type, id })
  }, [])

  const handleAdd = useCallback(async (type: 'subdomain' | 'skill', parentId: string) => {
    await fetch('/api/studio/taxonomy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        ...(type === 'subdomain' ? { domain_id: parentId } : { subdomain_id: parentId }),
        name: `New ${type}`,
        description: '',
      }),
    })
    load()
  }, [load])

  const handleSave = useCallback(async (form: Record<string, any>) => {
    if (!selected) return
    setSaving(true)
    await fetch('/api/studio/taxonomy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selected.type, id: selected.id, ...form }),
    })
    setSaving(false)
    load()
  }, [selected, load])

  const handleDelete = useCallback(async () => {
    if (!selected || selected.type === 'domain') return
    await fetch('/api/studio/taxonomy', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selected.type, id: selected.id }),
    })
    setSelected(null)
    load()
  }, [selected, load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--studio-orchid)' }} />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(214,92,198,0.12)' }}>
            <Layers className="w-4 h-4" style={{ color: 'var(--studio-orchid)' }} />
          </div>
          <div>
            <h1 className="font-display text-[18px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Taxonomy Builder</h1>
            <p className="text-[11px]" style={{ color: 'var(--studio-dust)' }}>
              Visual graph — click nodes to edit, hover for actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: 'var(--studio-ash)' }}>
            <span>{domains.length} domains</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{subdomains.length} subdomains</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{skills.length} skills</span>
          </div>
          {domains.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={suggestDomain || domains[0]?.id || ''} onChange={e => setSuggestDomain(e.target.value)}
                className="studio-input text-[10px] py-1 px-2" style={{ width: 'auto' }}>
                {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button onClick={() => suggestSkills(suggestDomain || domains[0]?.id)}
                disabled={suggesting}
                className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors duration-200"
                style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
                {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Suggest Skills
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Skill Suggestions Panel */}
      {showSuggestions && (
        <div className="mb-3 p-4 rounded-xl" style={{ background: 'rgba(250,201,87,0.04)', border: '1px solid rgba(250,201,87,0.15)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--studio-gold)' }} />
              <h3 className="text-[12px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                AI Skill Suggestions
                {suggestDomain && <span className="font-normal ml-1" style={{ color: 'var(--studio-dust)' }}>
                  for {domains.find(d => d.id === suggestDomain)?.name}
                </span>}
              </h3>
            </div>
            <button onClick={() => setShowSuggestions(false)}>
              <X className="w-3.5 h-3.5" style={{ color: 'var(--studio-ash)' }} />
            </button>
          </div>
          {suggesting ? (
            <div className="flex items-center gap-2 py-3 justify-center text-[11px]" style={{ color: 'var(--studio-dust)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--studio-gold)' }} /> Analyzing taxonomy gaps...
            </div>
          ) : skillSuggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skillSuggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: 'rgba(250,201,87,0.06)', border: '1px solid rgba(250,201,87,0.1)' }}>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: 'var(--studio-dune)' }}>{s.skill}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
                      {s.subdomain} &middot; {s.reason}
                    </div>
                  </div>
                  <button onClick={() => addSuggestedSkill(s, i)} disabled={addingSuggestion === i}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors flex-shrink-0"
                    style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.08)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.08)' }}>
                    {addingSuggestion === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] py-2" style={{ color: 'var(--studio-ash)' }}>No suggestions generated. Try again or select a different domain.</p>
          )}
        </div>
      )}

      {/* Graph + Editor layout */}
      <div className="flex-1 flex gap-0 rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--studio-border)' }}>
        <div className="flex-1">
          <TaxonomyGraph
            domains={domains}
            subdomains={subdomains}
            skills={skills}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
            onAdd={handleAdd}
          />
        </div>

        {selected && selectedItem && (
          <div className="w-[340px] flex-shrink-0">
            <TaxonomyNodeEditor
              type={selected.type}
              data={selectedItem}
              onSave={handleSave}
              onDelete={selected.type !== 'domain' ? handleDelete : undefined}
              onClose={() => setSelected(null)}
              saving={saving}
              parentName={parentName}
            />
          </div>
        )}
      </div>
    </div>
  )
}
