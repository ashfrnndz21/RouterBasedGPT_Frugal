'use client'
// src/app/learn/assess/page.tsx — Domain picker + brief
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Keyboard, Play, Clock } from 'lucide-react'

const DOMAINS = [
  { id: 'ai_essentials',      name: 'AI Essentials',      emoji: '🤖', color: '#4F8EF7', desc: 'Core AI concepts' },
  { id: 'data_science',       name: 'Data Science',       emoji: '📊', color: '#00E5A0', desc: 'Stats & analysis' },
  { id: 'mlops',              name: 'MLOps',              emoji: '⚙️', color: '#EF4444', desc: 'Deploy & monitor' },
  { id: 'responsible_ai',     name: 'Responsible AI',     emoji: '⚖️', color: '#A78BFA', desc: 'Bias & governance' },
  { id: 'prompt_engineering',  name: 'Prompt Engineering', emoji: '✍️', color: '#F0A500', desc: 'LLM techniques' },
  { id: 'cloud_ai',           name: 'Cloud AI',           emoji: '☁️', color: '#22D3EE', desc: 'AWS & managed ML' },
  { id: 'ai_strategy',        name: 'AI Strategy',        emoji: '🗺️', color: '#F471B5', desc: 'Roadmaps & maturity' },
  { id: 'ai_security',        name: 'AI Security',        emoji: '🔒', color: '#FB923C', desc: 'Attacks & defense' },
]

export default function AssessPickPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'typed' | 'voice'>('typed')

  const selectedDomain = DOMAINS.find(d => d.id === selected)

  return (
    <div className="px-5 pb-6">
      <div className="mt-3 mb-5">
        <h1 className="text-[20px] font-bold">Choose a Domain</h1>
        <p className="text-[12px] text-white/40 mt-1">Scout adapts questions to your level in real time</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {DOMAINS.map(d => {
          const isSelected = selected === d.id
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className="relative p-3.5 rounded-xl border text-left transition-all overflow-hidden group"
              style={{
                borderColor: isSelected ? d.color : 'rgba(255,255,255,0.06)',
                backgroundColor: isSelected ? `${d.color}12` : '#13131a',
              }}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-30"
                  style={{ background: d.color }} />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[18px]">{d.emoji}</span>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: d.color }} />
                  )}
                </div>
                <div className="text-[12px] font-semibold text-white leading-tight">{d.name}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock size={10} className="text-white/25" />
                  <span className="text-[10px] text-white/30">~10 min</span>
                </div>
                <div className="text-[9px] text-white/25 mt-0.5">{d.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {selected && selectedDomain && (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
          {/* Mode selector */}
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Response mode</div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('typed')}
                className="flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: mode === 'typed' ? '#4F8EF7' : 'rgba(255,255,255,0.06)',
                  backgroundColor: mode === 'typed' ? 'rgba(79,142,247,0.08)' : '#13131a',
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: mode === 'typed' ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)' }}>
                  <Keyboard size={16} className={mode === 'typed' ? 'text-[#4F8EF7]' : 'text-white/30'} />
                </div>
                <div>
                  <div className="text-[11px] font-bold" style={{ color: mode === 'typed' ? '#4F8EF7' : 'rgba(255,255,255,0.5)' }}>Typed</div>
                  <div className="text-[9px] text-white/25">Text responses</div>
                </div>
              </button>
              <button
                onClick={() => setMode('voice')}
                className="flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: mode === 'voice' ? '#A78BFA' : 'rgba(255,255,255,0.06)',
                  backgroundColor: mode === 'voice' ? 'rgba(167,139,250,0.08)' : '#13131a',
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: mode === 'voice' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)' }}>
                  <Mic size={16} className={mode === 'voice' ? 'text-[#A78BFA]' : 'text-white/30'} />
                </div>
                <div>
                  <div className="text-[11px] font-bold" style={{ color: mode === 'voice' ? '#A78BFA' : 'rgba(255,255,255,0.5)' }}>Voice</div>
                  <div className="text-[9px] text-white/25">Speak with Scout</div>
                </div>
              </button>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={() => router.push(`/learn/assess/${selected}?mode=${mode}`)}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-[14px] py-3.5 rounded-xl transition-all hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${selectedDomain.color}, ${selectedDomain.color}cc)`,
              boxShadow: `0 4px 20px ${selectedDomain.color}30`,
            }}
          >
            <Play size={16} fill="white" />
            Begin Assessment
          </button>
        </div>
      )}
    </div>
  )
}
