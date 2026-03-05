// src/app/api/learn/profile/route.ts

import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

async function getLearnerId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.learnerId ?? null
}

// GET /api/learn/profile — session-based
export async function GET() {
  const learnerId = await getLearnerId()
  if (!learnerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = getDB()
  try {
    const learner = db.prepare('SELECT * FROM learners WHERE id = ?').get(learnerId)
    if (!learner) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const domainScores = db.prepare(
      'SELECT * FROM domain_scores WHERE learner_id = ? ORDER BY assessed_at DESC'
    ).all(learnerId)

    const moduleProgress = db.prepare(`
      SELECT mp.*, m.title, m.domain, m.type, m.source, m.duration_m, m.tier, m.url
      FROM module_progress mp
      JOIN modules m ON mp.module_id = m.id
      WHERE mp.learner_id = ?
    `).all(learnerId)

    return NextResponse.json({ learner, domainScores, moduleProgress })
  } finally {
    db.close()
  }
}

// POST /api/learn/profile — upsert (called on first login/register)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, name, personaId } = body
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const db = getDB()
  try {
    const existing = db.prepare('SELECT * FROM learners WHERE email = ?').get(email)
    if (existing) {
      if (personaId) {
        db.prepare('UPDATE learners SET persona_id = ?, onboarding = 1, last_active = datetime("now") WHERE email = ?').run(personaId, email)
      } else {
        db.prepare('UPDATE learners SET last_active = datetime("now") WHERE email = ?').run(email)
      }
      return NextResponse.json({ learner: db.prepare('SELECT * FROM learners WHERE email = ?').get(email), created: false })
    }

    const id = randomUUID()
    db.prepare('INSERT INTO learners (id, name, email, persona_id, onboarding) VALUES (?, ?, ?, ?, ?)').run(
      id, name || email.split('@')[0], email, personaId || null, personaId ? 1 : 0
    )
    return NextResponse.json({ learner: db.prepare('SELECT * FROM learners WHERE id = ?').get(id), created: true })
  } finally {
    db.close()
  }
}

// PATCH /api/learn/profile — update persona, lang
export async function PATCH(req: NextRequest) {
  const learnerId = await getLearnerId()
  if (!learnerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { personaId, lang } = body
  const db = getDB()
  try {
    if (personaId) db.prepare('UPDATE learners SET persona_id = ?, onboarding = 1 WHERE id = ?').run(personaId, learnerId)
    if (lang) db.prepare('UPDATE learners SET lang = ? WHERE id = ?').run(lang, learnerId)
    return NextResponse.json({ learner: db.prepare('SELECT * FROM learners WHERE id = ?').get(learnerId) })
  } finally {
    db.close()
  }
}

