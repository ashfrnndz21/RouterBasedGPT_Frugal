// src/app/api/learn/mentor/route.ts — Lightweight chat endpoint for Sage mentor
import { NextRequest, NextResponse } from 'next/server'
import { getAvailableChatModelProviders } from '@/lib/providers'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { messages, system } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ message: 'messages array required' }, { status: 400 })
    }

    // Get first available chat model
    const providers = await getAvailableChatModelProviders()
    const firstProvider = Object.keys(providers).find(k => Object.keys(providers[k]).length > 0)
    if (!firstProvider) {
      return NextResponse.json({ message: 'No chat model available' }, { status: 503 })
    }
    const modelKey = Object.keys(providers[firstProvider])[0]
    const llm = providers[firstProvider][modelKey].model

    // Build langchain messages
    const lcMessages = []
    if (system) {
      lcMessages.push(new SystemMessage(system))
    }
    for (const m of messages) {
      if (m.role === 'user') lcMessages.push(new HumanMessage(m.content))
      else if (m.role === 'assistant') lcMessages.push(new AIMessage(m.content))
    }

    const response = await llm.invoke(lcMessages)
    const text = typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        ? response.content.map((c: any) => c.text ?? '').join('')
        : String(response.content)

    return NextResponse.json({ content: [{ text }] })
  } catch (err: any) {
    console.error('[Mentor API] Error:', err?.message ?? err)
    return NextResponse.json(
      { message: err?.message ?? 'Mentor chat failed' },
      { status: 500 },
    )
  }
}
