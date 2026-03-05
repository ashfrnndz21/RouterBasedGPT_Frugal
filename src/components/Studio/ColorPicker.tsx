'use client'
import { Check } from 'lucide-react'

const PALETTE = [
  { name: 'Orchid',   hex: '#d65cc6' },
  { name: 'Plum',     hex: '#923586' },
  { name: 'Grape',    hex: '#3c1638' },
  { name: 'Gold',     hex: '#fac957' },
  { name: 'Orange',   hex: '#ff9412' },
  { name: 'Coral',    hex: '#EF6461' },
  { name: 'Rose',     hex: '#EC4899' },
  { name: 'Teal',     hex: '#4ECDC4' },
  { name: 'Sky',      hex: '#7EC8E3' },
  { name: 'Sage',     hex: '#6BCB77' },
  { name: 'Sand',     hex: '#dbc5a9' },
  { name: 'Midnight', hex: '#291b36' },
]

interface Props {
  value: string
  onChange: (hex: string) => void
}

export default function ColorPicker({ value, onChange }: Props) {
  const normalized = value?.toLowerCase()

  return (
    <div className="grid grid-cols-6 gap-2.5">
      {PALETTE.map(c => {
        const selected = normalized === c.hex.toLowerCase()
        return (
          <button
            key={c.hex}
            type="button"
            onClick={() => onChange(c.hex)}
            title={c.name}
            className="group relative w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none"
            style={{
              background: c.hex,
              boxShadow: selected
                ? `0 0 0 2px var(--studio-bg-card), 0 0 0 4px ${c.hex}, 0 0 12px ${c.hex}40`
                : '0 2px 4px rgba(26,18,32,0.3)',
            }}
          >
            {selected && (
              <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-md" />
            )}
          </button>
        )
      })}
    </div>
  )
}
