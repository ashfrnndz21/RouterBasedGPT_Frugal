// ─────────────────────────────────────────────
//  /api/studio/ai — AI intelligence endpoint for Studio
//  Dispatches to action-specific handlers, each with
//  structured prompts + DB context injection
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { studioLLM, parseJSON } from '@/lib/studioAI'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

// ── Main dispatcher ──────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'generate-questions':   return handleGenerateQuestions(body)
      case 'improve-question':     return handleImproveQuestion(body)
      case 'generate-description': return handleGenerateDescription(body)
      case 'suggest-skills':       return handleSuggestSkills(body)
      case 'test-agent':           return handleTestAgent(body)
      case 'improve-prompt':       return handleImprovePrompt(body)
      case 'analyze-scores':       return handleAnalyzeScores()
      case 'suggest-pathway':      return handleSuggestPathway(body)
      case 'suggest-weights':      return handleSuggestWeights(body)
      case 'curate-content':       return handleCurateContent(body)
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[Studio AI]', err?.message ?? err)
    if (err?.message === 'NO_MODEL') {
      return NextResponse.json(
        { error: 'No AI model configured. Add an API key in config.toml or start Ollama.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: err?.message ?? 'AI request failed' }, { status: 500 })
  }
}

// ── 1. Generate Questions ─────────────────────
async function handleGenerateQuestions(body: any) {
  const { domain, subdomain, skill, difficulty = 'medium', type = 'mcq', count = 3 } = body
  const db = getDB()

  try {
    // Load taxonomy context
    const domainRow = domain ? db.prepare('SELECT name, description FROM taxonomy_domains WHERE id = ?').get(domain) as any : null
    const subdomainRow = subdomain ? db.prepare('SELECT name, description FROM taxonomy_subdomains WHERE id = ?').get(subdomain) as any : null
    const skillRow = skill ? db.prepare('SELECT name, description FROM taxonomy_skills WHERE id = ?').get(skill) as any : null

    // Load a few existing questions as style examples
    const examples = db.prepare(
      `SELECT text, type, difficulty, options, explanation FROM questions WHERE domain = ? LIMIT 2`
    ).all(domain || 'ai_essentials') as any[]

    const contextParts = []
    if (domainRow) contextParts.push(`Domain: ${domainRow.name} — ${domainRow.description || 'AI skills domain'}`)
    if (subdomainRow) contextParts.push(`Subdomain: ${subdomainRow.name} — ${subdomainRow.description || ''}`)
    if (skillRow) contextParts.push(`Skill: ${skillRow.name} — ${skillRow.description || ''}`)

    const exampleText = examples.length > 0
      ? `\n\nHere are existing questions for reference style:\n${examples.map((e: any, i: number) =>
          `${i+1}. [${e.type}/${e.difficulty}] ${e.text}`
        ).join('\n')}`
      : ''

    const system = `You are an expert AI skills assessment designer for an enterprise learning platform. Generate high-quality assessment questions that test real understanding, not trivia. Questions should be practical, scenario-based where possible, and appropriate for working professionals.

Always respond with valid JSON only — no markdown fences, no explanation outside the JSON.`

    const prompt = `Generate exactly ${count} ${type} questions at "${difficulty}" difficulty level.

Taxonomy context:
${contextParts.join('\n') || `Domain: ${domain || 'ai_essentials'}`}
${exampleText}

Respond with this JSON structure:
{
  "questions": [
    {
      "text": "The question text",
      "type": "${type}",
      "difficulty": "${difficulty}",
      "domain": "${domain || 'ai_essentials'}",
      ${type === 'mcq' ? `"options": [
        {"letter": "A", "text": "Option text", "correct": false},
        {"letter": "B", "text": "Option text", "correct": true},
        {"letter": "C", "text": "Option text", "correct": false},
        {"letter": "D", "text": "Option text", "correct": false}
      ],` : type === 'truefalse' ? `"statement": true,` : type === 'ordering' ? `"items": ["Step 1", "Step 2", "Step 3", "Step 4"],` : type === 'matching' ? `"pairs": [{"left": "Term", "right": "Definition"}],` : ''}
      "explanation": "Why the correct answer is right (2-3 sentences)",
      "tags": ["tag1", "tag2"]
    }
  ]
}`

    const raw = await studioLLM(system, prompt)
    const result = parseJSON(raw)

    return NextResponse.json(result)
  } finally { db.close() }
}

// ── 2. Improve Question ───────────────────────
async function handleImproveQuestion(body: any) {
  const { question } = body
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 })

  const system = `You are an expert assessment designer. Analyze and improve the given question for clarity, pedagogical value, and distractor quality. Always respond with valid JSON only.`

  const prompt = `Improve this assessment question:

Type: ${question.type}
Difficulty: ${question.difficulty}
Text: ${question.text}
${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}
${question.explanation ? `Current explanation: ${question.explanation}` : ''}

Respond with:
{
  "improved": {
    "text": "Improved question text",
    "options": [...improved options if MCQ...],
    "explanation": "Improved explanation"
  },
  "changes": [
    "What was changed and why (1 sentence each)"
  ]
}`

  const raw = await studioLLM(system, prompt)
  const result = parseJSON(raw)
  return NextResponse.json(result)
}

// ── 3. Generate Description ───────────────────
async function handleGenerateDescription(body: any) {
  const { type, name, parentName } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const context = parentName ? ` within the "${parentName}" ${type === 'skill' ? 'subdomain' : 'domain'}` : ''

  const system = `You are a curriculum architect for an enterprise AI skills platform. Write concise, precise descriptions for taxonomy items. No fluff. 1-2 sentences max. Respond with JSON only.`

  const prompt = `Write a description for this ${type}: "${name}"${context}.

Respond with: { "description": "Your concise description here" }`

  const raw = await studioLLM(system, prompt)
  const result = parseJSON(raw)
  return NextResponse.json(result)
}

// ── 4. Suggest Skills ─────────────────────────
async function handleSuggestSkills(body: any) {
  const { domainId } = body
  if (!domainId) return NextResponse.json({ error: 'domainId required' }, { status: 400 })

  const db = getDB()
  try {
    const domain = db.prepare('SELECT * FROM taxonomy_domains WHERE id = ?').get(domainId) as any
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

    const subs = db.prepare('SELECT * FROM taxonomy_subdomains WHERE domain_id = ?').all(domainId) as any[]
    const skills = db.prepare(
      `SELECT s.*, sub.name as subdomain_name FROM taxonomy_skills s
       JOIN taxonomy_subdomains sub ON s.subdomain_id = sub.id
       WHERE sub.domain_id = ?`
    ).all(domainId) as any[]

    const taxonomyTree = subs.map(sub => ({
      subdomain: sub.name,
      skills: skills.filter((s: any) => s.subdomain_id === sub.id).map((s: any) => s.name),
    }))

    const system = `You are a senior AI curriculum architect. Analyze skill taxonomies for gaps and suggest additions that improve coverage. Respond with JSON only.`

    const prompt = `Analyze this taxonomy for "${domain.name}" and suggest 3-5 missing skills:

Current structure:
${taxonomyTree.map(t => `  ${t.subdomain}:\n${t.skills.map(s => `    - ${s}`).join('\n')}`).join('\n')}

Suggest skills that would make this taxonomy more complete for enterprise AI assessment.

Respond with:
{
  "suggestions": [
    {
      "subdomain": "Which existing subdomain this fits in (or 'NEW: Name' for a new one)",
      "skill": "Proposed skill name",
      "reason": "Why this skill is important (1 sentence)"
    }
  ]
}`

    const raw = await studioLLM(system, prompt)
    const result = parseJSON(raw)
    return NextResponse.json(result)
  } finally { db.close() }
}

// ── 5. Test Agent ─────────────────────────────
async function handleTestAgent(body: any) {
  const { agentId, message, history = [] } = body
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const db = getDB()
  try {
    let systemPrompt = 'You are a helpful AI assistant.'
    let model = 'default'

    if (agentId) {
      const agent = db.prepare('SELECT * FROM agent_configs WHERE id = ?').get(agentId) as any
      if (agent) {
        systemPrompt = agent.system_prompt || systemPrompt
        model = agent.model || model
      }
    }

    const startTime = Date.now()

    // Build conversation with history
    const conversationParts = history.map((h: any) =>
      `${h.role === 'user' ? 'User' : 'Agent'}: ${h.content}`
    ).join('\n')

    const fullPrompt = conversationParts
      ? `Previous conversation:\n${conversationParts}\n\nUser: ${message}`
      : message

    const reply = await studioLLM(systemPrompt, fullPrompt)
    const latencyMs = Date.now() - startTime

    return NextResponse.json({ reply, model, latencyMs })
  } finally { db.close() }
}

// ── 6. Improve Prompt ─────────────────────────
async function handleImprovePrompt(body: any) {
  const { systemPrompt, agentRole } = body
  if (!systemPrompt) return NextResponse.json({ error: 'systemPrompt required' }, { status: 400 })

  const system = `You are a prompt engineering expert. Analyze AI agent system prompts and provide specific, actionable improvements. Respond with JSON only.`

  const prompt = `Analyze this system prompt for a "${agentRole || 'general'}" AI agent and suggest improvements:

---
${systemPrompt}
---

Evaluate for: clarity, specificity, tone consistency, guardrails, role boundaries, and effectiveness.

Respond with:
{
  "suggestions": [
    "Specific suggestion 1",
    "Specific suggestion 2"
  ],
  "improvedPrompt": "The full improved system prompt"
}`

  const raw = await studioLLM(system, prompt)
  const result = parseJSON(raw)
  return NextResponse.json(result)
}

// ── 7. Analyze Scores (Dashboard Insights) ────
async function handleAnalyzeScores() {
  const db = getDB()
  try {
    // Gather platform statistics
    const totalLearners = (db.prepare('SELECT COUNT(*) as c FROM learners').get() as any)?.c ?? 0
    const totalSessions = (db.prepare("SELECT COUNT(*) as c FROM assessment_sessions WHERE status = 'completed'").get() as any)?.c ?? 0

    const domainStats = db.prepare(`
      SELECT domain,
        ROUND(AVG(score), 1) as avg_score,
        COUNT(*) as learner_count,
        SUM(CASE WHEN tier = 'spark' THEN 1 ELSE 0 END) as spark_count,
        SUM(CASE WHEN tier = 'build' THEN 1 ELSE 0 END) as build_count,
        SUM(CASE WHEN tier = 'lead' THEN 1 ELSE 0 END) as lead_count,
        SUM(CASE WHEN tier = 'apex' THEN 1 ELSE 0 END) as apex_count
      FROM domain_scores GROUP BY domain
    `).all() as any[]

    const recentTrend = db.prepare(`
      SELECT DATE(completed_at) as day, COUNT(*) as count
      FROM assessment_sessions WHERE status = 'completed' AND completed_at > datetime('now', '-14 days')
      GROUP BY DATE(completed_at) ORDER BY day
    `).all() as any[]

    const lowAcceptanceQuestions = db.prepare(`
      SELECT COUNT(*) as c FROM questions WHERE acceptance_rate < 0.3 AND times_used > 5
    `).get() as any

    const statsText = `
Platform Overview:
- ${totalLearners} total learners, ${totalSessions} completed assessments

Domain Performance:
${domainStats.map(d => `- ${d.domain}: avg ${d.avg_score}, ${d.learner_count} assessed (Spark: ${d.spark_count}, Build: ${d.build_count}, Lead: ${d.lead_count}, Apex: ${d.apex_count})`).join('\n')}

Assessment Trend (last 14 days):
${recentTrend.map(t => `- ${t.day}: ${t.count} completions`).join('\n') || '- No recent data'}

Question Health:
- ${lowAcceptanceQuestions?.c ?? 0} questions have <30% acceptance rate (possible issues)
`

    const system = `You are an analytics AI for an enterprise learning platform. Generate actionable insights from platform data. Be specific with numbers. Respond with JSON only.`

    const prompt = `Analyze this platform data and generate 3-5 actionable insights for the admin:

${statsText}

Respond with:
{
  "insights": [
    {
      "title": "Short insight title",
      "body": "2-3 sentence actionable insight with specific numbers",
      "type": "warning" | "success" | "info",
      "metric": "Optional key number (e.g., '73%', '12 learners')"
    }
  ]
}`

    const raw = await studioLLM(system, prompt)
    const result = parseJSON(raw)
    return NextResponse.json(result)
  } finally { db.close() }
}

// ── 8. Suggest Pathway ────────────────────────
async function handleSuggestPathway(body: any) {
  const { targetPersona = 'builder', domain = 'ai_essentials' } = body

  const db = getDB()
  try {
    const domainRow = db.prepare('SELECT name, description FROM taxonomy_domains WHERE id = ?').get(domain) as any
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(targetPersona) as any

    const subs = db.prepare('SELECT name FROM taxonomy_subdomains WHERE domain_id = ?').all(domain) as any[]

    const system = `You are a learning experience designer for an enterprise AI platform. Design learning pathways that mix content stages with assessment gates. Respond with JSON only.`

    const prompt = `Design a 4-6 stage learning pathway for:
- Persona: ${persona?.label || targetPersona} — ${persona?.description || 'general learner'}
- Domain: ${domainRow?.name || domain} — ${domainRow?.description || ''}
- Available subdomains: ${subs.map(s => s.name).join(', ')}

Mix "learn" blocks (content) with "assess_gate" blocks (assessment checkpoints).
For assessment gates, set realistic min_score thresholds (0-300 scale, 201 = benchmark).

Respond with:
{
  "stages": [
    {
      "type": "learn",
      "title": "Stage title",
      "description": "What this stage covers"
    },
    {
      "type": "assess_gate",
      "title": "Checkpoint title",
      "assess_domain": "${domain}",
      "min_score": 120,
      "fail_action": "loop"
    }
  ]
}`

    const raw = await studioLLM(system, prompt)
    const result = parseJSON(raw)
    return NextResponse.json(result)
  } finally { db.close() }
}

// ── 9. Curate Content ─────────────────────────
async function handleCurateContent(body: any) {
  const { skillName, domainName, subdomainName } = body
  if (!skillName) return NextResponse.json({ error: 'skillName required' }, { status: 400 })

  const db = getDB()
  try {
    // Load existing modules to avoid duplicates
    const existingModules = db.prepare(
      `SELECT title, source FROM modules WHERE domain LIKE ? OR title LIKE ?`
    ).all(`%${domainName?.toLowerCase()?.replace(/\s+/g, '_') || ''}%`, `%${skillName}%`) as any[]

    const existingList = existingModules.length > 0
      ? `\n\nAlready in the library (avoid duplicates):\n${existingModules.map(m => `- ${m.title} (${m.source})`).join('\n')}`
      : ''

    const system = `You are an enterprise L&D content curator specialising in AI and technology skills. Suggest high-quality, real-world learning resources from reputable platforms. Be specific with URLs — use real course URLs where possible. Always respond with valid JSON only.`

    const prompt = `Suggest 3-5 high-quality learning resources for this skill:

Skill: ${skillName}
Domain: ${domainName || 'AI'}
${subdomainName ? `Subdomain: ${subdomainName}` : ''}
${existingList}

Suggest from these platforms: Coursera, AWS SkillBuilder, YouTube (educational channels), arXiv papers, official docs, O'Reilly, edX.

Respond with:
{
  "suggestions": [
    {
      "title": "Course/resource title",
      "description": "2 sentence description of what the learner will gain",
      "source": "coursera" | "aws" | "youtube" | "internal",
      "url": "https://real-url-to-resource",
      "type": "video" | "article" | "lab" | "interactive",
      "durationMinutes": 60,
      "tier": "spark" | "build" | "lead"
    }
  ]
}`

    const raw = await studioLLM(system, prompt)
    const result = parseJSON(raw)
    return NextResponse.json(result)
  } finally { db.close() }
}

// ── 10. Suggest Weights ───────────────────────
async function handleSuggestWeights(body: any) {
  const { personaId } = body
  if (!personaId) return NextResponse.json({ error: 'personaId required' }, { status: 400 })

  const db = getDB()
  try {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any
    if (!persona) return NextResponse.json({ error: 'Persona not found' }, { status: 404 })

    const currentWeights = JSON.parse(persona.domain_weights || '{}')

    // Get performance data for learners with this persona
    const perfData = db.prepare(`
      SELECT ds.domain, ROUND(AVG(ds.score), 1) as avg_score, COUNT(*) as count
      FROM domain_scores ds
      JOIN learners l ON ds.learner_id = l.id
      WHERE l.persona_id = ?
      GROUP BY ds.domain
    `).all(personaId) as any[]

    const system = `You are an adaptive learning system analyst. Based on learner performance data, recommend domain weight adjustments for persona optimization. Respond with JSON only.`

    const prompt = `Analyze performance data for the "${persona.label}" persona and recommend domain weight adjustments.

Current weights (1-5 scale): ${JSON.stringify(currentWeights)}

Performance data for ${persona.label} learners:
${perfData.map(d => `- ${d.domain}: avg score ${d.avg_score}/300 (${d.count} learners assessed)`).join('\n') || '- No performance data yet'}

Domains: ai_essentials, data_science, mlops, responsible_ai, prompt_engineering, cloud_ai, ai_strategy, ai_security

Respond with:
{
  "recommendations": [
    {
      "domain": "domain_id",
      "current": 3,
      "suggested": 4,
      "reason": "Why this adjustment (1 sentence)"
    }
  ]
}`

    const raw = await studioLLM(system, prompt)
    const result = parseJSON(raw)
    return NextResponse.json(result)
  } finally { db.close() }
}
