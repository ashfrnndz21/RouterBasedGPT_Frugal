'use client'
// src/app/learn/start/page.tsx - Persona onboarding with staggered animations
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { StaggerList } from '@/components/Learn/motion/StaggerList'
import { ScalePress } from '@/components/Learn/motion/ScalePress'
import { FadeIn } from '@/components/Learn/motion/FadeIn'

const PERSONAS = [
  {
    id: 'builder', label: 'Builder', emoji: '👨‍💻', subtitle: 'Dev / ML Engineer',
    description: 'You build things with AI — APIs, models, pipelines. Technical depth is your thing.',
    color: '#4F8EF7', gradient: 'from-[#4F8EF7]/20 to-[#7C3AED]/10',
  },
  {
    id: 'analyst', label: 'Analyst', emoji: '📊', subtitle: 'Data / Business Analyst',
    description: 'You work with data to find insights. More SQL and dashboards than neural networks.',
    color: '#00E5A0', gradient: 'from-[#00E5A0]/20 to-[#059669]/10',
  },
  {
    id: 'strategist', label: 'Strategist', emoji: '🏢', subtitle: 'Executive / Product Lead',
    description: 'You make decisions about AI investment, governance, and roadmap. ROI matters to you.',
    color: '#F0A500', gradient: 'from-[#F0A500]/20 to-[#D97706]/10',
  },
  {
    id: 'explorer', label: 'Explorer', emoji: '🧑‍🎓', subtitle: 'Student / Career Changer',
    description: 'You\'re new to AI and excited to learn. Start from first principles.',
    color: '#A78BFA', gradient: 'from-[#A78BFA]/20 to-[#7C3AED]/10',
  },
]

export default function StartPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const learnerId = (session?.user as any)?.learnerId

  const handleSave = async () => {
    if (!selected || !learnerId) return
    setSaving(true)
    await fetch('/api/learn/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, personaId: selected }),
    })
    router.push('/learn')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-5 py-8">
      <div className="max-w-sm mx-auto">
        <FadeIn delay={0}>
          <div className="flex items-center gap-2 justify-center mb-8">
            <motion.div
              className="w-2 h-2 rounded-full bg-[#4F8EF7] shadow-[0_0_10px_#4F8EF7]"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="font-display text-[15px] font-bold text-white">FRUGAL AI</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="font-display text-[22px] font-bold text-white text-center mb-2">
            What describes you best?
          </h1>
          <p className="text-[12px] text-white/40 text-center mb-7">
            This shapes how Scout and Sage work with you. You can change it anytime.
          </p>
        </FadeIn>

        <StaggerList stagger={0.08} delay={0.2} className="flex flex-col gap-3 mb-6">
          {PERSONAS.map(p => {
            const isSelected = selected === p.id
            return (
              <ScalePress key={p.id}>
                <button onClick={() => setSelected(p.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all bg-gradient-to-br ${p.gradient} ${
                    isSelected ? 'border-current shadow-lg' : 'border-white/[0.07] hover:border-white/20'
                  }`}
                  style={isSelected ? { borderColor: p.color } : {}}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <div className="text-[14px] font-bold text-white">{p.label}</div>
                      <div className="text-[11px]" style={{ color: isSelected ? p.color : 'rgba(255,255,255,0.4)' }}>
                        {p.subtitle}
                      </div>
                    </div>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                          style={{ background: p.color }}
                        >
                          ✓
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-[11px] text-white/60 mt-2 leading-relaxed overflow-hidden"
                      >
                        {p.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </ScalePress>
            )
          })}
        </StaggerList>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ScalePress>
                <button onClick={handleSave} disabled={!selected || saving}
                  className="w-full bg-[#4F8EF7] disabled:opacity-40 text-white font-bold text-[14px] py-3.5 rounded-xl hover:bg-[#3a7de8] transition-colors">
                  {saving ? 'Saving…' : 'Continue →'}
                </button>
              </ScalePress>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
