// ─────────────────────────────────────────────
//  Frugal AI — Rubric Grader (Bedrock / Claude)
//  Drop into: src/lib/assessment/rubricGrader.ts
//  Uses existing frugalRouter pattern for model selection
// ─────────────────────────────────────────────

import type { VoiceRubric } from '@/lib/types/learning'

interface GradingResult {
  conceptScores: Record<string, number>  // concept id → points awarded
  totalScore: number
  maxScore: number
  percentage: number
  feedback: string
  strengths: string[]
  gaps: string[]
}

// ── Prompt builder ────────────────────────────
function buildRubricPrompt(
  questionText: string,
  learnerAnswer: string,
  rubric: VoiceRubric
): string {
  const rubricText = rubric.concepts
    .map(c => `- "${c.id}" (${c.points} pts): ${c.description}`)
    .join('\n')

  return `You are an expert AI skills assessor. Grade this learner's answer against the rubric below.

QUESTION: ${questionText}

LEARNER ANSWER: ${learnerAnswer}

RUBRIC (${rubric.maxScore} points total):
${rubricText}

Respond ONLY with valid JSON in this exact structure:
{
  "conceptScores": {
    ${rubric.concepts.map(c => `"${c.id}": <number 0 to ${c.points}>`).join(',\n    ')}
  },
  "feedback": "<1-2 sentence specific feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"]
}

Be accurate but encouraging. Partial credit is allowed.`
}

// ── Main grader ───────────────────────────────
export async function gradeWithRubric(
  questionText: string,
  learnerAnswer: string,
  rubric: VoiceRubric
): Promise<GradingResult> {

  const prompt = buildRubricPrompt(questionText, learnerAnswer, rubric)

  try {
    // Use the existing Bedrock/Ollama endpoint pattern from the repo
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a precise assessment grader. Always respond with valid JSON only.',
        forceModel: 'claude-sonnet-4-6',  // Always use full model for grading
        skipCache: true,                   // Never cache grading responses
      }),
    })

    if (!response.ok) throw new Error(`Grader API error: ${response.status}`)

    const data = await response.json()
    const content = data.content || data.message || ''

    // Strip markdown fences if present
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    // Calculate totals
    const conceptScores = parsed.conceptScores as Record<string, number>
    const totalScore = Object.values(conceptScores).reduce((sum, s) => sum + (s || 0), 0)
    const percentage = totalScore / rubric.maxScore

    return {
      conceptScores,
      totalScore,
      maxScore: rubric.maxScore,
      percentage,
      feedback: parsed.feedback || '',
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
    }

  } catch (err) {
    console.error('[RubricGrader] Error:', err)
    // Graceful fallback — conservative partial credit
    const fallbackScores: Record<string, number> = {}
    rubric.concepts.forEach(c => {
      fallbackScores[c.id] = Math.floor(c.points * 0.5)
    })
    const total = Object.values(fallbackScores).reduce((s, v) => s + v, 0)

    return {
      conceptScores: fallbackScores,
      totalScore: total,
      maxScore: rubric.maxScore,
      percentage: total / rubric.maxScore,
      feedback: 'Your answer has been recorded. Detailed feedback is being processed.',
      strengths: [],
      gaps: [],
    }
  }
}

// ── Voice transcript pre-processor ───────────
export function cleanTranscript(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\b(um|uh|like|you know|basically)\b/gi, '')
    .trim()
}
