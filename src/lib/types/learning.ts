// ─────────────────────────────────────────────
//  Frugal AI — Learning Platform Types
//  Drop into: src/lib/types/learning.ts
// ─────────────────────────────────────────────

export type Tier = 'spark' | 'build' | 'lead' | 'apex'
export type QuestionType = 'mcq' | 'matching' | 'ordering' | 'truefalse' | 'voice' | 'written'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type AssessMode = 'typed' | 'voice'
export type ModuleType = 'video' | 'article' | 'lab' | 'quiz' | 'interactive'
export type PersonaId = 'builder' | 'analyst' | 'strategist' | 'explorer'
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed'
export type AgentRole = 'scout' | 'sage' | 'curator' | 'coach'

// ── Score system ──────────────────────────────
export const TIER_THRESHOLDS = {
  spark: { min: 0,   max: 100, label: 'Spark',  color: '#EF4444' },
  build: { min: 101, max: 200, label: 'Build',  color: '#F0A500' },
  lead:  { min: 201, max: 299, label: 'Lead',   color: '#00E5A0' },
  apex:  { min: 300, max: 300, label: 'Apex',   color: '#4F8EF7' },
} as const

export function scoreToTier(score: number): Tier {
  if (score >= 300) return 'apex'
  if (score >= 201) return 'lead'
  if (score >= 101) return 'build'
  return 'spark'
}

export const BENCHMARK_SCORE = 201

// ── Learner ───────────────────────────────────
export interface Learner {
  id: string
  name: string
  email: string
  personaId: PersonaId | null
  onboardingComplete: boolean
  streak: number
  totalPoints: number
  lang: string
  createdAt: string
  lastActive: string
}

export interface LearnerProfile extends Learner {
  domainScores: DomainScore[]
  moduleProgress: ModuleProgress[]
  recentEvents: AssessmentEvent[]
}

// ── Scores ────────────────────────────────────
export interface DomainScore {
  learnerId: string
  domain: string
  score: number
  tier: Tier
  assessedAt: string
}

// ── Assessment ────────────────────────────────
export interface Question {
  id: string
  domain: string
  subdomain: string
  skill: string
  type: QuestionType
  difficulty: Difficulty
  weight: number
  text: string
  options?: MCQOption[]
  pairs?: MatchPair[]
  items?: string[]           // ordering
  statement?: boolean        // true/false
  rubric?: VoiceRubric
  correctAnswer?: string
  explanation: string
  tags: string[]
  acceptanceRate: number
  timesUsed: number
}

export interface MCQOption {
  letter: string
  text: string
  correct: boolean
}

export interface MatchPair {
  left: string
  right: string
}

export interface VoiceRubric {
  concepts: RubricConcept[]
  maxScore: number
}

export interface RubricConcept {
  id: string
  description: string
  points: number
}

export interface AssessmentSession {
  id: string
  learnerId: string
  domain: string
  mode: AssessMode
  status: 'active' | 'completed' | 'abandoned'
  startedAt: string
  completedAt?: string
  finalScore?: number
  finalTier?: Tier
  events: AssessmentEvent[]
}

export interface AssessmentEvent {
  id: string
  sessionId: string
  learnerId: string
  domain: string
  questionId: string
  question: Question
  answer: string
  correct: boolean
  scoreDelta: number
  difficulty: Difficulty
  createdAt: string
}

// ── CAT Engine ────────────────────────────────
export interface CATState {
  currentScore: number
  questionsAsked: string[]
  stableTurns: number          // convergence counter
  lastDelta: number
  domain: string
  learnerId: string
}

export interface CATDecision {
  nextQuestion: Question | null
  shouldStop: boolean
  finalScore: number
  reason?: string
}

// ── Modules ───────────────────────────────────
export interface LearningModule {
  id: string
  title: string
  description: string
  domain: string
  subdomain?: string
  tier: Tier
  type: ModuleType
  source: string              // 'aws' | 'coursera' | 'internal' | 'youtube'
  url: string
  durationMinutes: number
  tags: string[]
  prerequisites: string[]     // module IDs
  thumbnail?: string
  rating?: number
}

export interface ModuleProgress {
  learnerId: string
  moduleId: string
  module: LearningModule
  status: ModuleStatus
  pct: number                 // 0-100
  startedAt?: string
  completedAt?: string
}

// ── Personas ──────────────────────────────────
export interface Persona {
  id: PersonaId
  label: string
  emoji: string
  subtitle: string
  description: string
  color: string               // CSS gradient string
  domainWeights: Record<string, number>   // domain → weight 1-5
  sagePromptModifier: string
  scoutPromptModifier: string
  primaryDomains: string[]
}

// ── Taxonomy ──────────────────────────────────
export interface TaxonomyDomain {
  id: string
  name: string
  emoji: string
  color: string
  description: string
  benchmark: number
  weight: number
  subdomains: TaxonomySubdomain[]
}

export interface TaxonomySubdomain {
  id: string
  domainId: string
  name: string
  description: string
  skills: TaxonomySkill[]
}

export interface TaxonomySkill {
  id: string
  subdomainId: string
  name: string
  description: string
  questionCount: number
}

// ── Agents ────────────────────────────────────
export interface AgentConfig {
  id: string
  role: AgentRole
  name: string                // 'Scout' | 'Sage' | 'Curator' | 'Coach'
  displayRole: string
  emoji: string
  model: string
  routingTier: 'tier1' | 'tier2' | 'dynamic'
  maxTokens: number
  systemPrompt: string
  contextInjections: string[]
  active: boolean
}

// ── Studio / Admin ────────────────────────────
export interface AdminRole {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'content_admin' | 'read_only'
  permissions: string[]
}

export interface LearningPathway {
  id: string
  name: string
  description: string
  targetPersona: PersonaId
  stages: PathwayStage[]
  publishedAt?: string
  active: boolean
}

export interface PathwayStage {
  id: string
  pathwayId: string
  order: number
  title: string
  type: 'learn' | 'assess_gate'
  moduleIds?: string[]
  assessDomain?: string
  minScoreToPass?: number
  failAction?: 'loop' | 'remediate'
}

// ── API Payloads ──────────────────────────────
export interface SubmitAnswerPayload {
  sessionId: string
  questionId: string
  answer: string
  timeTakenMs: number
}

export interface SubmitVoicePayload {
  sessionId: string
  questionId: string
  transcript: string
  audioDurationMs: number
}

export interface StartSessionPayload {
  learnerId: string
  domain: string
  mode: AssessMode
}

export interface UpdateProgressPayload {
  moduleId: string
  pct: number
  status?: ModuleStatus
}
