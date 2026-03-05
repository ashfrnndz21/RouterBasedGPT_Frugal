'use client'
// src/app/learn/assess/[domain]/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import type { Question } from '@/lib/types/learning'

const VoiceAssessor = dynamic(() => import('@/components/Learn/VoiceAssessor'), { ssr: false })
const DragOrder = dynamic(() => import('@/components/Learn/DragOrder'), { ssr: false })
const MatchPairs = dynamic(() => import('@/components/Learn/MatchPairs'), { ssr: false })

interface SessionState {
  sessionId: string
  question: Question
  progress: { asked: number; currentScore: number }
}

export default function AssessPage() {
  const { domain } = useParams<{ domain: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: authSession, status } = useSession()
  const mode = searchParams.get('mode') || 'typed'

  const [session, setSession] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string; delta: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Start session — session-based, no learnerId in body
  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/learn/login'); return }
    if (status !== 'authenticated') return
    fetch('/api/learn/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', domain, mode }),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setSession(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [domain, mode, status, router])

  const submitAnswer = useCallback(async (answer: string, rubricCorrect?: boolean) => {
    if (!session || submitting) return
    setSubmitting(true)

    const body: any = {
      action: 'submit',
      sessionId: session.sessionId,
      questionId: session.question.id,
      answer,
      timeTakenMs: 0,
    }
    if (rubricCorrect !== undefined) body.rubricCorrect = rubricCorrect

    const res = await fetch('/api/learn/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { setSubmitting(false); return }
    const data = await res.json()

    setFeedback({ correct: data.correct, explanation: data.explanation, delta: data.delta })
    setSubmitted(true)
    setSubmitting(false)

    if (data.complete) {
      // Navigate to results after delay
      setTimeout(() => {
        router.push(`/learn/results/${session.sessionId}`)
      }, 2500)
    } else {
      // Next question after delay
      setTimeout(() => {
        setSession(prev => prev ? { ...prev, question: data.question, progress: data.progress } : prev)
        setSelected(null)
        setSubmitted(false)
        setFeedback(null)
      }, 2000)
    }
  }, [session, submitting, router])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-white/30 text-sm">Starting assessment…</div>
    </div>
  )

  if (!session) return (
    <div className="px-5 py-8 text-center text-white/40 text-sm">Failed to start session</div>
  )

  const q = session.question
  const pct = Math.min(100, (session.progress.asked / 15) * 100)

  return (
    <div>
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div className="h-full transition-all duration-500" style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #4F8EF7, #A78BFA)'
        }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <span className="text-[11px] text-white/40 capitalize">{domain.replace('_', ' ')}</span>
        <span className="text-[11px] font-mono text-white/50">Q {session.progress.asked + 1}</span>
        <span className="text-[11px] font-mono text-white/40">Score: {session.progress.currentScore}</span>
      </div>

      <div className="px-4 py-5">
        {/* Difficulty badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
            q.difficulty === 'easy' ? 'bg-[#4F8EF7]/10 text-[#4F8EF7]' :
            q.difficulty === 'medium' ? 'bg-[#F0A500]/10 text-[#F0A500]' :
            'bg-[#EF4444]/10 text-[#EF4444]'
          }`}>
            {q.difficulty.toUpperCase()}
          </span>
          <span className="text-[10px] text-white/30 font-mono">{q.type.toUpperCase()}</span>
        </div>

        {/* Question text */}
        <p className="text-[14px] text-white leading-relaxed mb-5">{q.text}</p>

        {/* ── MCQ Options ── */}
        {q.type === 'mcq' && q.options && (
          <div className="flex flex-col gap-2.5">
            {q.options.map(opt => {
              const isSelected = selected === opt.letter
              const isCorrect = submitted && feedback?.correct && isSelected
              const isWrong = submitted && !feedback?.correct && isSelected
              return (
                <button
                  key={opt.letter}
                  disabled={submitted}
                  onClick={() => { if (!submitted) { setSelected(opt.letter); submitAnswer(opt.letter) } }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isCorrect ? 'border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0]' :
                    isWrong   ? 'border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]' :
                    isSelected ? 'border-[#4F8EF7] bg-[#4F8EF7]/10' :
                    'border-white/[0.07] bg-[#1c1c26] hover:border-white/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 ${
                    isCorrect ? 'bg-[#00E5A0]/20' : isWrong ? 'bg-[#EF4444]/20' : 'bg-white/[0.06]'
                  }`}>{opt.letter}</span>
                  <span className="text-[12px] text-white/90">{opt.text}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── True/False ── */}
        {q.type === 'truefalse' && (
          <div className="flex gap-3">
            {['true', 'false'].map(val => (
              <button key={val}
                disabled={submitted}
                onClick={() => submitAnswer(val)}
                className={`flex-1 py-4 rounded-xl border text-[14px] font-bold capitalize transition-all ${
                  selected === val ? 'border-[#4F8EF7] bg-[#4F8EF7]/10 text-[#4F8EF7]' :
                  'border-white/[0.07] bg-[#1c1c26] hover:border-white/20 text-white/70'
                }`}
              >{val}</button>
            ))}
          </div>
        )}

        {/* ── Voice Question ── */}
        {q.type === 'voice' && (
          <div>
            {mode === 'voice' ? (
              <VoiceAssessor
                questionText={q.text}
                onTranscriptReady={(transcript) => {
                  // Grade via rubric then submit
                  setSubmitting(true)
                  fetch('/api/learn/assess/grade-rubric', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: q.id, answer: transcript }),
                  })
                    .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
                    .then(rubricResult => submitAnswer(transcript, rubricResult.correct))
                    .catch(() => submitAnswer(transcript, false))
                }}
                onCancel={() => {}}
              />
            ) : (
              <div>
                <textarea
                  className="w-full bg-[#13131a] border border-white/[0.08] rounded-xl p-3 text-[12px] text-white/80 resize-none outline-none focus:border-[#4F8EF7] transition-colors"
                  rows={4}
                  placeholder="Type your answer here…"
                  onChange={e => setSelected(e.target.value)}
                />
                <button
                  disabled={!selected || submitting}
                  onClick={() => selected && submitAnswer(selected)}
                  className="mt-3 w-full bg-[#4F8EF7] disabled:opacity-40 text-white font-bold text-[13px] py-3 rounded-xl transition-opacity"
                >
                  {submitting ? 'Grading…' : 'Submit Answer'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Written Question ── */}
        {q.type === 'written' && (
          <div>
            <textarea
              className="w-full bg-[#13131a] border border-white/[0.08] rounded-xl p-3 text-[12px] text-white/80 resize-none outline-none focus:border-[#4F8EF7] transition-colors"
              rows={5}
              placeholder="Write your answer here…"
              onChange={e => setSelected(e.target.value)}
            />
            <button
              disabled={!selected || submitting}
              onClick={async () => {
                if (!selected) return
                setSubmitting(true)
                const rubricResult = await fetch('/api/learn/assess/grade-rubric', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ questionId: q.id, answer: selected }),
                }).then(r => r.json()).catch(() => ({ correct: false }))
                submitAnswer(selected, rubricResult.correct)
              }}
              className="mt-3 w-full bg-[#4F8EF7] disabled:opacity-40 text-white font-bold text-[13px] py-3 rounded-xl transition-opacity"
            >
              {submitting ? 'Grading…' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* ── Ordering (drag-and-drop) ── */}
        {q.type === 'ordering' && q.items && (
          <DragOrder
            items={q.items}
            onSubmit={(orderedItems) => submitAnswer(JSON.stringify(orderedItems))}
            disabled={submitted}
          />
        )}

        {/* ── Matching (pair connections) ── */}
        {q.type === 'matching' && q.pairs && (
          <MatchPairs
            pairs={q.pairs}
            onSubmit={(matches) => submitAnswer(JSON.stringify(matches))}
            disabled={submitted}
          />
        )}

        {/* Feedback panel */}
        {feedback && (
          <div className={`mt-4 p-3 rounded-xl border ${
            feedback.correct
              ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20'
              : 'bg-[#EF4444]/10 border-[#EF4444]/20'
          }`}>
            <div className={`text-[9px] font-bold font-mono uppercase tracking-widest mb-1 ${
              feedback.correct ? 'text-[#00E5A0]' : 'text-[#EF4444]'
            }`}>
              {feedback.correct ? `✓ Correct · +${feedback.delta} pts` : `✗ Incorrect · ${feedback.delta} pts`}
            </div>
            <div className="text-[11px] text-white/70 leading-relaxed">{feedback.explanation}</div>
          </div>
        )}

        {/* Skip */}
        {!submitted && (
          <button
            onClick={() => submitAnswer('__skip__')}
            className="mt-4 text-[11px] text-white/30 hover:text-white/60 transition-colors w-full text-center"
          >
            I don't know — skip
          </button>
        )}
      </div>
    </div>
  )
}
