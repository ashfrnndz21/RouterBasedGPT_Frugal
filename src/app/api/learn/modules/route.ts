// src/app/api/learn/modules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { recommendModules, MODULE_CATALOGUE } from '@/lib/content/lmsAggregator'
import type { DomainScore } from '@/lib/types/learning'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

async function getLearnerId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.learnerId ?? null
}

export async function GET(req: NextRequest) {
  const learnerId = await getLearnerId()
  if (!learnerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const domain = req.nextUrl.searchParams.get('domain')
  const db = getDB()
  try {
    const domainScores = db.prepare('SELECT * FROM domain_scores WHERE learner_id = ?').all(learnerId) as DomainScore[]
    const completedProgress = db.prepare('SELECT module_id FROM module_progress WHERE learner_id = ? AND status = "completed"').all(learnerId) as Array<{ module_id: string }>
    const completedIds = completedProgress.map(p => p.module_id)

    const modules = domain
      ? MODULE_CATALOGUE.filter(m => m.domain === domain && !completedIds.includes(m.id)).map(m => ({ module: m, score: 0.8, reason: 'In your selected domain' }))
      : recommendModules(domainScores, completedIds, 12)

    const progressMap = new Map(
      (db.prepare('SELECT * FROM module_progress WHERE learner_id = ?').all(learnerId) as any[]).map(p => [p.module_id, p])
    )

    const enriched = modules.map(({ module, score, reason }: any) => ({
      ...module,
      recommendationScore: score,
      reason,
      progress: progressMap.get(module.id) || null,
    }))

    return NextResponse.json({ modules: enriched })
  } finally { db.close() }
}

export async function PATCH(req: NextRequest) {
  const learnerId = await getLearnerId()
  if (!learnerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { moduleId, pct, status } = await req.json()
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 })

  const db = getDB()
  try {
    const now = new Date().toISOString()
    const isComplete = status === 'completed' || pct >= 100
    db.prepare(`
      INSERT INTO module_progress (learner_id, module_id, status, pct_complete, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(learner_id, module_id) DO UPDATE SET
        pct_complete = excluded.pct_complete,
        status = excluded.status,
        completed_at = CASE WHEN excluded.status = 'completed' THEN excluded.completed_at ELSE module_progress.completed_at END
    `).run(learnerId, moduleId, isComplete ? 'completed' : pct > 0 ? 'in_progress' : 'not_started', Math.min(100, Math.max(0, pct)), now, isComplete ? now : null)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
