'use client'
// src/app/learn/layout.tsx — Learner App shell with animated bottom nav
import { SessionProvider } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Home, BookOpen, Sparkles, User, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScalePress } from '@/components/Learn/motion/ScalePress'

const NAV = [
  { href: '/learn',         label: 'Home',    Icon: Home },
  { href: '/learn/library', label: 'Learn',   Icon: BookOpen },
  { href: '/learn/mentor',  label: 'Sage',    Icon: Sparkles },
  { href: '/learn/profile', label: 'Profile', Icon: User },
]

function Clock() {
  const [time, setTime] = useState<string>('')
  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    const id = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 60_000)
    return () => clearInterval(id)
  }, [])
  return <span>{time}</span>
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = ['/learn/login', '/learn/register', '/learn/start'].some(p => pathname.startsWith(p))

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col max-w-[430px] mx-auto relative">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] font-mono text-white/30 flex-shrink-0">
        <Clock />
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-[#4F8EF7]" />
          <div className="w-1 h-1 rounded-full bg-[#A78BFA]" />
          <div className="w-1 h-1 rounded-full bg-[#00E5A0]" />
        </div>
      </div>

      {/* Top header with back button on sub-pages */}
      {!hideNav && pathname !== '/learn' && (
        <div className="flex items-center gap-3 px-4 py-2">
          <Link href="/learn" className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-colors">
            <ArrowLeft size={16} className="text-white/60" />
          </Link>
          <span className="text-[12px] font-semibold text-white/50 capitalize">
            {pathname.split('/').pop()?.replace(/-/g, ' ')}
          </span>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${hideNav ? '' : 'pb-24'}`}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.div>
      </div>

      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
          <div className="mx-3 mb-3 rounded-2xl bg-[#13131a]/90 backdrop-blur-xl border border-white/[0.06] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-around px-2 py-2.5">
              {NAV.map(({ href, label, Icon }) => {
                const active = pathname === href || (href !== '/learn' && pathname.startsWith(href))
                return (
                  <ScalePress key={href} scale={0.92}>
                    <Link href={href} className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 relative">
                      {active && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl bg-[#4F8EF7]/10"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon
                        size={20}
                        className={`relative z-10 transition-colors duration-200 ${active ? 'text-[#4F8EF7]' : 'text-white/25'}`}
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                      <span className={`relative z-10 text-[9px] font-bold tracking-wider uppercase transition-colors duration-200 ${active ? 'text-[#4F8EF7]' : 'text-white/25'}`}>
                        {label}
                      </span>
                    </Link>
                  </ScalePress>
                )
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  )
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  )
}
