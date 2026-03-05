'use client'
// src/components/Learn/DragOrder.tsx
// Framer-motion powered drag-and-drop ordering with spring physics
import { useState } from 'react'
import { Reorder, motion } from 'framer-motion'
import { ScalePress } from '@/components/Learn/motion/ScalePress'

interface Props {
  items: string[]
  onSubmit: (orderedItems: string[]) => void
  disabled?: boolean
}

export default function DragOrder({ items: initialItems, onSubmit, disabled }: Props) {
  const [order, setOrder] = useState([...initialItems])

  return (
    <div className="flex flex-col gap-1">
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={disabled ? () => {} : setOrder}
        className="flex flex-col gap-1"
      >
        {order.map((item, idx) => (
          <Reorder.Item
            key={item}
            value={item}
            drag={!disabled ? 'y' : false}
            dragListener={!disabled}
            onDragStart={() => navigator?.vibrate?.(10)}
            whileDrag={{
              scale: 1.03,
              boxShadow: '0 8px 24px rgba(79,142,247,0.15)',
              borderColor: 'rgba(79,142,247,0.5)',
              backgroundColor: 'rgba(79,142,247,0.08)',
              zIndex: 50,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-center gap-3 p-3 rounded-xl border select-none ${
              disabled
                ? 'border-white/[0.08] bg-[#1c1c26] cursor-default'
                : 'border-white/[0.08] bg-[#1c1c26] cursor-grab active:cursor-grabbing hover:border-white/20'
            }`}
            style={{ position: 'relative' }}
          >
            <div className="flex flex-col gap-0.5 opacity-30 flex-shrink-0">
              <div className="w-4 h-px bg-white" /><div className="w-4 h-px bg-white" /><div className="w-4 h-px bg-white" />
            </div>
            <motion.span
              layout
              className="w-6 h-6 rounded bg-white/[0.06] flex items-center justify-center text-[11px] font-mono text-white/40 flex-shrink-0"
            >
              {idx + 1}
            </motion.span>
            <span className="text-[12px] text-white/80 leading-relaxed">{item}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {!disabled && (
        <ScalePress>
          <button
            onClick={() => onSubmit(order)}
            className="mt-3 w-full bg-[#4F8EF7] text-white font-bold text-[13px] py-3 rounded-xl hover:bg-[#3a7de8] transition-colors"
          >
            Submit Order →
          </button>
        </ScalePress>
      )}
    </div>
  )
}
