// src/app/api/learn/assess/grade-rubric/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { gradeWithRubric, cleanTranscript } from '@/lib/assessment/rubricGrader'
import type { VoiceRubric } from '@/lib/types/learning'

export async function POST(req: NextRequest) {
  const { questionText, answer, rubric } = await req.json() as {
    questionText: string
    answer: string
    rubric: VoiceRubric
  }

  if (!questionText || !answer || !rubric) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const cleaned = cleanTranscript(answer)
  const result = await gradeWithRubric(questionText, cleaned, rubric)

  return NextResponse.json({
    correct: result.percentage >= 0.6,
    percentage: result.percentage,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    feedback: result.feedback,
    strengths: result.strengths,
    gaps: result.gaps,
  })
}
