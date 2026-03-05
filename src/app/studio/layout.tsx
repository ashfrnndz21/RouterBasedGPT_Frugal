// src/app/studio/layout.tsx — Studio shell with Workera-inspired warm design
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Layers, Bot, UserCircle, HelpCircle,
  Route, BarChart3, Users, Shield, Settings, ArrowLeft, BookOpen,
} from 'lucide-react'

const NAV = [
  { section: 'Overview', items: [
    { href: '/studio', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'Configure', items: [
    { href: '/studio/taxonomy',  icon: Layers,     label: 'Taxonomy' },
    { href: '/studio/content',   icon: BookOpen,   label: 'Content' },
    { href: '/studio/agents',    icon: Bot,        label: 'Agents' },
    { href: '/studio/personas',  icon: UserCircle, label: 'Personas' },
    { href: '/studio/pathways',  icon: Route,      label: 'Pathways' },
    { href: '/studio/questions', icon: HelpCircle, label: 'Questions' },
  ]},
  { section: 'Review', items: [
    { href: '/studio/scores',    icon: BarChart3,  label: 'Scores' },
    { href: '/studio/learners',  icon: Users,      label: 'Learners' },
  ]},
  { section: 'Platform', items: [
    { href: '/studio/access',    icon: Shield,     label: 'Access' },
    { href: '/studio/settings',  icon: Settings,   label: 'Settings' },
  ]},
]

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/studio' ? pathname === '/studio' : pathname.startsWith(href)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--studio-bg)', color: 'var(--studio-dune)' }}>
      {/* ── Sidebar ── */}
      <aside
        className="w-[220px] flex-shrink-0 fixed top-0 left-0 bottom-0 overflow-y-auto studio-scroll z-40 flex flex-col"
        style={{ background: 'var(--studio-bg-deep)', borderRight: '1px solid var(--studio-border)' }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--studio-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(214,92,198,0.12)' }}>
              <Layers className="w-3.5 h-3.5" style={{ color: 'var(--studio-orchid)' }} />
            </div>
            <span
              className="font-display text-[20px] tracking-tight"
              style={{ color: 'var(--studio-orchid)', fontWeight: 200 }}
            >
              Studio
            </span>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 py-4 px-3">
          {NAV.map(({ section, items }) => (
            <div key={section} className="mb-4">
              <div
                className="px-3 pb-2 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ color: 'var(--studio-ash)' }}
              >
                {section}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map(({ href, icon: Icon, label }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200"
                      style={{
                        color: active ? 'var(--studio-dune)' : 'var(--studio-ash)',
                        background: active ? 'rgba(214,92,198,0.08)' : 'transparent',
                        borderLeft: active ? '3px solid var(--studio-orchid)' : '3px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.color = 'var(--studio-sand)'
                          e.currentTarget.style.background = 'rgba(214,92,198,0.04)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.color = 'var(--studio-ash)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                      <span className="text-[13px] font-medium">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--studio-border)' }}>
          <Link
            href="/learn"
            className="flex items-center gap-2 text-[12px] transition-colors duration-200"
            style={{ color: 'var(--studio-ash)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--studio-sand)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--studio-ash)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Learner App
          </Link>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="ml-[220px] flex-1 min-h-screen p-8 studio-scroll">
        {children}
      </main>
    </div>
  )
}
