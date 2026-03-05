// src/app/api/studio/taxonomy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const db = getDB()
  try {
    if (type === 'all') {
      return NextResponse.json({
        domains: db.prepare('SELECT * FROM taxonomy_domains ORDER BY sort_order').all(),
        subdomains: db.prepare('SELECT * FROM taxonomy_subdomains ORDER BY sort_order').all(),
        skills: db.prepare('SELECT * FROM taxonomy_skills ORDER BY sort_order').all(),
      })
    }
    const id = req.nextUrl.searchParams.get('id')
    if (type === 'domain') return NextResponse.json(db.prepare('SELECT * FROM taxonomy_domains WHERE id = ?').get(id))
    if (type === 'subdomain') return NextResponse.json(db.prepare('SELECT * FROM taxonomy_subdomains WHERE id = ?').get(id))
    if (type === 'skill') return NextResponse.json(db.prepare('SELECT * FROM taxonomy_skills WHERE id = ?').get(id))
    return NextResponse.json({ error: 'type required' }, { status: 400 })
  } finally { db.close() }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, name, description } = body
  const db = getDB()
  try {
    if (type === 'subdomain') {
      const id = `sub_${randomUUID().slice(0, 8)}`
      db.prepare('INSERT INTO taxonomy_subdomains (id, domain_id, name, description) VALUES (?, ?, ?, ?)').run(id, body.domain_id, name, description ?? '')
      return NextResponse.json({ id })
    }
    if (type === 'skill') {
      const id = `skill_${randomUUID().slice(0, 8)}`
      db.prepare('INSERT INTO taxonomy_skills (id, subdomain_id, name, description) VALUES (?, ?, ?, ?)').run(id, body.subdomain_id, name, description ?? '')
      return NextResponse.json({ id })
    }
    return NextResponse.json({ error: 'unsupported type' }, { status: 400 })
  } finally { db.close() }
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { type, id, name, description, emoji, color, benchmark, weight } = body
  const db = getDB()
  try {
    if (type === 'domain') {
      db.prepare(`UPDATE taxonomy_domains SET name=COALESCE(?,name), description=COALESCE(?,description), emoji=COALESCE(?,emoji), color=COALESCE(?,color), benchmark=COALESCE(?,benchmark), weight=COALESCE(?,weight) WHERE id=?`).run(name, description, emoji, color, benchmark ? +benchmark : null, weight ? +weight : null, id)
    } else if (type === 'subdomain') {
      db.prepare('UPDATE taxonomy_subdomains SET name=COALESCE(?,name), description=COALESCE(?,description) WHERE id=?').run(name, description, id)
    } else if (type === 'skill') {
      db.prepare('UPDATE taxonomy_skills SET name=COALESCE(?,name), description=COALESCE(?,description) WHERE id=?').run(name, description, id)
    }
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}

export async function DELETE(req: NextRequest) {
  const { type, id } = await req.json()
  const db = getDB()
  try {
    if (type === 'subdomain') db.prepare('DELETE FROM taxonomy_subdomains WHERE id = ?').run(id)
    else if (type === 'skill') db.prepare('DELETE FROM taxonomy_skills WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
