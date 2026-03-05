'use client'
import {
  Brain, Cpu, Shield, Cloud, Rocket, Zap,
  Target, BookOpen, Code, Database, Eye, Lock,
  Lightbulb, BarChart3, GitBranch, Layers,
  Globe, Award, Puzzle, Gauge, Workflow,
  MessageSquare, Sparkles, GraduationCap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  Brain, Cpu, Shield, Cloud, Rocket, Zap,
  Target, BookOpen, Code, Database, Eye, Lock,
  Lightbulb, BarChart3, GitBranch, Layers,
  Globe, Award, Puzzle, Gauge, Workflow,
  MessageSquare, Sparkles, GraduationCap,
}

interface Props {
  value: string
  onChange: (iconName: string) => void
  accentColor?: string
}

export default function IconSelector({ value, onChange, accentColor = '#d65cc6' }: Props) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {Object.entries(ICON_MAP).map(([name, Icon]) => {
        const selected = value === name
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200"
            style={selected ? {
              background: `${accentColor}18`,
              boxShadow: `0 0 0 2px ${accentColor}, 0 0 12px ${accentColor}25`,
            } : {}}
            onMouseEnter={e => {
              if (!selected) {
                e.currentTarget.style.background = 'rgba(219,197,169,0.08)'
              }
            }}
            onMouseLeave={e => {
              if (!selected) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <Icon className="w-4 h-4" style={{ color: selected ? accentColor : 'var(--studio-ash)' }} />
          </button>
        )
      })}
    </div>
  )
}
