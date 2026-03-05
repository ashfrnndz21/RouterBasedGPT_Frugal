'use client'
// src/app/studio/settings/page.tsx — Warm Workera-inspired platform settings
import { useState } from 'react'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState({
    platformName: 'Frugal AI',
    benchmarkScore: 201,
    minQuestions: 5,
    maxQuestions: 20,
    stableTurns: 5,
    allowVoice: true,
    allowSkip: true,
    streakEnabled: true,
    catEnabled: true,
  })

  const save = async () => {
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof typeof config; type?: string }) => (
    <div>
      <label className="studio-label">{label}</label>
      {type === 'checkbox' ? (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={!!config[field]} onChange={e => setConfig(p => ({ ...p, [field]: e.target.checked }))}
            className="w-4 h-4 rounded" style={{ accentColor: 'var(--studio-orchid)' }} />
          <span className="text-[12px]" style={{ color: 'var(--studio-sand)' }}>
            {config[field] ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      ) : (
        <input type={type} value={config[field] as any} onChange={e => setConfig(p => ({ ...p, [field]: type === 'number' ? +e.target.value : e.target.value }))}
          className="studio-input" />
      )}
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(219,197,169,0.1)' }}>
            <Settings className="w-4.5 h-4.5" style={{ color: 'var(--studio-sand)' }} />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-light tracking-tight"
              style={{ color: 'var(--studio-dune)' }}>Platform Settings</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--studio-dust)' }}>
              CAT engine config, scoring system, and platform toggles
            </p>
          </div>
        </div>
        <button onClick={save} className="studio-btn-primary">
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-5">
          <div className="studio-card p-6">
            <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>Platform</h2>
            <div className="flex flex-col gap-4">
              <Field label="Platform Name" field="platformName" />
              <Field label="Benchmark Score (0-300)" field="benchmarkScore" type="number" />
            </div>
          </div>

          <div className="studio-card p-6">
            <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>CAT Engine</h2>
            <div className="flex flex-col gap-4">
              <Field label="Min Questions per Session" field="minQuestions" type="number" />
              <Field label="Max Questions per Session" field="maxQuestions" type="number" />
              <Field label="Stable Turns to Stop" field="stableTurns" type="number" />
              <Field label="Adaptive CAT" field="catEnabled" type="checkbox" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="studio-card p-6">
            <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>Toggles</h2>
            <div className="flex flex-col gap-4">
              <Field label="Voice Assessment" field="allowVoice" type="checkbox" />
              <Field label="Allow Skip Questions" field="allowSkip" type="checkbox" />
              <Field label="Streak Tracking" field="streakEnabled" type="checkbox" />
            </div>
          </div>

          <div className="studio-card p-6">
            <h2 className="text-[14px] font-semibold mb-5" style={{ color: 'var(--studio-dune)' }}>Tier Definitions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Spark (0-100)', '#EF6461'],
                ['Build (101-200)', '#fac957'],
                ['Lead (201-299)', '#4ECDC4'],
                ['Apex (300)', '#d65cc6'],
              ].map(([tier, color]) => (
                <div key={tier} className="px-4 py-3 rounded-xl border"
                  style={{ borderColor: `${color}25`, background: `${color}08` }}>
                  <div className="text-[12px] font-bold" style={{ color }}>{tier}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="studio-card p-6">
            <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--studio-dune)' }}>Integrations</h2>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Amazon Bedrock', status: true, detail: 'claude-sonnet-4-6 · granite4:micro' },
                { name: 'Coursera API', status: false, detail: 'Not configured' },
                { name: 'AWS Training', status: false, detail: 'Not configured' },
                { name: 'Google OAuth', status: !!process.env.GOOGLE_CLIENT_ID, detail: 'Configured via env' },
              ].map(({ name, status, detail }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: status ? '#4ECDC4' : 'var(--studio-ash)' }} />
                  <div className="flex-1">
                    <div className="text-[12px]" style={{ color: 'var(--studio-sand)' }}>{name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--studio-ash)' }}>{detail}</div>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: status ? '#4ECDC4' : 'var(--studio-ash)' }}>
                    {status ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
