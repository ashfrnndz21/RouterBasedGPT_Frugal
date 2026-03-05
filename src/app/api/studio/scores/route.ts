// src/app/api/studio/scores/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

// GET — list assessment sessions with filtering
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') // completed | in_progress | all
  const domain = req.nextUrl.searchParams.get('domain')
  const learnerId = req.nextUrl.searchParams.get('learnerId')
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = 25
  const offset = (page - 1) * limit

  const db = getDB()
  try {
    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status && status !== 'all') { where += ' AND s.status = ?'; params.push(status) }
    if (domain) { where += ' AND s.domain = ?'; params.push(domain) }
    if (learnerId) { where += ' AND s.learner_id = ?'; params.push(learnerId) }

    const sessions = db.prepare(`
      SELECT
        s.*,
        l.name as learner_name,
        l.email as learner_email,
        (SELECT COUNT(*) FROM assessment_events e WHERE e.session_id = s.id) as question_count,
        (SELECT COUNT(*) FROM assessment_events e WHERE e.session_id = s.id AND e.correct = 1) as correct_count
      FROM assessment_sessions s
      JOIN learners l ON l.id = s.learner_id
      ${where}
      ORDER BY s.started_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset)

    const total = (db.prepare(`
      SELECT COUNT(*) as c FROM assessment_sessions s ${where}
    `).get(...params) as any).c

    return NextResponse.json({ sessions, total, page, pages: Math.ceil(total / limit) })
  } finally { db.close() }
}

// GET /api/studio/scores?sessionId=xxx — single session detail
// Use query param action=detail
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  const db = getDB()
  try {
    // Get session detail with all events
    if (action === 'detail') {
      const { sessionId } = body
      const session = db.prepare('SELECT * FROM assessment_sessions WHERE id = ?').get(sessionId)
      if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

      const events = db.prepare(`
        SELECT e.*, q.text as question_text_full, q.explanation
        FROM assessment_events e
        LEFT JOIN questions q ON q.id = e.question_id
        WHERE e.session_id = ?
        ORDER BY e.created_at ASC
      `).all(sessionId)

      const learner = db.prepare('SELECT id, name, email FROM learners WHERE id = ?').get((session as any).learner_id)

      return NextResponse.json({ session, events, learner })
    }

    // Override final score (admin can adjust score)
    if (action === 'override') {
      const { sessionId, newScore, reason } = body
      if (!sessionId || newScore === undefined) {
        return NextResponse.json({ error: 'sessionId and newScore required' }, { status: 400 })
      }

      const session = db.prepare('SELECT * FROM assessment_sessions WHERE id = ?').get(sessionId) as any
      if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

      const clampedScore = Math.max(0, Math.min(300, Math.round(newScore)))

      // Determine tier
      const tier = clampedScore >= 300 ? 'apex' : clampedScore >= 200 ? 'lead' : clampedScore >= 100 ? 'build' : 'spark'

      db.prepare(`
        UPDATE assessment_sessions
        SET final_score = ?, final_tier = ?
        WHERE id = ?
      `).run(clampedScore, tier, sessionId)

      // Also update domain_scores
      db.prepare(`
        INSERT INTO domain_scores (learner_id, domain, score, tier)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(learner_id, domain) DO UPDATE SET
          score = excluded.score,
          tier = excluded.tier,
          assessed_at = datetime('now')
      `).run(session.learner_id, session.domain, clampedScore, tier)

      return NextResponse.json({ ok: true, newScore: clampedScore, tier })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } finally { db.close() }
}
