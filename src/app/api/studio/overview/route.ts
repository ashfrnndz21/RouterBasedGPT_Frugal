// ─────────────────────────────────────────────
//  src/app/api/studio/overview/route.ts
//  Admin dashboard stats
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

export async function GET(req: NextRequest) {
  const db = getDB()
  try {
    const totalLearners = (db.prepare('SELECT COUNT(*) as c FROM learners').get() as any).c
    const activeLearners = (db.prepare(
      "SELECT COUNT(*) as c FROM learners WHERE last_active > datetime('now', '-7 days')"
    ).get() as any).c

    const avgScore = (db.prepare(
      'SELECT AVG(score) as avg FROM domain_scores'
    ).get() as any)?.avg ?? 0

    const openAppeals = 0 // Extend when appeals table added

    const recentSessions = db.prepare(`
      SELECT s.*, l.name as learner_name, l.email
      FROM assessment_sessions s
      JOIN learners l ON s.learner_id = l.id
      WHERE s.status = 'completed'
      ORDER BY s.completed_at DESC
      LIMIT 10
    `).all()

    const domainStats = db.prepare(`
      SELECT domain,
        AVG(score) as avg_score,
        COUNT(*) as count,
        SUM(CASE WHEN score >= 201 THEN 1 ELSE 0 END) as at_benchmark,
        SUM(CASE WHEN score < 101 THEN 1 ELSE 0 END) as spark_count,
        SUM(CASE WHEN score >= 101 AND score < 201 THEN 1 ELSE 0 END) as build_count,
        SUM(CASE WHEN score >= 201 AND score < 300 THEN 1 ELSE 0 END) as lead_count,
        SUM(CASE WHEN score = 300 THEN 1 ELSE 0 END) as apex_count
      FROM domain_scores
      GROUP BY domain
    `).all()

    // Activity trend — daily assessment completions for last 30 days
    const activityTrend = db.prepare(`
      SELECT date(completed_at) as day, COUNT(*) as count
      FROM assessment_sessions
      WHERE status = 'completed' AND completed_at > datetime('now', '-30 days')
      GROUP BY date(completed_at)
      ORDER BY day ASC
    `).all()

    return NextResponse.json({
      stats: {
        totalLearners,
        activeLearners,
        avgScore: Math.round(avgScore),
        openAppeals,
      },
      recentSessions,
      domainStats,
      activityTrend,
    })
  } finally {
    db.close()
  }
}
