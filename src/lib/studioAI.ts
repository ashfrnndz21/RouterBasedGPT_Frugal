// ─────────────────────────────────────────────
//  Frugal AI — Studio AI Helper
//  Thin LLM wrapper for Studio intelligence features
//  Reuses the same provider system as the main app
// ─────────────────────────────────────────────

import { getAvailableChatModelProviders } from '@/lib/providers'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

/**
 * Call an LLM with a system prompt and user prompt.
 * Uses the first available chat model provider.
 * Returns the text response or throws on failure.
 */
export async function studioLLM(
  system: string,
  userPrompt: string,
): Promise<string> {
  const providers = await getAvailableChatModelProviders()

  // Find first available provider with at least one model
  const providerKey = Object.keys(providers).find(
    k => Object.keys(providers[k]).length > 0,
  )

  if (!providerKey) {
    throw new Error('NO_MODEL')
  }

  const modelKey = Object.keys(providers[providerKey])[0]
  const llm = providers[providerKey][modelKey].model

  const messages = [
    new SystemMessage(system),
    new HumanMessage(userPrompt),
  ]

  const response = await llm.invoke(messages)

  const text =
    typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        ? response.content.map((c: any) => c.text ?? '').join('')
        : String(response.content)

  return text
}

/**
 * Parse JSON from an LLM response, stripping markdown fences if present.
 */
export function parseJSON<T = any>(raw: string): T {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}
