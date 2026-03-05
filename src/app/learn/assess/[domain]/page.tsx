'use client'
// src/app/learn/assess/[domain]/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Confetti } from '@/components/Learn/motion/Confetti'
import { CountUp } from '@/components/Learn/motion/CountUp'
import { ScalePress } from '@/components/Learn/motion/ScalePress'
import { StreakFlame } from '@/components/Learn/motion/StreakFlame'
import { SkeletonLine, SkeletonCard } from '@/components/Learn/motion/Skeleton'
import type { Question } from '@/lib/types/learning'

const VoiceAssessor = dynamic(() => import('@/components/Learn/VoiceAssessor'), { ssr: false })
const DragOrder = dynamic(() => import('@/components/Learn/DragOrder'), { ssr: false })
const MatchPairs = dynamic(() => import('@/components/Learn/MatchPairs'), { ssr: false })

interface SessionState {
  sessionId: string
  question: Question
  progress: { asked: number; currentScore: number }
}

const questionSlide = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
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
  const [showConfetti, setShowConfetti] = useState(false)
  const [streak, setStreak] = useState(0)
  const [questionKey, setQuestionKey] = useState(0)

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

    // Celebration on correct
    if (data.correct) {
      setShowConfetti(true)
      setStreak(s => s + 1)
      setTimeout(() => setShowConfetti(false), 2000)
    } else {
      setStreak(0)
    }

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
        setQuestionKey(k => k + 1)
      }, 2000)
    }
  }, [session, submitting, router])

  if (loading) return (
    <div className="px-4 py-8 space-y-4">
      <SkeletonLine width="40%" height={8} />
      <SkeletonCard height={60} />
      <div className="space-y-2.5">
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
      </div>
    </div>
  )

  if (!session) return (
    <div className="px-5 py-8 text-center text-white/40 text-sm">Failed to start session</div>
  )

  const q = session.question
  const pct = Math.min(100, (session.progress.asked / 15) * 100)

  return (
    <div>
      <Confetti trigger={showConfetti} />

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <motion.div
          className="h-full"
          style={{ background: 'linear-gradient(90deg, #4F8EF7, #A78BFA)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <span className="text-[11px] text-white/40 capitalize">{domain.replace('_', ' ')}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-white/50">Q {session.progress.asked + 1}</span>
          {streak >= 2 && <StreakFlame streak={streak} />}
        </div>
        <span className="text-[11px] font-mono text-white/40">
          Score: <CountUp target={session.progress.currentScore} duration={0.5} className="text-white/60" />
        </span>
      </div>

      {/* Question area with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey}
          variants={questionSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="px-4 py-5"
        >
          {/* Difficulty badge */}
          <motion.div
            className="flex items-center gap-2 mb-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
              q.difficulty === 'easy' ? 'bg-[#4F8EF7]/10 text-[#4F8EF7]' :
              q.difficulty === 'medium' ? 'bg-[#F0A500]/10 text-[#F0A500]' :
              'bg-[#EF4444]/10 text-[#EF4444]'
            }`}>
              {q.difficulty.toUpperCase()}
            </span>
            <span className="text-[10px] text-white/30 font-mono">{q.type.toUpperCase()}</span>
          </motion.div>

          {/* Question text */}
          <p className="text-[14px] text-white leading-relaxed mb-5">{q.text}</p>

          {/* ── MCQ Options ── */}
          {q.type === 'mcq' && q.options && (
            <div className="flex flex-col gap-2.5">
              {q.options.map((opt, i) => {
                const isSelected = selected === opt.letter
                const isCorrect = submitted && feedback?.correct && isSelected
                const isWrong = submitted && !feedback?.correct && isSelected
                return (
                  <ScalePress key={opt.letter}>
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.25 }}
                      disabled={submitted}
                      onClick={() => { if (!submitted) { setSelected(opt.letter); submitAnswer(opt.letter) } }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
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
                    </motion.button>
                  </ScalePress>
                )
              })}
            </div>
          )}

          {/* ── True/False ── */}
          {q.type === 'truefalse' && (
            <div className="flex gap-3">
              {['true', 'false'].map(val => (
                <ScalePress key={val} className="flex-1">
                  <button
                    disabled={submitted}
                    onClick={() => submitAnswer(val)}
                    className={`w-full py-4 rounded-xl border text-[14px] font-bold capitalize transition-all ${
                      selected === val ? 'border-[#4F8EF7] bg-[#4F8EF7]/10 text-[#4F8EF7]' :
                      'border-white/[0.07] bg-[#1c1c26] hover:border-white/20 text-white/70'
                    }`}
                  >{val}</button>
                </ScalePress>
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
                  <ScalePress>
                    <button
                      disabled={!selected || submitting}
                      onClick={() => selected && submitAnswer(selected)}
                      className="mt-3 w-full bg-[#4F8EF7] disabled:opacity-40 text-white font-bold text-[13px] py-3 rounded-xl transition-opacity"
                    >
                      {submitting ? 'Grading…' : 'Submit Answer'}
                    </button>
                  </ScalePress>
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
              <ScalePress>
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
              </ScalePress>
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
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={feedback.correct ? { opacity: 0, scale: 0.9 } : { opacity: 0, x: 0 }}
                animate={feedback.correct ? { opacity: 1, scale: 1 } : { opacity: 1, x: [0, -8, 8, -4, 4, 0] }}
                transition={feedback.correct
                  ? { type: 'spring', stiffness: 300, damping: 20 }
                  : { duration: 0.4 }
                }
                className={`mt-4 p-3 rounded-xl border ${
                  feedback.correct
                    ? 'bg-[#00E5A0]/10 border-[#00E5A0]/20'
                    : 'bg-[#EF4444]/10 border-[#EF4444]/20'
                }`}
              >
                <div className={`flex items-center gap-2 text-[9px] font-bold font-mono uppercase tracking-widest mb-1 ${
                  feedback.correct ? 'text-[#00E5A0]' : 'text-[#EF4444]'
                }`}>
                  {feedback.correct ? '✓ Correct' : '✗ Incorrect'}
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={feedback.correct ? 'text-[#00E5A0]' : 'text-[#EF4444]'}
                  >
                    · {feedback.delta > 0 ? '+' : ''}{feedback.delta} pts
                  </motion.span>
                </div>
                <div className="text-[11px] text-white/70 leading-relaxed">{feedback.explanation}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip */}
          {!submitted && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => submitAnswer('__skip__')}
              className="mt-4 text-[11px] text-white/30 hover:text-white/60 transition-colors w-full text-center"
            >
              I don&apos;t know — skip
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
