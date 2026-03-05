// src/app/api/studio/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'
import { QUESTION_BANK } from '@/lib/assessment/questionBank'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

// Sync in-memory question bank to DB on first GET
function syncQuestionBank(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM questions').get() as any).c
  if (count === 0) {
    const insert = db.prepare(`INSERT OR IGNORE INTO questions (id, domain, subdomain, skill, type, difficulty, weight, text, options, pairs, items, statement, rubric, explanation, tags, acceptance_rate, times_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const q of QUESTION_BANK) {
      insert.run(q.id, q.domain, q.subdomain ?? '', q.skill ?? '', q.type, q.difficulty, q.weight, q.text, q.options ? JSON.stringify(q.options) : null, q.pairs ? JSON.stringify(q.pairs) : null, q.items ? JSON.stringify(q.items) : null, q.statement !== undefined ? (q.statement ? 1 : 0) : null, q.rubric ? JSON.stringify(q.rubric) : null, q.explanation, JSON.stringify(q.tags ?? []), q.acceptanceRate ?? 0.5, q.timesUsed ?? 0)
    }
  }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  const type = req.nextUrl.searchParams.get('type')
  const difficulty = req.nextUrl.searchParams.get('difficulty')
  const search = req.nextUrl.searchParams.get('search')
  const db = getDB()
  try {
    syncQuestionBank(db)
    let q = 'SELECT * FROM questions WHERE active = 1'
    const params: any[] = []
    if (domain) { q += ' AND domain = ?'; params.push(domain) }
    if (type) { q += ' AND type = ?'; params.push(type) }
    if (difficulty) { q += ' AND difficulty = ?'; params.push(difficulty) }
    if (search) { q += ' AND (text LIKE ? OR id LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
    q += ' ORDER BY domain, difficulty LIMIT 200'
    const questions = db.prepare(q).all(...params)
    const total = (db.prepare('SELECT COUNT(*) as c FROM questions WHERE active = 1').get() as any).c
    return NextResponse.json({ questions, total })
  } finally { db.close() }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getDB()
  try {
    const id = `q_${randomUUID().slice(0, 10)}`
    db.prepare(`INSERT INTO questions (id, domain, subdomain, skill, type, difficulty, weight, text, options, pairs, items, statement, rubric, explanation, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, body.domain, body.subdomain ?? '', body.skill ?? '', body.type, body.difficulty, body.weight ?? 2, body.text, body.options ? JSON.stringify(body.options) : null, body.pairs ? JSON.stringify(body.pairs) : null, body.items ? JSON.stringify(body.items) : null, body.statement !== undefined ? (body.statement ? 1 : 0) : null, body.rubric ? JSON.stringify(body.rubric) : null, body.explanation ?? '', JSON.stringify(body.tags ?? []))
    return NextResponse.json({ id })
  } finally { db.close() }
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, domain, type, difficulty, weight, text, explanation, options, pairs, items, statement, rubric, tags } = body
  const db = getDB()
  try {
    db.prepare(`UPDATE questions SET domain=COALESCE(?,domain), type=COALESCE(?,type), difficulty=COALESCE(?,difficulty), weight=COALESCE(?,weight), text=COALESCE(?,text), explanation=COALESCE(?,explanation), options=COALESCE(?,options), pairs=COALESCE(?,pairs), items=COALESCE(?,items), statement=COALESCE(?,statement), rubric=COALESCE(?,rubric), tags=COALESCE(?,tags) WHERE id=?`).run(domain, type, difficulty, weight, text, explanation, options ? JSON.stringify(options) : null, pairs ? JSON.stringify(pairs) : null, items ? JSON.stringify(items) : null, statement !== undefined ? (statement ? 1 : 0) : null, rubric ? JSON.stringify(rubric) : null, tags ? JSON.stringify(tags) : null, id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
