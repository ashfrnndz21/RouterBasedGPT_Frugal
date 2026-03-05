// src/app/api/learn/streak/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

// Called after any learning activity to update streak
export async function POST(req: NextRequest) {
  const { learnerId, eventType } = await req.json()
  if (!learnerId) return NextResponse.json({ error: 'learnerId required' }, { status: 400 })

  const db = getDB()
  try {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // Record today's activity (ignore duplicate)
    db.prepare(`
      INSERT OR IGNORE INTO streak_events (learner_id, event_date, event_type)
      VALUES (?, ?, ?)
    `).run(learnerId, today, eventType ?? 'assessment')

    // Calculate current streak
    const events = db.prepare(`
      SELECT event_date FROM streak_events
      WHERE learner_id = ?
      ORDER BY event_date DESC
    `).all(learnerId) as Array<{ event_date: string }>

    let streak = 0
    let checkDate = new Date()

    for (const evt of events) {
      const evtDate = evt.event_date
      const expected = checkDate.toISOString().slice(0, 10)

      if (evtDate === expected) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (evtDate < expected) {
        break // gap in streak
      }
    }

    // Update learner streak
    db.prepare('UPDATE learners SET streak = ? WHERE id = ?').run(streak, learnerId)

    return NextResponse.json({ streak, today })
  } finally {
    db.close()
  }
}

export async function GET(req: NextRequest) {
  const learnerId = req.nextUrl.searchParams.get('learnerId')
  if (!learnerId) return NextResponse.json({ error: 'learnerId required' }, { status: 400 })

  const db = getDB()
  try {
    const learner = db.prepare('SELECT streak FROM learners WHERE id = ?').get(learnerId) as any
    const recentDays = db.prepare(`
      SELECT event_date FROM streak_events
      WHERE learner_id = ? AND event_date >= date('now', '-30 days')
      ORDER BY event_date DESC
    `).all(learnerId) as Array<{ event_date: string }>

    return NextResponse.json({
      streak: learner?.streak ?? 0,
      activeDays: recentDays.map(d => d.event_date),
    })
  } finally {
    db.close()
  }
}
