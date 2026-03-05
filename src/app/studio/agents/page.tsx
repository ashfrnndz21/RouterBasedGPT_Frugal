'use client'
// src/app/studio/agents/page.tsx — Warm Workera-inspired agent configuration with AI test playground
import { useEffect, useState, useRef } from 'react'
import { Bot, Send, Wand2, Sparkles, Loader2, Clock, Cpu, ChevronDown, ChevronUp } from 'lucide-react'
import IconSelector, { ICON_MAP } from '@/components/Studio/IconSelector'

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // AI Test Playground state
  const [showTest, setShowTest] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testHistory, setTestHistory] = useState<{role:string;content:string;latencyMs?:number;model?:string}[]>([])
  const [testing, setTesting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Prompt Improvement state
  const [showImprove, setShowImprove] = useState(false)
  const [improving, setImproving] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [improvedPrompt, setImprovedPrompt] = useState('')

  useEffect(() => {
    fetch('/api/studio/agents')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setAgents(d.agents ?? []); if (d.agents?.[0]) setSelected({...d.agents[0]}) })
      .catch(() => {})
  }, [])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    await fetch('/api/studio/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Send test message to agent
  const sendTest = async () => {
    if (!testInput.trim() || !selected || testing) return
    const userMsg = testInput.trim()
    setTestInput('')
    setTestHistory(h => [...h, { role: 'user', content: userMsg }])
    setTesting(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-agent',
          agentId: selected.id,
          message: userMsg,
          history: testHistory.slice(-6),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestHistory(h => [...h, { role: 'assistant', content: data.reply, latencyMs: data.latencyMs, model: data.model }])
      } else {
        setTestHistory(h => [...h, { role: 'assistant', content: `Error: ${data.error ?? 'Failed to get response'}` }])
      }
    } catch { setTestHistory(h => [...h, { role: 'assistant', content: 'Network error — is an LLM provider configured?' }]) }
    setTesting(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // Improve system prompt with AI
  const improvePrompt = async () => {
    if (!selected?.system_prompt || improving) return
    setImproving(true)
    setSuggestions([])
    setImprovedPrompt('')
    setShowImprove(true)
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve-prompt',
          systemPrompt: selected.system_prompt,
          agentRole: selected.display_role || selected.name,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuggestions(data.suggestions ?? [])
        setImprovedPrompt(data.improvedPrompt ?? '')
      } else {
        setSuggestions([data.error ?? 'Failed to analyze prompt'])
      }
    } catch { setSuggestions(['Network error — is an LLM provider configured?']) }
    setImproving(false)
  }

  const MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5', 'granite4:micro (local)', 'qwen3:1.7b (local)']
  const TIERS = ['tier1', 'tier2', 'dynamic']

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(214,92,198,0.12)' }}>
            <Bot className="w-4.5 h-4.5" style={{ color: 'var(--studio-orchid)' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Agent Configuration</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              Configure AI agents — behaviours, prompts, routing, and model tiers
            </p>
          </div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {agents.map(a => {
          const isSelected = selected?.id === a.id
          return (
            <button key={a.id} onClick={() => setSelected({...a})}
              className={`studio-card p-6 text-left ${isSelected ? 'studio-card-selected' : ''}`}>
              <div className="mb-3">
                {ICON_MAP[a.emoji]
                  ? (() => { const I = ICON_MAP[a.emoji]; return <I className="w-6 h-6" style={{ color: 'var(--studio-orchid)' }} /> })()
                  : <span className="text-2xl">{a.emoji}</span>}
              </div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--studio-dune)' }}>{a.name}</div>
              <div className="text-[12px] mb-3 line-clamp-2" style={{ color: 'var(--studio-dust)' }}>{a.display_role}</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: a.active ? 'rgba(78,205,196,0.1)' : 'rgba(107,92,107,0.15)',
                           color: a.active ? '#4ECDC4' : 'var(--studio-ash)' }}>
                  {a.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(219,197,169,0.06)', color: 'var(--studio-dust)' }}>
                  {a.model?.split('-')[0]}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Editor */}
      {selected && (
        <div className="studio-card p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold flex items-center gap-2.5"
              style={{ color: 'var(--studio-dune)' }}>
              {ICON_MAP[selected.emoji]
                ? (() => { const I = ICON_MAP[selected.emoji]; return <I className="w-4.5 h-4.5" style={{ color: 'var(--studio-orchid)' }} /> })()
                : <span>{selected.emoji}</span>}
              Editing: {selected.name}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => { setShowTest(!showTest); setShowImprove(false) }}
                className="studio-btn-ghost flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--studio-gold)' }} />
                {showTest ? 'Hide Test' : 'Test Agent'}
              </button>
              <button onClick={save} disabled={saving} className="studio-btn-primary disabled:opacity-40">
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-5">
              {[
                { label: 'Agent Name', key: 'name', type: 'text' },
                { label: 'Display Role', key: 'display_role', type: 'text' },
                { label: 'Max Tokens', key: 'max_tokens', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="studio-label">{label}</label>
                  <input type={type} value={selected[key] ?? ''} onChange={e => setSelected((p: any) => ({ ...p, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                    className="studio-input" />
                </div>
              ))}
              <div>
                <label className="studio-label">Model</label>
                <select value={selected.model ?? ''} onChange={e => setSelected((p: any) => ({ ...p, model: e.target.value }))}
                  className="studio-input" style={{ cursor: 'pointer' }}>
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="studio-label">Routing Tier</label>
                <select value={selected.routing_tier ?? 'dynamic'} onChange={e => setSelected((p: any) => ({ ...p, routing_tier: e.target.value }))}
                  className="studio-input" style={{ cursor: 'pointer' }}>
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="studio-label">Agent Icon</label>
                <IconSelector
                  value={selected.emoji ?? ''}
                  onChange={val => setSelected((p: any) => ({ ...p, emoji: val }))}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="studio-label mb-0">System Prompt</label>
                <button onClick={improvePrompt} disabled={improving || !selected?.system_prompt}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors duration-200 disabled:opacity-30"
                  style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
                  {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Improve with AI
                </button>
              </div>
              <textarea value={selected.system_prompt ?? ''} onChange={e => setSelected((p: any) => ({ ...p, system_prompt: e.target.value }))}
                rows={16}
                className="studio-input font-mono"
                style={{ resize: 'none' }} />
            </div>
          </div>

          {/* AI Prompt Improvement Panel */}
          {showImprove && (
            <div className="mt-6 p-5 rounded-xl" style={{ background: 'rgba(250,201,87,0.04)', border: '1px solid rgba(250,201,87,0.15)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" style={{ color: 'var(--studio-gold)' }} />
                  <h3 className="text-[13px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Prompt Analysis</h3>
                </div>
                <button onClick={() => setShowImprove(false)} className="text-[11px]" style={{ color: 'var(--studio-ash)' }}>Dismiss</button>
              </div>
              {improving ? (
                <div className="flex items-center gap-2 py-4 justify-center text-[12px]" style={{ color: 'var(--studio-dust)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--studio-gold)' }} /> Analyzing prompt...
                </div>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <div className="mb-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2 block" style={{ color: 'var(--studio-dust)' }}>Suggestions</label>
                      <div className="flex flex-col gap-1.5">
                        {suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-[12px] py-1.5 px-3 rounded-lg"
                            style={{ background: 'rgba(250,201,87,0.06)', color: 'var(--studio-sand)' }}>
                            <span className="font-mono text-[10px] mt-0.5 flex-shrink-0" style={{ color: 'var(--studio-gold)' }}>{i+1}.</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {improvedPrompt && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--studio-dust)' }}>Improved Version</label>
                        <button onClick={() => { setSelected((p: any) => ({ ...p, system_prompt: improvedPrompt })); setShowImprove(false) }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                          style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.08)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.15)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.08)' }}>
                          Apply Improved Prompt
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto studio-scroll whitespace-pre-wrap"
                        style={{ background: 'var(--studio-bg-input)', color: 'var(--studio-sand)', border: '1px solid var(--studio-border)', maxHeight: 200 }}>
                        {improvedPrompt}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* AI Test Playground */}
          {showTest && (
            <div className="mt-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(214,92,198,0.2)', background: 'rgba(214,92,198,0.02)' }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(214,92,198,0.12)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--studio-orchid)' }} />
                  <h3 className="text-[13px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Test Playground</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(214,92,198,0.1)', color: 'var(--studio-orchid)' }}>
                    Live
                  </span>
                </div>
                <button onClick={() => { setTestHistory([]); setTestInput('') }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ color: 'var(--studio-dust)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#EF6461' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-dust)' }}>
                  Clear Chat
                </button>
              </div>

              {/* Chat messages */}
              <div className="px-5 py-4 max-h-[320px] overflow-y-auto studio-scroll" style={{ minHeight: 120 }}>
                {testHistory.length === 0 && (
                  <div className="text-center py-6 text-[12px]" style={{ color: 'var(--studio-ash)' }}>
                    Send a message to test <strong style={{ color: 'var(--studio-orchid)' }}>{selected.name}</strong> with its current system prompt
                  </div>
                )}
                {testHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className="max-w-[80%]">
                      <div className="text-[12px] px-4 py-2.5 rounded-2xl"
                        style={msg.role === 'user' ? {
                          background: 'rgba(214,92,198,0.12)', color: 'var(--studio-dune)',
                          borderBottomRightRadius: 6,
                        } : {
                          background: 'var(--studio-bg-card)', color: 'var(--studio-sand)',
                          border: '1px solid var(--studio-border)', borderBottomLeftRadius: 6,
                        }}>
                        {msg.content}
                      </div>
                      {msg.role === 'assistant' && msg.latencyMs && (
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          <span className="flex items-center gap-0.5 text-[9px] font-mono" style={{ color: 'var(--studio-ash)' }}>
                            <Clock className="w-2.5 h-2.5" /> {msg.latencyMs}ms
                          </span>
                          {msg.model && (
                            <span className="flex items-center gap-0.5 text-[9px] font-mono" style={{ color: 'var(--studio-ash)' }}>
                              <Cpu className="w-2.5 h-2.5" /> {msg.model}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {testing && (
                  <div className="flex justify-start mb-3">
                    <div className="px-4 py-2.5 rounded-2xl" style={{ background: 'var(--studio-bg-card)', border: '1px solid var(--studio-border)', borderBottomLeftRadius: 6 }}>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--studio-orchid)' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(214,92,198,0.12)' }}>
                <input value={testInput} onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTest() }}}
                  placeholder="Type a test message..."
                  className="studio-input flex-1" />
                <button onClick={sendTest} disabled={testing || !testInput.trim()}
                  className="studio-btn-primary flex items-center gap-1.5 disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
