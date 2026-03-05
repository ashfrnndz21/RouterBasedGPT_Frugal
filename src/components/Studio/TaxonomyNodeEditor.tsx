'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Save, Sparkles, Loader2, BookOpen, Plus } from 'lucide-react'
import ColorPicker from './ColorPicker'
import IconSelector from './IconSelector'

interface Props {
  type: 'domain' | 'subdomain' | 'skill'
  data: Record<string, any>
  onSave: (updated: Record<string, any>) => void
  onDelete?: () => void
  onClose: () => void
  saving: boolean
  parentName?: string
}

export default function TaxonomyNodeEditor({ type, data, onSave, onDelete, onClose, saving, parentName }: Props) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [autoDescribing, setAutoDescribing] = useState(false)
  // Module count + AI content curation
  const [moduleCount, setModuleCount] = useState(0)
  const [suggestingContent, setSuggestingContent] = useState(false)
  const [contentSuggestions, setContentSuggestions] = useState<any[]>([])
  const [addingContent, setAddingContent] = useState<number | null>(null)

  useEffect(() => {
    setForm({ ...data })
    setConfirmDelete(false)
    setContentSuggestions([])
    // Load linked module count for skills
    if (data?.id && type === 'skill') {
      fetch(`/api/studio/content?skill_id=${data.id}`)
        .then(r => r.json())
        .then(d => setModuleCount((d.modules ?? []).length))
        .catch(() => setModuleCount(0))
    } else {
      setModuleCount(0)
    }
  }, [data, type])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave(form)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [form, onSave, onClose])

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }))

  // AI Auto-describe
  const autoDescribe = async () => {
    if (autoDescribing || !form.name) return
    setAutoDescribing(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-description',
          type,
          name: form.name,
          parentName: parentName || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.description) {
        update('description', data.description)
      }
    } catch { /* silently handle */ }
    setAutoDescribing(false)
  }

  // AI: Suggest content for this skill
  const suggestContent = async () => {
    if (suggestingContent || !form.name || type !== 'skill') return
    setSuggestingContent(true)
    setContentSuggestions([])
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'curate-content',
          skillName: form.name,
          domainName: parentName || '',
        }),
      })
      const data = await res.json()
      if (res.ok) setContentSuggestions(data.suggestions ?? [])
    } catch { /* silently handle */ }
    setSuggestingContent(false)
  }

  // Add AI suggestion to content library linked to this skill
  const addToLibrary = async (suggestion: any, idx: number) => {
    setAddingContent(idx)
    try {
      await fetch('/api/studio/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          source: suggestion.source || 'internal',
          url: suggestion.url || '',
          type: suggestion.type || 'video',
          duration_m: suggestion.durationMinutes || 30,
          tier: suggestion.tier || 'build',
          domain: form.domain_id || '',
          skill_id: data.id,
          tags: [],
          rating: null,
        }),
      })
      setModuleCount(c => c + 1)
      // Remove from suggestions
      setContentSuggestions(prev => prev.filter((_, i) => i !== idx))
    } catch { /* silently handle */ }
    setAddingContent(null)
  }

  const color = form.color || '#d65cc6'

  return (
    <div className="h-full flex flex-col studio-slide-in"
      style={{ background: 'var(--studio-bg-deep)', borderLeft: '1px solid var(--studio-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--studio-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <div>
            <h3 className="text-[13px] font-bold capitalize" style={{ color: 'var(--studio-dune)' }}>{type} Editor</h3>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--studio-ash)' }}>{data.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg transition-colors duration-200"
          style={{ color: 'var(--studio-ash)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--studio-sand)'; e.currentTarget.style.background = 'var(--studio-bg-elevated)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)'; e.currentTarget.style.background = 'transparent' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 studio-scroll">
        {/* Name */}
        <div>
          <label className="studio-label">Name</label>
          <input
            value={form.name ?? ''}
            onChange={e => update('name', e.target.value)}
            className="studio-input"
            placeholder="Node name"
          />
        </div>

        {/* Description with AI auto-describe */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="studio-label mb-0">Description</label>
            <button onClick={autoDescribe} disabled={autoDescribing || !form.name}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors duration-200 disabled:opacity-30"
              style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
              {autoDescribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Auto-describe
            </button>
          </div>
          <textarea
            value={form.description ?? ''}
            onChange={e => update('description', e.target.value)}
            rows={3}
            className="studio-input"
            style={{ resize: 'none' }}
            placeholder="Brief description"
          />
        </div>

        {/* Skill: Module count + Suggest Content */}
        {type === 'skill' && (
          <div className="p-3.5 rounded-xl" style={{ background: 'rgba(126,200,227,0.04)', border: '1px solid rgba(126,200,227,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" style={{ color: '#7EC8E3' }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                  Linked Content
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: moduleCount > 0 ? 'rgba(78,205,196,0.12)' : 'rgba(219,197,169,0.08)',
                    color: moduleCount > 0 ? '#4ECDC4' : 'var(--studio-ash)' }}>
                  {moduleCount} module{moduleCount !== 1 ? 's' : ''}
                </span>
              </div>
              <button onClick={suggestContent} disabled={suggestingContent || !form.name}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors duration-200 disabled:opacity-30"
                style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
                {suggestingContent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Suggest Content
              </button>
            </div>

            {/* AI content suggestions */}
            {suggestingContent && (
              <div className="flex items-center gap-2 py-3 justify-center text-[10px]" style={{ color: 'var(--studio-dust)' }}>
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--studio-gold)' }} /> Finding courses...
              </div>
            )}
            {contentSuggestions.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {contentSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-[10px]"
                    style={{ background: 'rgba(250,201,87,0.04)', border: '1px solid rgba(250,201,87,0.08)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: 'var(--studio-dune)' }}>{s.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--studio-dust)' }}>
                        <span className="capitalize">{s.source}</span>
                        <span>&middot;</span>
                        <span>{s.durationMinutes || '?'}m</span>
                        <span>&middot;</span>
                        <span className="capitalize">{s.type}</span>
                      </div>
                    </div>
                    <button onClick={() => addToLibrary(s, i)} disabled={addingContent === i}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition-colors flex-shrink-0"
                      style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.08)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.08)' }}>
                      {addingContent === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!suggestingContent && contentSuggestions.length === 0 && moduleCount === 0 && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--studio-ash)' }}>
                No content linked yet. Click "Suggest Content" to find courses.
              </p>
            )}
          </div>
        )}

        {/* Domain-specific fields */}
        {type === 'domain' && (
          <>
            {/* Icon selector */}
            <div>
              <label className="studio-label">Icon</label>
              <IconSelector
                value={form.emoji ?? ''}
                onChange={val => update('emoji', val)}
                accentColor={color}
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="studio-label">Color</label>
              <ColorPicker
                value={form.color ?? '#d65cc6'}
                onChange={val => update('color', val)}
              />
            </div>

            {/* Benchmark & Weight side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="studio-label">Benchmark</label>
                <input
                  type="number"
                  value={form.benchmark ?? ''}
                  onChange={e => update('benchmark', e.target.value)}
                  className="studio-input font-mono"
                  placeholder="0-300"
                />
              </div>
              <div>
                <label className="studio-label">Weight</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.weight ?? ''}
                  onChange={e => update('weight', e.target.value)}
                  className="studio-input font-mono"
                  placeholder="1-5"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--studio-border)' }}>
        {onDelete && type !== 'domain' && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { onDelete(); setConfirmDelete(false) }}
                className="px-3 py-2 bg-[#EF6461] text-white text-[11px] font-bold rounded-lg hover:bg-[#dc4c49] transition-colors">
                Confirm Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 text-[11px] transition-colors"
                style={{ color: 'var(--studio-dust)' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg transition-colors duration-200"
              style={{ color: 'var(--studio-ash)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#EF6461'; e.currentTarget.style.background = 'rgba(239,100,97,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)'; e.currentTarget.style.background = 'transparent' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}

        <div className="flex-1" />

        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="studio-btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
