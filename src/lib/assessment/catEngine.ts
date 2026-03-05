// ─────────────────────────────────────────────
//  Frugal AI — CAT (Computerised Adaptive Test) Engine
//  Drop into: src/lib/assessment/catEngine.ts
// ─────────────────────────────────────────────

import type { CATState, CATDecision, Question, Difficulty, AssessmentEvent } from '@/lib/types/learning'
import { scoreToTier } from '@/lib/types/learning'

// ── Config ────────────────────────────────────
const CAT_CONFIG = {
  STABLE_TURNS_TO_STOP: 5,     // stop after N turns with delta < STABLE_THRESHOLD
  STABLE_THRESHOLD: 8,          // delta below this counts as "stable"
  MAX_QUESTIONS: 20,            // hard ceiling
  MIN_QUESTIONS: 5,             // always ask at least this many
  SCORE_DELTA: {
    correct: {
      easy:   { min: 5,  max: 10 },
      medium: { min: 10, max: 18 },
      hard:   { min: 18, max: 25 },
    },
    wrong: {
      easy:   { min: -3, max: -5  },
      medium: { min: -5, max: -10 },
      hard:   { min: -8, max: -15 },
    },
    skip: -2,
  },
}

// ── Difficulty selection based on current score ──
export function targetDifficulty(score: number): Difficulty {
  if (score < 80)  return 'easy'
  if (score < 180) return 'medium'
  return 'hard'
}

// ── Score delta calculation ────────────────────
export function calculateDelta(
  correct: boolean,
  difficulty: Difficulty,
  skipped = false
): number {
  if (skipped) return CAT_CONFIG.SCORE_DELTA.skip

  const table = correct
    ? CAT_CONFIG.SCORE_DELTA.correct
    : CAT_CONFIG.SCORE_DELTA.wrong

  const { min, max } = table[difficulty]
  // Small random variance ±2 to avoid mechanical feel
  const variance = Math.floor(Math.random() * 3) - 1
  return Math.max(min, Math.min(max, min + Math.floor(Math.random() * (max - min + 1)) + variance))
}

// ── Next question selection ────────────────────
export function selectNextQuestion(
  state: CATState,
  questionBank: Question[]
): Question | null {
  const asked = new Set(state.questionsAsked)
  const target = targetDifficulty(state.currentScore)

  // Filter: same domain, not yet asked, target difficulty first
  const candidates = questionBank
    .filter(q =>
      q.domain === state.domain &&
      !asked.has(q.id) &&
      q.difficulty === target
    )

  if (candidates.length > 0) {
    // Pick by acceptance rate — prefer questions learners struggle with (more signal)
    return candidates.sort((a, b) => a.acceptanceRate - b.acceptanceRate)[0]
  }

  // Fallback: adjacent difficulty
  const fallbackDifficulties: Difficulty[] =
    target === 'hard'   ? ['medium', 'easy'] :
    target === 'easy'   ? ['medium', 'hard'] :
                          ['easy',   'hard']

  for (const diff of fallbackDifficulties) {
    const fallback = questionBank.filter(
      q => q.domain === state.domain && !asked.has(q.id) && q.difficulty === diff
    )
    if (fallback.length > 0) return fallback[0]
  }

  return null // bank exhausted
}

// ── Convergence check ──────────────────────────
export function checkConvergence(state: CATState, delta: number): boolean {
  const absStable = Math.abs(delta) < CAT_CONFIG.STABLE_THRESHOLD
  if (absStable) {
    state.stableTurns++
  } else {
    state.stableTurns = 0
  }

  return (
    state.stableTurns >= CAT_CONFIG.STABLE_TURNS_TO_STOP ||
    state.questionsAsked.length >= CAT_CONFIG.MAX_QUESTIONS
  )
}

// ── Main decision function ─────────────────────
export function catDecision(
  state: CATState,
  questionBank: Question[],
  lastEvent?: AssessmentEvent
): CATDecision {
  // Apply last event delta to state
  if (lastEvent) {
    const delta = lastEvent.scoreDelta
    state.currentScore = Math.max(0, Math.min(300, state.currentScore + delta))
    state.questionsAsked.push(lastEvent.questionId)
    state.lastDelta = delta

    const shouldStop =
      state.questionsAsked.length >= CAT_CONFIG.MIN_QUESTIONS &&
      checkConvergence(state, delta)

    if (shouldStop) {
      return {
        nextQuestion: null,
        shouldStop: true,
        finalScore: state.currentScore,
        reason: state.questionsAsked.length >= CAT_CONFIG.MAX_QUESTIONS
          ? 'max_questions_reached'
          : 'score_converged',
      }
    }
  }

  // No questions asked yet — check minimum
  if (state.questionsAsked.length >= CAT_CONFIG.MIN_QUESTIONS && !lastEvent) {
    // First call — start fresh
  }

  const nextQuestion = selectNextQuestion(state, questionBank)

  if (!nextQuestion) {
    return {
      nextQuestion: null,
      shouldStop: true,
      finalScore: state.currentScore,
      reason: 'bank_exhausted',
    }
  }

  return {
    nextQuestion,
    shouldStop: false,
    finalScore: state.currentScore,
  }
}

// ── Initial state factory ──────────────────────
export function initCATState(
  learnerId: string,
  domain: string,
  existingScore?: number
): CATState {
  // Start from midpoint of existing tier, or 0 if new
  const startScore = existingScore
    ? Math.max(0, existingScore - 30) // regress slightly — reassess fairly
    : 0

  return {
    currentScore: startScore,
    questionsAsked: [],
    stableTurns: 0,
    lastDelta: 0,
    domain,
    learnerId,
  }
}

// ── Rubric grading helper (for voice/written) ──
export function gradeRubric(
  rubricScore: number, // 0 to rubric.maxScore
  maxScore: number,
  difficulty: Difficulty
): { correct: boolean; delta: number } {
  const pct = rubricScore / maxScore
  const correct = pct >= 0.6 // 60%+ = correct

  // Scale delta by rubric percentage
  const { min, max } = correct
    ? CAT_CONFIG.SCORE_DELTA.correct[difficulty]
    : CAT_CONFIG.SCORE_DELTA.wrong[difficulty]

  const delta = Math.round(min + (max - min) * pct)
  return { correct, delta }
}
