'use client'
// src/app/studio/questions/page.tsx — Warm Workera-inspired question bank
import { useState, useEffect } from 'react'
import { Plus, X, GripVertical, Check, HelpCircle, Sparkles, Loader2, Wand2 } from 'lucide-react'

const DOMAINS = ['all','ai_essentials','data_science','mlops','responsible_ai','prompt_engineering','cloud_ai','ai_strategy','ai_security']
const TYPES = ['all','mcq','truefalse','matching','ordering','voice','written']
const DIFFS = ['all','easy','medium','hard']
const TYPE_COLORS: Record<string,string> = { mcq:'#7EC8E3', truefalse:'#4ECDC4', matching:'#d65cc6', ordering:'#fac957', voice:'#EF6461', written:'#ff9412' }
const DIFF_COLORS: Record<string,string> = { easy:'#4ECDC4', medium:'#fac957', hard:'#EF6461' }

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [domain, setDomain] = useState('all')
  const [type, setType] = useState('all')
  const [diff, setDiff] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // AI generation state
  const [showGenModal, setShowGenModal] = useState(false)
  const [genDomain, setGenDomain] = useState('ai_essentials')
  const [genType, setGenType] = useState('mcq')
  const [genDiff, setGenDiff] = useState('medium')
  const [genCount, setGenCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<any[]>([])
  const [genError, setGenError] = useState('')
  const [improving, setImproving] = useState(false)

  const load = () => {
    const q = new URLSearchParams()
    if (domain !== 'all') q.set('domain', domain)
    if (type !== 'all') q.set('type', type)
    if (diff !== 'all') q.set('difficulty', diff)
    if (search) q.set('search', search)
    fetch(`/api/studio/questions?${q}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setQuestions(d.questions ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
  }

  useEffect(() => { load() }, [domain, type, diff, search])

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    await fetch('/api/studio/questions', {
      method: editing.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    setSaving(false); setEditing(null); load()
  }

  // AI: Generate questions
  const generateQuestions = async () => {
    setGenerating(true); setGenError(''); setGenerated([])
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-questions', domain: genDomain, difficulty: genDiff, type: genType, count: genCount }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Generation failed') }
      const data = await res.json()
      setGenerated(data.questions ?? [])
    } catch (e: any) { setGenError(e.message) }
    setGenerating(false)
  }

  // AI: Add generated question to bank
  const addGenerated = async (q: any) => {
    await fetch('/api/studio/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...q, domain: genDomain }),
    })
    setGenerated(prev => prev.filter(x => x !== q))
    load()
  }

  // AI: Improve question in edit drawer
  const improveQuestion = async () => {
    if (!editing) return
    setImproving(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve-question', question: editing }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.improved) {
        setEditing((p: any) => ({
          ...p,
          text: data.improved.text || p.text,
          explanation: data.improved.explanation || p.explanation,
          options: data.improved.options || p.options,
        }))
      }
    } catch {}
    setImproving(false)
  }

  const FilterBar = ({ value, setValue, options }: { value: string; setValue: (v: string) => void; options: string[] }) => (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={o} onClick={() => setValue(o)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all duration-200"
          style={{
            background: value === o ? 'var(--studio-orchid)' : 'rgba(219,197,169,0.06)',
            color: value === o ? '#fff' : 'var(--studio-dust)',
            boxShadow: value === o ? '0 2px 8px rgba(214,92,198,0.25)' : 'none',
          }}
          onMouseEnter={e => { if (value !== o) e.currentTarget.style.color = 'var(--studio-sand)' }}
          onMouseLeave={e => { if (value !== o) e.currentTarget.style.color = 'var(--studio-dust)' }}>
          {o.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(78,205,196,0.12)' }}>
            <HelpCircle className="w-4.5 h-4.5" style={{ color: '#4ECDC4' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Question Bank</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              {total} questions across 8 domains
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
            className="studio-input" style={{ width: 220 }} />
          <button onClick={() => setShowGenModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl transition-all duration-200"
            style={{ background: 'rgba(250,201,87,0.12)', color: 'var(--studio-gold)', border: '1px solid rgba(250,201,87,0.25)' }}>
            <Sparkles className="w-3.5 h-3.5" /> Generate with AI
          </button>
          <button onClick={() => setEditing({ type: 'mcq', difficulty: 'medium', domain: 'ai_essentials', text: '', explanation: '', options: [], tags: [] })}
            className="studio-btn-primary">
            + Add Manual
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 mb-6">
        <FilterBar value={domain} setValue={setDomain} options={DOMAINS} />
        <div className="flex gap-5">
          <FilterBar value={type} setValue={setType} options={TYPES} />
          <FilterBar value={diff} setValue={setDiff} options={DIFFS} />
        </div>
      </div>

      {/* Table */}
      <div className="studio-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--studio-border)' }}>
              {['ID','Question','Domain','Type','Difficulty','Acc%','Uses',''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold tracking-[0.08em] uppercase"
                  style={{ color: 'var(--studio-dust)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map(q => (
              <tr key={q.id}
                className="transition-colors duration-200"
                style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,92,198,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <td className="px-5 py-3 font-mono text-[10px]" style={{ color: 'var(--studio-ash)' }}>{q.id}</td>
                <td className="px-5 py-3 text-[12px] max-w-[280px]" style={{ color: 'var(--studio-sand)' }}>
                  <div className="truncate">{q.text}</div>
                </td>
                <td className="px-5 py-3 text-[12px] capitalize" style={{ color: 'var(--studio-dust)' }}>{q.domain?.replace('_',' ')}</td>
                <td className="px-5 py-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${TYPE_COLORS[q.type] ?? '#888'}18`, color: TYPE_COLORS[q.type] ?? '#888' }}>
                    {q.type}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-[12px]" style={{ color: 'var(--studio-dust)' }}>
                  {Math.round((q.acceptance_rate ?? 0) * 100)}%
                </td>
                <td className="px-5 py-3 font-mono text-[12px]" style={{ color: 'var(--studio-ash)' }}>{q.times_used ?? 0}</td>
                <td className="px-5 py-3">
                  <button onClick={() => setEditing(q)} className="text-[12px] transition-colors duration-200"
                    style={{ color: 'var(--studio-orchid)' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {questions.length === 0 && (
          <div className="py-10 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>No questions found</div>
        )}
      </div>

      {/* Edit drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-end"
          style={{ background: 'rgba(26,18,32,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-[520px] h-full p-6 overflow-y-auto studio-scroll"
            style={{ background: 'var(--studio-bg-deep)', borderLeft: '1px solid var(--studio-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                {editing.id ? 'Edit Question' : 'New Question'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="studio-btn-ghost">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="studio-btn-primary disabled:opacity-40">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="studio-label">Domain</label>
                <select value={editing.domain ?? ''} onChange={e => setEditing((p: any) => ({ ...p, domain: e.target.value }))}
                  className="studio-input" style={{ cursor: 'pointer' }}>
                  {DOMAINS.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="studio-label">Type</label>
                  <select value={editing.type ?? ''} onChange={e => setEditing((p: any) => ({ ...p, type: e.target.value }))}
                    className="studio-input" style={{ cursor: 'pointer' }}>
                    {TYPES.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="studio-label">Difficulty</label>
                  <select value={editing.difficulty ?? ''} onChange={e => setEditing((p: any) => ({ ...p, difficulty: e.target.value }))}
                    className="studio-input" style={{ cursor: 'pointer' }}>
                    {DIFFS.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="studio-label" style={{ marginBottom: 0 }}>Question Text</label>
                  <button onClick={improveQuestion} disabled={improving || !editing.text}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all duration-200 disabled:opacity-30"
                    style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}>
                    {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    {improving ? 'Improving...' : 'Improve with AI'}
                  </button>
                </div>
                <textarea value={editing.text ?? ''} onChange={e => setEditing((p: any) => ({ ...p, text: e.target.value }))} rows={4}
                  className="studio-input" style={{ resize: 'none' }} />
              </div>
              <div>
                <label className="studio-label">Explanation</label>
                <textarea value={editing.explanation ?? ''} onChange={e => setEditing((p: any) => ({ ...p, explanation: e.target.value }))} rows={3}
                  className="studio-input" style={{ resize: 'none' }} />
              </div>
              {editing.type === 'mcq' && (
                <div>
                  <label className="studio-label">Answer Options</label>
                  <div className="flex flex-col gap-2.5">
                    {(editing.options ?? []).map((opt: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200"
                        style={{
                          borderColor: opt.correct ? 'rgba(78,205,196,0.35)' : 'var(--studio-border)',
                          background: opt.correct ? 'rgba(78,205,196,0.06)' : 'var(--studio-bg-input)',
                        }}>
                        <GripVertical className="w-3.5 h-3.5 flex-shrink-0 cursor-grab" style={{ color: 'var(--studio-ash)' }} />
                        <input
                          value={opt.text ?? opt ?? ''}
                          onChange={e => {
                            const opts = [...(editing.options ?? [])]
                            opts[i] = typeof opt === 'string' ? e.target.value : { ...opt, text: e.target.value }
                            setEditing((p: any) => ({ ...p, options: opts }))
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 bg-transparent text-[12px] outline-none"
                          style={{ color: 'var(--studio-dune)' }}
                        />
                        <button
                          onClick={() => {
                            const opts = [...(editing.options ?? [])].map((o: any, j: number) => {
                              const obj = typeof o === 'string' ? { text: o, correct: false } : { ...o }
                              obj.correct = j === i
                              return obj
                            })
                            setEditing((p: any) => ({ ...p, options: opts }))
                          }}
                          title="Mark as correct"
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                          style={{
                            background: opt.correct ? '#4ECDC4' : 'transparent',
                            color: opt.correct ? '#fff' : 'var(--studio-ash)',
                            border: opt.correct ? 'none' : '1px solid var(--studio-border)',
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            const opts = (editing.options ?? []).filter((_: any, j: number) => j !== i)
                            setEditing((p: any) => ({ ...p, options: opts }))
                          }}
                          className="transition-colors duration-200 flex-shrink-0"
                          style={{ color: 'var(--studio-ash)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#EF6461' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)' }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const opts = [...(editing.options ?? []), { text: '', correct: false }]
                        setEditing((p: any) => ({ ...p, options: opts }))
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] rounded-xl border border-dashed transition-colors duration-200"
                      style={{ color: 'var(--studio-orchid)', borderColor: 'rgba(214,92,198,0.25)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(214,92,198,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(214,92,198,0.25)' }}
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(26,18,32,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="studio-card w-full max-w-2xl max-h-[85vh] overflow-y-auto studio-scroll p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--studio-gold)' }} />
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--studio-dune)' }}>
                  AI Question Generator
                </h2>
              </div>
              <button onClick={() => { setShowGenModal(false); setGenerated([]); setGenError('') }}
                className="studio-btn-ghost">Close</button>
            </div>

            {/* Config row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div>
                <label className="studio-label">Domain</label>
                <select value={genDomain} onChange={e => setGenDomain(e.target.value)}
                  className="studio-input text-[11px]" style={{ cursor: 'pointer' }}>
                  {DOMAINS.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="studio-label">Type</label>
                <select value={genType} onChange={e => setGenType(e.target.value)}
                  className="studio-input text-[11px]" style={{ cursor: 'pointer' }}>
                  {TYPES.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="studio-label">Difficulty</label>
                <select value={genDiff} onChange={e => setGenDiff(e.target.value)}
                  className="studio-input text-[11px]" style={{ cursor: 'pointer' }}>
                  {DIFFS.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="studio-label">Count</label>
                <select value={genCount} onChange={e => setGenCount(+e.target.value)}
                  className="studio-input text-[11px]" style={{ cursor: 'pointer' }}>
                  {[1,2,3,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <button onClick={generateQuestions} disabled={generating}
              className="studio-btn-primary w-full flex items-center justify-center gap-2 mb-5 disabled:opacity-40">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : `Generate ${genCount} Questions`}
            </button>

            {genError && (
              <div className="mb-4 p-3 rounded-xl text-[12px]"
                style={{ background: 'rgba(239,100,97,0.08)', color: '#EF6461', border: '1px solid rgba(239,100,97,0.2)' }}>
                {genError}
              </div>
            )}

            {/* Generated preview cards */}
            {generated.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--studio-sand)' }}>
                    {generated.length} questions generated
                  </span>
                  <button onClick={async () => {
                    for (const q of generated) await addGenerated(q)
                    setGenerated([])
                  }} className="text-[11px] font-bold" style={{ color: 'var(--studio-orchid)' }}>
                    Add All to Bank
                  </button>
                </div>
                {generated.map((q: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--studio-bg-elevated)', border: '1px solid var(--studio-border)' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-[12px] flex-1" style={{ color: 'var(--studio-dune)' }}>{q.text}</p>
                      <button onClick={() => addGenerated(q)}
                        className="flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(78,205,196,0.12)', color: '#4ECDC4' }}>
                        + Add
                      </button>
                    </div>
                    {q.options && (
                      <div className="flex flex-col gap-1 mb-2">
                        {q.options.map((o: any, j: number) => (
                          <div key={j} className="flex items-center gap-2 text-[11px]"
                            style={{ color: o.correct ? '#4ECDC4' : 'var(--studio-dust)' }}>
                            <span className="font-mono w-4">{o.letter}.</span>
                            <span>{o.text}</span>
                            {o.correct && <Check className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.explanation && (
                      <p className="text-[10px] italic" style={{ color: 'var(--studio-ash)' }}>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!generating && generated.length === 0 && !genError && (
              <div className="text-center py-8 text-[13px]" style={{ color: 'var(--studio-ash)' }}>
                Configure parameters above and click Generate
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
