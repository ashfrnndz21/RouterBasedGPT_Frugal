// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { randomUUID } from 'crypto'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const db = getDB()
  try {
    const existing = db.prepare('SELECT id FROM learners WHERE email = ?').get(email)
    if (existing) {
      return NextResponse.json({ error: 'Account already exists with this email' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const id = randomUUID()

    db.prepare(`
      INSERT INTO learners (id, name, email, password_hash, auth_provider, onboarding)
      VALUES (?, ?, ?, ?, 'credentials', 0)
    `).run(id, name?.trim() || email.split('@')[0], email.toLowerCase(), hash)

    return NextResponse.json({ ok: true, learnerId: id })
  } finally {
    db.close()
  }
}
