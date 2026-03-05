'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { ICON_MAP } from './IconSelector'

// ── Types ──────────────────────────────────────
export interface Domain { id: string; name: string; emoji: string; color: string; description: string; benchmark: number; weight: number; sort_order?: number }
export interface Subdomain { id: string; domain_id: string; name: string; description: string; sort_order?: number }
export interface Skill { id: string; subdomain_id: string; name: string; description: string; sort_order?: number }

interface Props {
  domains: Domain[]
  subdomains: Subdomain[]
  skills: Skill[]
  selectedId: string | null
  onSelect: (type: 'domain' | 'subdomain' | 'skill', id: string) => void
  onAdd: (type: 'subdomain' | 'skill', parentId: string) => void
}

// ── Layout constants ───────────────────────────
const COL_WIDTH = 200
const COL_GAP = 120
const NODE_H = 52
const NODE_GAP = 10
const PADDING = 32
const SKILL_NODE_H = 36
const GROUP_GAP = 24

// ── Node position calculator ───────────────────
interface NodePos { x: number; y: number; w: number; h: number; color: string }

function useLayout(domains: Domain[], subdomains: Subdomain[], skills: Skill[]) {
  return useMemo(() => {
    const positions = new Map<string, NodePos>()
    let domainY = PADDING

    for (const domain of domains) {
      const color = domain.color || '#d65cc6'
      const domSubs = subdomains.filter(s => s.domain_id === domain.id)

      let subY = domainY
      for (const sub of domSubs) {
        const subSkills = skills.filter(s => s.subdomain_id === sub.id)

        positions.set(sub.id, {
          x: PADDING + COL_WIDTH + COL_GAP,
          y: subY,
          w: COL_WIDTH,
          h: NODE_H,
          color,
        })

        let skillY = subY
        for (const skill of subSkills) {
          positions.set(skill.id, {
            x: PADDING + (COL_WIDTH + COL_GAP) * 2,
            y: skillY,
            w: COL_WIDTH,
            h: SKILL_NODE_H,
            color,
          })
          skillY += SKILL_NODE_H + NODE_GAP
        }

        subY = Math.max(subY + NODE_H + NODE_GAP, skillY)
      }

      const domainHeight = Math.max(subY - domainY - NODE_GAP, NODE_H)
      positions.set(domain.id, {
        x: PADDING,
        y: domainY + (domainHeight - NODE_H) / 2,
        w: COL_WIDTH,
        h: NODE_H,
        color,
      })

      domainY += domainHeight + GROUP_GAP
    }

    const totalW = PADDING * 2 + COL_WIDTH * 3 + COL_GAP * 2
    const totalH = domainY + PADDING

    return { positions, totalW, totalH }
  }, [domains, subdomains, skills])
}

// ── SVG connection path with glow ────────────────────────
function ConnectionPath({ from, to, color }: { from: NodePos; to: NodePos; color: string }) {
  const x1 = from.x + from.w
  const y1 = from.y + from.h / 2
  const x2 = to.x
  const y2 = to.y + to.h / 2
  const cpx = (x1 + x2) / 2

  return (
    <g>
      {/* Glow layer */}
      <path
        d={`M ${x1} ${y1} C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeOpacity={0.08}
        filter="url(#connGlow)"
      />
      {/* Main line */}
      <path
        d={`M ${x1} ${y1} C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.25}
        className="transition-all duration-300"
      />
    </g>
  )
}

// ── Node component ─────────────────────────────
function GraphNode({
  id, label, icon, color, pos, type, selected, childCount, onSelect, onAdd,
}: {
  id: string; label: string; icon?: string; color: string; pos: NodePos
  type: 'domain' | 'subdomain' | 'skill'
  selected: boolean; childCount?: number
  onSelect: () => void; onAdd?: () => void
}) {
  const IconComp = icon && ICON_MAP[icon] ? ICON_MAP[icon] : null

  return (
    <div
      className={`absolute group cursor-pointer transition-all duration-200 select-none ${
        selected
          ? 'z-10 scale-[1.03]'
          : 'hover:z-10 hover:scale-[1.02]'
      }`}
      style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
      onClick={onSelect}
    >
      <div
        className={`relative h-full rounded-2xl border overflow-hidden flex items-center gap-2.5 transition-all duration-300 ${
          type === 'skill' ? 'px-3' : 'px-3.5'
        } ${selected ? 'studio-node-glow' : ''}`}
        style={{
          background: selected ? `${color}12` : 'var(--studio-bg-card)',
          borderColor: selected ? `${color}60` : 'var(--studio-border)',
          boxShadow: selected
            ? `0 0 24px ${color}20, var(--studio-shadow-sm)`
            : 'var(--studio-shadow-sm)',
          ['--glow-color' as any]: `${color}30`,
        }}
      >
        {/* Color accent stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
          style={{ background: color }}
        />

        {/* Icon or dot */}
        {type === 'domain' && IconComp ? (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18` }}>
            <IconComp className="w-3.5 h-3.5" style={{ color }} />
          </div>
        ) : type === 'domain' && icon ? (
          <span className="text-base flex-shrink-0">{icon}</span>
        ) : type === 'skill' ? (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: `${color}50` }} />
        ) : (
          <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: `${color}80` }} />
        )}

        {/* Label */}
        <span className={`truncate ${
          type === 'domain' ? 'text-[12px] font-semibold' :
          type === 'subdomain' ? 'text-[11.5px] font-medium' :
          'text-[11px]'
        }`} style={{
          color: type === 'domain' ? 'var(--studio-dune)'
               : type === 'subdomain' ? 'var(--studio-sand)'
               : 'var(--studio-dust)',
        }}>
          {label}
        </span>

        {/* Child count badge */}
        {childCount !== undefined && childCount > 0 && (
          <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: `${color}15`, color: `${color}BB` }}>
            {childCount}
          </span>
        )}

        {/* Add child button */}
        {onAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAdd() }}
            className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: color, color: '#fff', boxShadow: `0 2px 8px ${color}40` }}
            title={type === 'domain' ? 'Add subdomain' : 'Add skill'}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main graph component ───────────────────────
export default function TaxonomyGraph({ domains, subdomains, skills, selectedId, onSelect, onAdd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { positions, totalW, totalH } = useLayout(domains, subdomains, skills)

  const connections: { from: string; to: string; color: string }[] = []
  for (const domain of domains) {
    const color = domain.color || '#d65cc6'
    const domSubs = subdomains.filter(s => s.domain_id === domain.id)
    for (const sub of domSubs) {
      connections.push({ from: domain.id, to: sub.id, color })
      const subSkills = skills.filter(s => s.subdomain_id === sub.id)
      for (const skill of subSkills) {
        connections.push({ from: sub.id, to: skill.id, color })
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto studio-scroll"
      style={{ background: 'var(--studio-bg)' }}>
      {/* Warm dot grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(219,197,169,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Column headers */}
      <div className="sticky top-0 z-20 flex gap-0 px-8 py-3 backdrop-blur-sm"
        style={{
          background: 'rgba(32,24,40,0.92)',
          borderBottom: '1px solid var(--studio-border)',
        }}>
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase"
          style={{ width: COL_WIDTH, marginRight: COL_GAP, color: 'var(--studio-dust)' }}>Domains</span>
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase"
          style={{ width: COL_WIDTH, marginRight: COL_GAP, color: 'var(--studio-dust)' }}>Subdomains</span>
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase"
          style={{ width: COL_WIDTH, color: 'var(--studio-dust)' }}>Skills</span>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ width: totalW, minHeight: totalH }}>
        {/* SVG connections with glow filter */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: totalW, height: totalH }}>
          <defs>
            <filter id="connGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {connections.map(({ from, to, color }) => {
            const fromPos = positions.get(from)
            const toPos = positions.get(to)
            if (!fromPos || !toPos) return null
            return <ConnectionPath key={`${from}-${to}`} from={fromPos} to={toPos} color={color} />
          })}
        </svg>

        {/* Domain nodes */}
        {domains.map(domain => {
          const pos = positions.get(domain.id)
          if (!pos) return null
          const childCount = subdomains.filter(s => s.domain_id === domain.id).length
          return (
            <GraphNode
              key={domain.id}
              id={domain.id}
              label={domain.name}
              icon={domain.emoji}
              color={domain.color || '#d65cc6'}
              pos={pos}
              type="domain"
              selected={selectedId === domain.id}
              childCount={childCount}
              onSelect={() => onSelect('domain', domain.id)}
              onAdd={() => onAdd('subdomain', domain.id)}
            />
          )
        })}

        {/* Subdomain nodes */}
        {subdomains.map(sub => {
          const pos = positions.get(sub.id)
          if (!pos) return null
          const childCount = skills.filter(s => s.subdomain_id === sub.id).length
          return (
            <GraphNode
              key={sub.id}
              id={sub.id}
              label={sub.name}
              color={pos.color}
              pos={pos}
              type="subdomain"
              selected={selectedId === sub.id}
              childCount={childCount}
              onSelect={() => onSelect('subdomain', sub.id)}
              onAdd={() => onAdd('skill', sub.id)}
            />
          )
        })}

        {/* Skill nodes */}
        {skills.map(skill => {
          const pos = positions.get(skill.id)
          if (!pos) return null
          return (
            <GraphNode
              key={skill.id}
              id={skill.id}
              label={skill.name}
              color={pos.color}
              pos={pos}
              type="skill"
              selected={selectedId === skill.id}
              onSelect={() => onSelect('skill', skill.id)}
            />
          )
        })}

        {/* Empty state */}
        {domains.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px]"
            style={{ color: 'var(--studio-ash)' }}>
            No taxonomy data yet
          </div>
        )}
      </div>
    </div>
  )
}
