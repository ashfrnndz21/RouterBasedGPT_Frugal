// src/app/api/studio/content/route.ts — Module CRUD + auto-seed from catalogue
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

// ── Seed catalogue (from lmsAggregator hardcoded modules) ──
const SEED_MODULES = [
  { id: 'mod_001', title: 'Introduction to Generative AI', description: 'Foundational concepts of generative AI — how LLMs work, key terminology, and real-world applications.', domain: 'ai_essentials', tier: 'spark', type: 'video', source: 'aws', url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/17763/introduction-to-generative-ai', duration_m: 45, tags: '["genai","llm","fundamentals"]', rating: 4.7 },
  { id: 'mod_002', title: 'AI Essentials for Business Professionals', description: 'Non-technical grounding in AI concepts, use cases, and organisational impact.', domain: 'ai_essentials', tier: 'spark', type: 'article', source: 'internal', url: '/learn/content/ai-essentials-business', duration_m: 30, tags: '["business","non-technical","fundamentals"]', rating: 4.5 },
  { id: 'mod_003', title: 'Machine Learning Fundamentals', description: 'Supervised, unsupervised, and reinforcement learning — core algorithms explained.', domain: 'ai_essentials', tier: 'build', type: 'video', source: 'aws', url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/1851/machine-learning-terminology-and-process', duration_m: 60, tags: '["ml","algorithms","supervised"]', rating: 4.6 },
  { id: 'mod_004', title: 'Python for Data Science', description: 'Pandas, NumPy, Matplotlib — practical data manipulation and visualisation in Python.', domain: 'data_science', tier: 'build', type: 'lab', source: 'coursera', url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai', duration_m: 180, tags: '["python","pandas","data-manipulation"]', rating: 4.8 },
  { id: 'mod_005', title: 'Feature Engineering Best Practices', description: 'Encoding, scaling, imputation, and feature selection strategies for ML pipelines.', domain: 'data_science', tier: 'build', type: 'article', source: 'internal', url: '/learn/content/feature-engineering', duration_m: 45, tags: '["feature-engineering","encoding"]', rating: 4.4 },
  { id: 'mod_006', title: 'MLflow: Experiment Tracking in Practice', description: 'Track experiments, parameters, metrics and artefacts with MLflow.', domain: 'mlops', tier: 'build', type: 'lab', source: 'internal', url: '/learn/content/mlflow-lab', duration_m: 40, tags: '["mlflow","experiment-tracking"]', rating: 4.6 },
  { id: 'mod_007', title: 'ML Deployment on Amazon SageMaker', description: 'Train, evaluate, and deploy ML models using SageMaker endpoints.', domain: 'mlops', tier: 'lead', type: 'lab', source: 'aws', url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/1880/getting-started-with-amazon-sagemaker', duration_m: 120, tags: '["sagemaker","deployment","aws"]', rating: 4.7 },
  { id: 'mod_008', title: 'Drift Detection in Production ML Systems', description: 'PSI, KL-divergence, and monitoring strategies for detecting data and concept drift.', domain: 'mlops', tier: 'lead', type: 'article', source: 'internal', url: '/learn/content/drift-detection', duration_m: 35, tags: '["drift","monitoring","production"]', rating: 4.5 },
  { id: 'mod_009', title: 'Responsible AI: Bias and Fairness', description: 'Understanding sources of AI bias, fairness metrics, and mitigation strategies.', domain: 'responsible_ai', tier: 'build', type: 'video', source: 'coursera', url: 'https://www.coursera.org/learn/responsible-ai', duration_m: 90, tags: '["bias","fairness","ethics"]', rating: 4.8 },
  { id: 'mod_010', title: 'Prompt Engineering Fundamentals', description: 'System prompts, few-shot learning, chain-of-thought, and prompt injection defence.', domain: 'prompt_engineering', tier: 'spark', type: 'interactive', source: 'internal', url: '/learn/content/prompt-engineering-fundamentals', duration_m: 50, tags: '["prompting","few-shot","chain-of-thought"]', rating: 4.9 },
  { id: 'mod_011', title: 'Amazon Bedrock: Build with Foundation Models', description: 'API access to Claude, Titan, Llama, and Stable Diffusion. RAG patterns and guardrails.', domain: 'cloud_ai', tier: 'build', type: 'lab', source: 'aws', url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/17904/amazon-bedrock-getting-started', duration_m: 90, tags: '["bedrock","aws","foundation-models"]', rating: 4.8 },
  { id: 'mod_012', title: 'AI Strategy for Leaders', description: 'How to build an AI roadmap, assess AI maturity, and govern AI adoption at enterprise level.', domain: 'ai_strategy', tier: 'lead', type: 'video', source: 'coursera', url: 'https://www.coursera.org/learn/ai-for-everyone', duration_m: 120, tags: '["strategy","leadership","roadmap"]', rating: 4.7 },
  { id: 'mod_013', title: 'LLM Security: Prompt Injection & Defences', description: 'Common LLM attack vectors — prompt injection, jailbreaks, data poisoning — and mitigation.', domain: 'ai_security', tier: 'build', type: 'article', source: 'internal', url: '/learn/content/llm-security', duration_m: 40, tags: '["security","prompt-injection","llm"]', rating: 4.6 },
]

function ensureSchema(db: Database.Database) {
  // Add skill_id column if not present
  try {
    db.prepare("SELECT skill_id FROM modules LIMIT 1").get()
  } catch {
    try { db.prepare("ALTER TABLE modules ADD COLUMN skill_id TEXT").run() } catch { /* already exists */ }
  }

  // Auto-seed if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM modules').get() as any)?.c ?? 0
  if (count === 0) {
    const insert = db.prepare(`INSERT OR IGNORE INTO modules (id, title, description, domain, tier, type, source, url, duration_m, tags, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const m of SEED_MODULES) {
      insert.run(m.id, m.title, m.description, m.domain, m.tier, m.type, m.source, m.url, m.duration_m, m.tags, m.rating)
    }
  }
}

// ── GET: List modules with filters ──
export async function GET(req: NextRequest) {
  const db = getDB()
  try {
    ensureSchema(db)

    const { searchParams } = req.nextUrl
    const domain = searchParams.get('domain')
    const tier = searchParams.get('tier')
    const type = searchParams.get('type')
    const source = searchParams.get('source')
    const skillId = searchParams.get('skill_id')
    const search = searchParams.get('search')

    let sql = 'SELECT m.*, s.name as skill_name FROM modules m LEFT JOIN taxonomy_skills s ON m.skill_id = s.id WHERE 1=1'
    const params: any[] = []

    if (domain) { sql += ' AND m.domain = ?'; params.push(domain) }
    if (tier) { sql += ' AND m.tier = ?'; params.push(tier) }
    if (type) { sql += ' AND m.type = ?'; params.push(type) }
    if (source) { sql += ' AND m.source = ?'; params.push(source) }
    if (skillId) { sql += ' AND m.skill_id = ?'; params.push(skillId) }
    if (search) { sql += ' AND (m.title LIKE ? OR m.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

    sql += ' ORDER BY m.domain, m.tier, m.title'

    const modules = db.prepare(sql).all(...params)
    const total = (db.prepare('SELECT COUNT(*) as c FROM modules').get() as any)?.c ?? 0

    return NextResponse.json({ modules, total })
  } finally { db.close() }
}

// ── POST: Create module ──
export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getDB()
  try {
    ensureSchema(db)
    const id = body.id || `mod_${randomUUID().slice(0, 8)}`
    db.prepare(`INSERT INTO modules (id, title, description, domain, subdomain, tier, type, source, url, duration_m, tags, prerequisites, thumbnail, rating, skill_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      body.title || 'Untitled Module',
      body.description || '',
      body.domain || 'ai_essentials',
      body.subdomain || null,
      body.tier || 'spark',
      body.type || 'video',
      body.source || 'internal',
      body.url || '',
      body.duration_m || 0,
      JSON.stringify(body.tags || []),
      JSON.stringify(body.prerequisites || []),
      body.thumbnail || null,
      body.rating || null,
      body.skill_id || null,
    )
    const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(id)
    return NextResponse.json({ module })
  } finally { db.close() }
}

// ── PUT: Update module ──
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getDB()
  try {
    ensureSchema(db)
    db.prepare(`UPDATE modules SET title=COALESCE(?,title), description=COALESCE(?,description), domain=COALESCE(?,domain), subdomain=COALESCE(?,subdomain), tier=COALESCE(?,tier), type=COALESCE(?,type), source=COALESCE(?,source), url=COALESCE(?,url), duration_m=COALESCE(?,duration_m), tags=COALESCE(?,tags), prerequisites=COALESCE(?,prerequisites), thumbnail=COALESCE(?,thumbnail), rating=COALESCE(?,rating), skill_id=? WHERE id=?`).run(
      body.title ?? null,
      body.description ?? null,
      body.domain ?? null,
      body.subdomain ?? null,
      body.tier ?? null,
      body.type ?? null,
      body.source ?? null,
      body.url ?? null,
      body.duration_m ?? null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.prerequisites ? JSON.stringify(body.prerequisites) : null,
      body.thumbnail ?? null,
      body.rating ?? null,
      body.skill_id !== undefined ? body.skill_id : null,
      id,
    )
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}

// ── DELETE: Remove module ──
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDB()
  try {
    db.prepare('DELETE FROM modules WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
