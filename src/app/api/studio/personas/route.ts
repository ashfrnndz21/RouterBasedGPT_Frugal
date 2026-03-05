// src/app/api/studio/personas/route.ts — Enriched with pathway/module/skill stats
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDB() { return new Database(path.join(process.cwd(), 'data', 'frugal.db')) }

export async function GET() {
  const db = getDB()
  try {
    const personas = db.prepare('SELECT p.*, COUNT(l.id) as learner_count FROM personas p LEFT JOIN learners l ON l.persona_id = p.id GROUP BY p.id ORDER BY p.id').all()

    // Load pathways for per-persona stats (stages column may not exist yet)
    let allPathways: any[] = []
    let hasStagesColumn = false
    try {
      db.prepare("SELECT stages FROM pathways LIMIT 1").get()
      hasStagesColumn = true
    } catch { /* column doesn't exist yet */ }

    if (hasStagesColumn) {
      allPathways = db.prepare('SELECT id, target_persona, stages, name, active FROM pathways').all() as any[]
    } else {
      allPathways = db.prepare('SELECT id, target_persona, name, active FROM pathways').all() as any[]
    }

    // Also check pathway_stages table for stage data
    let pathwayStages: any[] = []
    try {
      pathwayStages = db.prepare('SELECT pathway_id, module_ids FROM pathway_stages').all() as any[]
    } catch { /* table may not exist */ }

    // Load module data for duration calcs
    const allModules = db.prepare('SELECT id, duration_m, domain, skill_id FROM modules').all() as any[]
    const moduleMap = new Map(allModules.map(m => [m.id, m]))

    // Load domain skill counts
    const domainSkillCounts = db.prepare(`
      SELECT d.id as domain_id, COUNT(s.id) as skill_count
      FROM taxonomy_domains d
      LEFT JOIN taxonomy_subdomains sub ON sub.domain_id = d.id
      LEFT JOIN taxonomy_skills s ON s.subdomain_id = sub.id
      GROUP BY d.id
    `).all() as any[]
    const skillCountMap = new Map(domainSkillCounts.map(d => [d.domain_id, d.skill_count]))

    // Count modules per domain
    const domainModuleCounts = db.prepare(`
      SELECT domain, COUNT(*) as module_count FROM modules GROUP BY domain
    `).all() as any[]
    const moduleCountMap = new Map(domainModuleCounts.map(d => [d.domain, d.module_count]))

    const parsed = personas.map((p: any) => {
      const weights = JSON.parse(p.domain_weights || '{}')
      const primaryDomains = JSON.parse(p.primary_domains || '[]')

      // Pathways targeting this persona
      const personaPathways = allPathways.filter(pw => pw.target_persona === p.id)

      // Module IDs from pathway learn blocks (try JSON stages column first, then pathway_stages table)
      let totalModuleIds: string[] = []
      personaPathways.forEach(pw => {
        // Try stages JSON column
        if (pw.stages) {
          try {
            const stages = JSON.parse(pw.stages || '[]')
            stages.forEach((s: any) => {
              if (s.type === 'learn' && s.module_ids) {
                totalModuleIds = [...totalModuleIds, ...s.module_ids]
              }
            })
          } catch { /* ignore */ }
        }
        // Also check pathway_stages table
        const stageRows = pathwayStages.filter(s => s.pathway_id === pw.id)
        stageRows.forEach(s => {
          try {
            const mids = JSON.parse(s.module_ids || '[]')
            totalModuleIds = [...totalModuleIds, ...mids]
          } catch { /* ignore */ }
        })
      })

      // Deduplicate module IDs
      const uniqueModuleIds = [...new Set(totalModuleIds)]
      const totalMinutes = uniqueModuleIds.reduce((sum, id) => {
        const mod = moduleMap.get(id)
        return sum + (mod?.duration_m ?? 0)
      }, 0)

      // Domain skill counts for Intelligence Map
      const domainStats: Record<string, { skills: number; modules: number }> = {}
      const DOMAINS = ['ai_essentials','data_science','mlops','responsible_ai','prompt_engineering','cloud_ai','ai_strategy','ai_security']
      DOMAINS.forEach(d => {
        domainStats[d] = {
          skills: skillCountMap.get(d) ?? 0,
          modules: moduleCountMap.get(d) ?? 0,
        }
      })

      return {
        ...p,
        domain_weights: weights,
        primary_domains: primaryDomains,
        // Enriched stats
        pathway_count: personaPathways.length,
        pathways_summary: personaPathways.map(pw => {
          let stageCount = 0
          if (pw.stages) {
            try { stageCount = JSON.parse(pw.stages || '[]').length } catch { /* ignore */ }
          }
          if (stageCount === 0) {
            stageCount = pathwayStages.filter(s => s.pathway_id === pw.id).length
          }
          return { id: pw.id, name: pw.name, active: pw.active, stage_count: stageCount }
        }),
        total_modules: uniqueModuleIds.length,
        total_hours: Math.round((totalMinutes / 60) * 10) / 10,
        domain_stats: domainStats,
      }
    })
    return NextResponse.json({ personas: parsed })
  } finally { db.close() }
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, label, emoji, subtitle, description, color, domain_weights, sage_modifier, scout_modifier } = body
  const db = getDB()
  try {
    db.prepare(`UPDATE personas SET label=COALESCE(?,label), emoji=COALESCE(?,emoji), subtitle=COALESCE(?,subtitle), description=COALESCE(?,description), color=COALESCE(?,color), domain_weights=COALESCE(?,domain_weights), sage_modifier=COALESCE(?,sage_modifier), scout_modifier=COALESCE(?,scout_modifier) WHERE id=?`).run(label, emoji, subtitle, description, color, domain_weights ? JSON.stringify(domain_weights) : null, sage_modifier, scout_modifier, id)
    return NextResponse.json({ ok: true })
  } finally { db.close() }
}
