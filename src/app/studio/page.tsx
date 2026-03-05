'use client'
// src/app/studio/page.tsx — Workera-inspired warm dashboard
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { Users, TrendingUp, Award, AlertCircle, Bot, Layers, UserCircle, Route, Sparkles, Loader2, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  spark: '#EF6461', build: '#fac957', lead: '#4ECDC4', apex: '#d65cc6',
}
const TIER_LABELS = ['spark', 'build', 'lead', 'apex'] as const

/* ── Circular gauge SVG ── */
function CircularGauge({ value, max, color, size = 48 }: { value: number; max: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const progress = Math.min(value / (max || 1), 1)
  const offset = circ * (1 - progress)
  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} className="studio-gauge-track" />
      <circle cx={size / 2} cy={size / 2} r={r} className="studio-gauge-fill"
        stroke={color} strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  )
}

/* ── Hero stat card ── */
function HeroStat({ label, value, icon: Icon, color, gauge, delay }: {
  label: string; value: string | number; icon: any; color: string
  gauge?: { value: number; max: number }; delay: number
}) {
  return (
    <div className="studio-card p-6 studio-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {gauge && <CircularGauge value={gauge.value} max={gauge.max} color={color} />}
      </div>
      <div className="studio-hero-number" style={{ color }}>{value}</div>
      <div className="text-[13px] mt-1.5" style={{ color: 'var(--studio-dust)' }}>{label}</div>
    </div>
  )
}

const tooltipStyle = {
  contentStyle: {
    background: '#2a1f33', border: '1px solid rgba(219,197,169,0.15)',
    borderRadius: 12, fontSize: 13, color: '#f3ece2',
    boxShadow: '0 4px 20px rgba(26,18,32,0.5)',
  },
  labelStyle: { color: '#a89480', fontSize: 11, marginBottom: 4 },
  itemStyle: { fontSize: 12 },
}

export default function StudioDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // AI Insights state
  const [insights, setInsights] = useState<any[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  const loadInsights = async () => {
    setInsightsLoading(true)
    setInsightsError('')
    try {
      const res = await fetch('/api/studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-scores' }),
      })
      const data = await res.json()
      if (res.ok) setInsights(data.insights ?? [])
      else setInsightsError(data.error ?? 'Failed to generate insights')
    } catch { setInsightsError('Network error — is an LLM provider configured?') }
    setInsightsLoading(false)
  }

  useEffect(() => {
    fetch('/api/studio/overview')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const stats = data?.stats ?? {}
  const sessions = data?.recentSessions ?? []
  const domainStats = data?.domainStats ?? []
  const activityTrend = data?.activityTrend ?? []

  const barData = domainStats.map((d: any) => ({
    domain: (d.domain ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    Spark: d.spark_count ?? 0, Build: d.build_count ?? 0,
    Lead: d.lead_count ?? 0, Apex: d.apex_count ?? 0,
  }))

  const lineData = activityTrend.map((d: any) => ({
    day: d.day?.slice(5) ?? '', assessments: d.count ?? 0,
  }))

  const pieData = TIER_LABELS.map(tier => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value: domainStats.reduce((sum: number, d: any) => sum + (d[`${tier}_count`] ?? 0), 0),
  })).filter(d => d.value > 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[26px] font-light tracking-tight" style={{ color: 'var(--studio-dune)' }}>
            Studio Overview
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--studio-dust)' }}>
            Frugal AI L&D Control Panel
          </p>
        </div>
        <Link href="/studio/access" className="studio-btn-primary">+ Invite Admin</Link>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <HeroStat label="Active Learners" value={loading ? '...' : stats.activeLearners ?? 0}
          icon={Users} color="#d65cc6" delay={0}
          gauge={{ value: stats.activeLearners ?? 0, max: stats.totalLearners || 1 }} />
        <HeroStat label="Total Learners" value={loading ? '...' : stats.totalLearners ?? 0}
          icon={TrendingUp} color="#fac957" delay={80} />
        <HeroStat label="Avg Domain Score" value={loading ? '...' : stats.avgScore ?? 0}
          icon={Award} color="#4ECDC4" delay={160}
          gauge={{ value: stats.avgScore ?? 0, max: 300 }} />
        <HeroStat label="Open Appeals" value={loading ? '...' : stats.openAppeals ?? 0}
          icon={AlertCircle} color="#ff9412" delay={240} />
      </div>

      {/* AI Insights */}
      <div className="studio-card p-6 mb-8 studio-fade-up" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(250,201,87,0.12)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--studio-gold)' }} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--studio-dune)' }}>AI Insights</h2>
              <p className="text-[10px]" style={{ color: 'var(--studio-dust)' }}>Intelligent analysis of platform health</p>
            </div>
          </div>
          <button onClick={loadInsights} disabled={insightsLoading}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors duration-200 disabled:opacity-40"
            style={{ color: 'var(--studio-gold)', background: 'rgba(250,201,87,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,201,87,0.08)' }}>
            {insightsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {insights.length > 0 ? 'Refresh' : 'Generate Insights'}
          </button>
        </div>

        {insightsLoading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-[12px]" style={{ color: 'var(--studio-dust)' }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--studio-gold)' }} />
            Analyzing platform data...
          </div>
        ) : insightsError ? (
          <div className="text-center py-4 text-[12px]" style={{ color: '#EF6461' }}>{insightsError}</div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight, i) => {
              const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
                warning: { icon: AlertTriangle, color: '#EF6461', bg: 'rgba(239,100,97,0.06)' },
                success: { icon: TrendingUp, color: '#4ECDC4', bg: 'rgba(78,205,196,0.06)' },
                info: { icon: Lightbulb, color: '#fac957', bg: 'rgba(250,201,87,0.06)' },
              }
              const cfg = typeConfig[insight.type] || typeConfig.info
              const InsightIcon = cfg.icon
              return (
                <div key={i} className="p-4 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-start gap-2 mb-2">
                    <InsightIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                    <div>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--studio-dune)' }}>{insight.title}</div>
                      {insight.metric && (
                        <span className="text-[10px] font-mono font-bold" style={{ color: cfg.color }}>{insight.metric}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--studio-sand)' }}>{insight.body}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-[12px]" style={{ color: 'var(--studio-ash)' }}>
            Click &ldquo;Generate Insights&rdquo; to analyze your platform data with AI
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Stacked bar */}
        <div className="col-span-2 studio-card p-6">
          <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>
            Tier Distribution by Domain
          </h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(219,197,169,0.06)" />
                <XAxis dataKey="domain" tick={{ fontSize: 11, fill: '#a89480' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b5c6b' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="Spark" stackId="tier" fill={TIER_COLORS.spark} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Build" stackId="tier" fill={TIER_COLORS.build} />
                <Bar dataKey="Lead"  stackId="tier" fill={TIER_COLORS.lead} />
                <Bar dataKey="Apex"  stackId="tier" fill={TIER_COLORS.apex} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[230px] flex items-center justify-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
              No assessment data yet
            </div>
          )}
          <div className="flex gap-5 mt-3">
            {TIER_LABELS.map(tier => (
              <div key={tier} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--studio-dust)' }}>
                <div className="w-3 h-3 rounded" style={{ background: TIER_COLORS[tier] }} />
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Pie */}
        <div className="studio-card p-6">
          <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>
            Overall Tier Split
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={TIER_COLORS[entry.name.toLowerCase()] ?? '#666'} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[230px] flex items-center justify-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
              No data
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--studio-dust)' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLORS[d.name.toLowerCase()] }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Recent */}
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="studio-card p-6">
          <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>
            Assessment Activity (30 days)
          </h2>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(219,197,169,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b5c6b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b5c6b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="assessments" stroke="#d65cc6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[190px] flex items-center justify-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
              No activity data yet
            </div>
          )}
        </div>

        <div className="studio-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--studio-border)' }}>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--studio-dune)' }}>Recent Assessments</h2>
            <Link href="/studio/scores" className="text-[11px]" style={{ color: 'var(--studio-orchid)' }}>View All</Link>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--studio-border)' }}>
                {['Learner', 'Domain', 'Score', 'Tier'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase"
                    style={{ color: 'var(--studio-dust)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--studio-ash)' }}>
                  No assessments yet
                </td></tr>
              )}
              {sessions.slice(0, 6).map((s: any) => {
                const tier = s.final_tier ?? 'spark'
                return (
                  <tr key={s.id} className="transition-colors duration-200"
                    style={{ borderBottom: '1px solid rgba(219,197,169,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,92,198,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <td className="px-5 py-2.5 text-[12px] font-medium" style={{ color: 'var(--studio-dune)' }}>{s.learner_name}</td>
                    <td className="px-5 py-2.5 text-[12px] capitalize" style={{ color: 'var(--studio-dust)' }}>{s.domain?.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-2.5 font-mono text-[12px]" style={{ color: TIER_COLORS[tier] }}>{s.final_score}</td>
                    <td className="px-5 py-2.5">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize"
                        style={{ background: `${TIER_COLORS[tier]}18`, color: TIER_COLORS[tier] }}>
                        {tier}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { href: '/studio/agents',   label: 'Configure Agents',  Icon: Bot,        color: '#d65cc6' },
          { href: '/studio/taxonomy', label: 'Taxonomy Builder',   Icon: Layers,     color: '#4ECDC4' },
          { href: '/studio/personas', label: 'Manage Personas',    Icon: UserCircle, color: '#fac957' },
          { href: '/studio/pathways', label: 'Build Pathways',     Icon: Route,      color: '#923586' },
        ].map(({ href, label, Icon, color }, i) => (
          <Link key={href} href={href}
            className="studio-card flex items-center gap-3.5 p-5 group studio-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: `${color}15` }}>
              <Icon className="w-4.5 h-4.5" style={{ color }} />
            </div>
            <span className="text-[13px] font-medium transition-colors duration-200"
              style={{ color: 'var(--studio-sand)' }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
