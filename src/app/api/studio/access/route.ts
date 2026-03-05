// src/app/api/studio/access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

export async function GET() {
  const db = getDB()
  try {
    return NextResponse.json({ admins: db.prepare('SELECT id, email, name, role, created_at FROM admin_users ORDER BY created_at DESC').all() })
  } finally { db.close() }
}

export async function POST(req: NextRequest) {
  const { email, name, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const db = getDB()
  try {
    const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email)
    if (existing) return NextResponse.json({ error: 'Admin already exists' }, { status: 409 })
    const id = randomUUID()
    db.prepare('INSERT INTO admin_users (id, email, name, role) VALUES (?, ?, ?, ?)').run(id, email, name ?? '', role ?? 'read_only')
    return NextResponse.json({ id })
  } finally { db.close() }
}

export async function PUT(req: NextRequest) {
  const { id, role } = await req.json()
  const db = getDB()
  try {
    db.prepare('UPDATE admin_users SET role = ? WHERE id = ?').run(role, id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db = getDB()
  try {
    db.prepare('DELETE FROM admin_users WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
