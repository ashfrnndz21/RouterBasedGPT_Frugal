// src/app/api/studio/learners/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || ''
  const persona = req.nextUrl.searchParams.get('persona') || ''
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0')

  const db = getDB()
  try {
    let query = `
      SELECT l.*,
        COUNT(DISTINCT ds.domain) as domains_assessed,
        AVG(ds.score) as avg_score,
        COUNT(DISTINCT CASE WHEN mp.status = 'completed' THEN mp.module_id END) as modules_completed
      FROM learners l
      LEFT JOIN domain_scores ds ON l.id = ds.learner_id
      LEFT JOIN module_progress mp ON l.id = mp.learner_id
      WHERE 1=1
    `
    const params: any[] = []

    if (search) {
      query += ' AND (l.name LIKE ? OR l.email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    if (persona) {
      query += ' AND l.persona_id = ?'
      params.push(persona)
    }

    query += ' GROUP BY l.id ORDER BY l.last_active DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const learners = db.prepare(query).all(...params)

    // Enrich with domain scores
    const enriched = learners.map((l: any) => {
      const scores = db.prepare(
        'SELECT domain, score, tier FROM domain_scores WHERE learner_id = ? ORDER BY score DESC'
      ).all(l.id)
      return { ...l, domainScores: scores }
    })

    const total = (db.prepare('SELECT COUNT(*) as c FROM learners').get() as any).c

    return NextResponse.json({ learners: enriched, total })
  } finally { db.close() }
}
