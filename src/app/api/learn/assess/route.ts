// src/app/api/learn/assess/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { catDecision, initCATState, calculateDelta } from '@/lib/assessment/catEngine'
import { getByDomain, getById } from '@/lib/assessment/questionBank'
import { scoreToTier } from '@/lib/types/learning'
import type { CATState } from '@/lib/types/learning'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

// In-memory CAT state store (session-scoped)
// In production, migrate this to Redis or DB
const catStateStore = new Map<string, CATState>()

// ── POST: Start session or submit answer ──────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getDB()

  try {
    // ── Action: START new session ──────────────
    if (body.action === 'start') {
      const session = await getServerSession(authOptions)
      const learnerId = (session?.user as any)?.learnerId
      if (!learnerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

      const { domain, mode } = body

      // Get existing score for this domain
      const existing = db.prepare(
        'SELECT score FROM domain_scores WHERE learner_id = ? AND domain = ?'
      ).get(learnerId, domain) as { score: number } | undefined

      // Create session
      const sessionId = randomUUID()
      db.prepare(`
        INSERT INTO assessment_sessions (id, learner_id, domain, mode, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(sessionId, learnerId, domain, mode || 'typed')

      // Init CAT state
      const state = initCATState(learnerId, domain, existing?.score)
      catStateStore.set(sessionId, state)

      // Get first question
      const questions = getByDomain(domain)
      const decision = catDecision(state, questions)

      if (!decision.nextQuestion) {
        return NextResponse.json({ error: 'No questions available for this domain' }, { status: 500 })
      }

      // Don't send correct answer or rubric scoring to client
      const safeQuestion = sanitiseQuestion(decision.nextQuestion)

      return NextResponse.json({
        sessionId,
        question: safeQuestion,
        progress: {
          asked: 0,
          currentScore: state.currentScore,
          domain,
        },
      })
    }

    // ── Action: SUBMIT answer ──────────────────
    if (body.action === 'submit') {
      const { sessionId, questionId, answer, timeTakenMs } = body as SubmitAnswerPayload & { action: string }

      if (!sessionId || !questionId) {
        return NextResponse.json({ error: 'sessionId and questionId required' }, { status: 400 })
      }

      const session = db.prepare('SELECT * FROM assessment_sessions WHERE id = ?').get(sessionId) as any
      if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })
      if (session.status !== 'active') return NextResponse.json({ error: 'session not active' }, { status: 400 })

      const state = catStateStore.get(sessionId)
      if (!state) return NextResponse.json({ error: 'CAT state not found — session may have expired' }, { status: 404 })

      const question = getById(questionId)
      if (!question) return NextResponse.json({ error: 'question not found' }, { status: 404 })

      // ── Grade the answer ───────────────────
      const isSkip = answer === '__skip__'
      let correct = false
      let explanation = question.explanation

      if (!isSkip) {
        switch (question.type) {
          case 'mcq': {
            const correctOpt = question.options?.find(o => o.correct)
            correct = answer.toUpperCase() === correctOpt?.letter.toUpperCase()
            break
          }
          case 'truefalse': {
            const expected = question.statement === true ? 'true' : 'false'
            correct = answer.toLowerCase() === expected
            break
          }
          case 'ordering': {
            // Simple: check if order matches exactly
            try {
              const submitted = JSON.parse(answer)
              correct = JSON.stringify(submitted) === JSON.stringify(question.items)
            } catch {
              correct = false
            }
            break
          }
          case 'matching': {
            // Pairs submitted as JSON array of { left, right }
            try {
              const submitted = JSON.parse(answer) as Array<{ left: string; right: string }>
              correct = question.pairs?.every(pair =>
                submitted.some(s => s.left === pair.left && s.right === pair.right)
              ) ?? false
            } catch {
              correct = false
            }
            break
          }
          case 'voice':
          case 'written': {
            // Grading done by rubricGrader — result passed in body
            correct = (body.rubricCorrect as boolean) ?? false
            break
          }
        }
      }

      const delta = isSkip
        ? -2
        : calculateDelta(correct, question.difficulty)

      // Record event
      const eventId = randomUUID()
      db.prepare(`
        INSERT INTO assessment_events
          (id, session_id, learner_id, domain, question_id, question_text, answer, correct, score_delta, difficulty, time_taken_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(eventId, sessionId, session.learner_id, session.domain, questionId, question.text, answer, correct ? 1 : 0, delta, question.difficulty, timeTakenMs || 0)

      // Build event for CAT engine
      const event = {
        id: eventId,
        sessionId,
        learnerId: session.learner_id,
        domain: session.domain,
        questionId,
        question,
        answer,
        correct,
        scoreDelta: delta,
        difficulty: question.difficulty,
        createdAt: new Date().toISOString(),
      }

      // Get all questions for domain
      const allQuestions = getByDomain(session.domain)
      const decision = catDecision(state, allQuestions, event)

      // ── If assessment complete ─────────────
      if (decision.shouldStop || !decision.nextQuestion) {
        const finalScore = Math.max(0, Math.min(300, decision.finalScore))
        const finalTier = scoreToTier(finalScore)

        // Close session
        db.prepare(`
          UPDATE assessment_sessions
          SET status = 'completed', final_score = ?, final_tier = ?, completed_at = datetime('now')
          WHERE id = ?
        `).run(finalScore, finalTier, sessionId)

        // Upsert domain score
        db.prepare(`
          INSERT INTO domain_scores (learner_id, domain, score, tier)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(learner_id, domain) DO UPDATE SET
            score = excluded.score,
            tier = excluded.tier,
            assessed_at = datetime('now')
        `).run(session.learner_id, session.domain, finalScore, finalTier)

        // Update streak — increment if last_active was yesterday, else reset to 1
        db.prepare(`
          UPDATE learners SET
            streak = CASE
              WHEN date(last_active) = date('now', '-1 day') THEN streak + 1
              WHEN date(last_active) = date('now') THEN streak
              ELSE 1
            END,
            last_active = datetime('now')
          WHERE id = ?
        `).run(session.learner_id)

        // Cleanup state
        catStateStore.delete(sessionId)

        return NextResponse.json({
          complete: true,
          correct,
          delta,
          explanation,
          result: {
            sessionId,
            finalScore,
            finalTier,
            domain: session.domain,
            totalQuestions: state.questionsAsked.length + 1,
          },
        })
      }

      // ── Next question ──────────────────────
      const safeQuestion = sanitiseQuestion(decision.nextQuestion)

      return NextResponse.json({
        complete: false,
        correct,
        delta,
        explanation,
        question: safeQuestion,
        progress: {
          asked: state.questionsAsked.length,
          currentScore: state.currentScore,
        },
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } finally {
    db.close()
  }
}

// ── GET: session status ────────────────────────
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const db = getDB()
  try {
    const session = db.prepare('SELECT * FROM assessment_sessions WHERE id = ?').get(sessionId)
    if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const events = db.prepare(
      'SELECT * FROM assessment_events WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId)

    return NextResponse.json({ session, events })
  } finally {
    db.close()
  }
}

// ── Strip answers from question before sending to client ──
function sanitiseQuestion(q: ReturnType<typeof getById>) {
  if (!q) return null
  const safe = { ...q }
  // Remove correct answer indicators
  if (safe.options) {
    safe.options = safe.options.map(({ letter, text }) => ({ letter, text })) as any
  }
  delete (safe as any).correctAnswer
  // Keep rubric structure but not scoring (needed by client for voice UI)
  return safe
}
