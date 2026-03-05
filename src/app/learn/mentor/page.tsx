'use client'
// src/app/learn/mentor/page.tsx — Real profile injection, session-based
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'What should I study next?',
  'Explain concept drift',
  'Help me understand model bias',
  'What is a feature store?',
  'How does RAG work?',
]

function buildSageSystem(learner: any, scores: any[]) {
  const scoreLines = scores.length > 0
    ? scores.map((s: any) => `- ${s.domain.replace(/_/g, ' ')}: ${s.score} (${s.tier} tier)`).join('\n')
    : '(No assessments completed yet)'

  const lowestDomain = scores.length > 0
    ? scores.reduce((a: any, b: any) => a.score < b.score ? a : b)
    : null

  return `You are Sage, a warm and knowledgeable AI learning mentor for the Frugal AI learning platform.

Learner: ${learner?.name || 'Learner'}
Persona: ${learner?.persona_id || 'explorer'}
Streak: ${learner?.streak || 0} days

Domain scores:
${scoreLines}
${lowestDomain ? `Primary gap: ${lowestDomain.domain.replace(/_/g, ' ')} (${lowestDomain.score} pts)` : ''}

Instructions:
- Help understand concepts related to their gap areas
- Suggest specific resources when relevant
- Be encouraging but specific — no generic advice
- Keep responses to 3-5 sentences unless explaining a complex concept
- Match technical depth to learner's persona and scores`
}

export default function MentorPage() {
  const { data: authSession, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/learn/login'); return }
    if (status !== 'authenticated') return

    fetch('/api/learn/profile')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(data => {
        setProfile(data)
        const learner = data.learner
        const scores = data.domainScores ?? []
        const lowestDomain = scores.length > 0
          ? scores.reduce((a: any, b: any) => a.score < b.score ? a : b)
          : null

        setMessages([{
          role: 'assistant',
          content: scores.length === 0
            ? `Hey ${learner?.name?.split(' ')[0] || 'there'}! 🌿 I'm Sage, your learning mentor.\n\nYou haven't taken any assessments yet — start with any domain to get your baseline. I'll give you personalised guidance from there!`
            : `Hey ${learner?.name?.split(' ')[0] || 'there'}! 🌿 I'm Sage, your learning mentor.\n\nI've reviewed your scores.${lowestDomain ? ` Your ${lowestDomain.domain.replace(/_/g, ' ')} (${lowestDomain.score} pts) has the most room to grow.` : ''} What do you want to tackle today?`
        }])
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: "Hey! 🌿 I'm Sage. Ask me anything about AI, ML, or what to study next." }])
      })
  }, [status, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return

    const newMessages = [...messages, { role: 'user' as const, content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/learn/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          system: buildSageSystem(profile?.learner, profile?.domainScores ?? []),
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      const content = data.content?.[0]?.text ?? data.message ?? 'I had trouble responding. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px-70px)]">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.07] flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/30 flex items-center justify-center text-[14px]">🌿</div>
        <div>
          <div className="text-[13px] font-bold">Sage</div>
          <div className="text-[10px] text-[#A78BFA]">● Your learning mentor</div>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-white/[0.04] flex-shrink-0">
        <div className="text-[9px] text-white/30 mb-2">Suggested:</div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)}
              className="px-2.5 py-1 bg-[#1c1c26] border border-white/[0.07] rounded-full text-[11px] text-white/50 hover:text-white/80 hover:border-[#A78BFA]/30 transition-all">
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${m.role === 'user' ? 'text-[#4F8EF7]' : 'text-[#A78BFA]'}`}>
              {m.role === 'user' ? 'You' : 'Sage'}
            </div>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-[12px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 text-white/80 rounded-br-sm'
                : 'bg-[#1c1c26] border border-[#A78BFA]/15 text-white/80 rounded-bl-sm'
            }`}>
              {m.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col items-start">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#A78BFA] mb-1">Sage</div>
            <div className="bg-[#1c1c26] border border-[#A78BFA]/15 px-3.5 py-2.5 rounded-xl rounded-bl-sm flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]"
                  style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-white/[0.07] flex gap-2 items-center flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask Sage anything…"
          className="flex-1 bg-[#1c1c26] border border-white/[0.08] rounded-full px-4 py-2 text-[12px] text-white/70 outline-none focus:border-[#A78BFA]/40 transition-colors"
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-full bg-[#4F8EF7] disabled:opacity-30 flex items-center justify-center text-[13px] flex-shrink-0 transition-opacity">
          ↑
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}
