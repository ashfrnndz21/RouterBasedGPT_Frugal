// src/app/api/studio/agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

export async function GET() {
  const db = getDB()
  try {
    const agents = db.prepare('SELECT * FROM agent_configs ORDER BY id').all()
    return NextResponse.json({ agents })
  } finally { db.close() }
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, name, displayRole, model, routingTier, maxTokens, systemPrompt, contextInjections, active } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getDB()
  try {
    db.prepare(`
      UPDATE agent_configs SET
        name = COALESCE(?, name),
        display_role = COALESCE(?, display_role),
        model = COALESCE(?, model),
        routing_tier = COALESCE(?, routing_tier),
        max_tokens = COALESCE(?, max_tokens),
        system_prompt = COALESCE(?, system_prompt),
        context_injections = COALESCE(?, context_injections),
        active = COALESCE(?, active),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, displayRole, model, routingTier, maxTokens,
           systemPrompt,
           contextInjections ? JSON.stringify(contextInjections) : null,
           active !== undefined ? (active ? 1 : 0) : null,
           id)

    const updated = db.prepare('SELECT * FROM agent_configs WHERE id = ?').get(id)
    return NextResponse.json({ agent: updated })
  } finally { db.close() }
}
