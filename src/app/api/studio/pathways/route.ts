// src/app/api/studio/pathways/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

function ensureSchema(db: Database.Database) {
  // Add stages column if not present (stores stages as JSON)
  try {
    db.prepare("SELECT stages FROM pathways LIMIT 1").get()
  } catch {
    try { db.prepare("ALTER TABLE pathways ADD COLUMN stages TEXT DEFAULT '[]'").run() } catch { /* already exists */ }
  }
}

export async function GET() {
  const db = getDB()
  try {
    ensureSchema(db)
    return NextResponse.json({ pathways: db.prepare('SELECT * FROM pathways ORDER BY created_at DESC').all() })
  } finally { db.close() }
}

export async function POST(req: NextRequest) {
  const { name, description, target_persona, stages } = await req.json()
  const db = getDB()
  try {
    ensureSchema(db)
    const id = randomUUID()
    db.prepare('INSERT INTO pathways (id, name, description, target_persona) VALUES (?, ?, ?, ?)').run(id, name, description ?? '', target_persona ?? 'builder')
    const pathway = db.prepare('SELECT * FROM pathways WHERE id = ?').get(id)
    return NextResponse.json({ pathway: { ...(pathway as any), stages: [] } })
  } finally { db.close() }
}

export async function PUT(req: NextRequest) {
  const { id, name, description, target_persona, stages, active } = await req.json()
  const db = getDB()
  try {
    ensureSchema(db)
    db.prepare(`UPDATE pathways SET name=COALESCE(?,name), description=COALESCE(?,description), target_persona=COALESCE(?,target_persona), stages=?, active=COALESCE(?,active), published_at=CASE WHEN ? = 1 AND active = 0 THEN datetime('now') ELSE published_at END WHERE id=?`).run(name, description, target_persona, JSON.stringify(stages ?? []), active !== undefined ? (active ? 1 : 0) : null, active ? 1 : 0, id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db = getDB()
  try {
    db.prepare('DELETE FROM pathways WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
