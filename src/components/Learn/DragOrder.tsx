'use client'
// src/components/Learn/DragOrder.tsx
// Touch + mouse drag-and-drop ordering — no external deps
import { useState, useRef } from 'react'

interface Props {
  items: string[]
  onSubmit: (orderedItems: string[]) => void
  disabled?: boolean
}

export default function DragOrder({ items: initialItems, onSubmit, disabled }: Props) {
  const [order, setOrder] = useState([...initialItems])
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragNode = useRef<number | null>(null)

  const handleDragStart = (idx: number) => {
    dragNode.current = idx
    setDragging(idx)
  }

  const handleDragEnter = (idx: number) => {
    if (dragNode.current === idx) return
    setDragOver(idx)
    setOrder(prev => {
      const next = [...prev]
      const item = next.splice(dragNode.current!, 1)[0]
      next.splice(idx, 0, item)
      dragNode.current = idx
      return next
    })
  }

  const handleDragEnd = () => {
    setDragging(null)
    setDragOver(null)
    dragNode.current = null
  }

  // Touch support
  const touchStartY = useRef(0)
  const touchIdx = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    touchStartY.current = e.touches[0].clientY
    touchIdx.current = idx
    setDragging(idx)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdx.current === null) return
    e.preventDefault()
    const y = e.touches[0].clientY
    const elements = document.querySelectorAll('[data-drag-item]')
    for (let i = 0; i < elements.length; i++) {
      const rect = elements[i].getBoundingClientRect()
      if (y >= rect.top && y <= rect.bottom && i !== touchIdx.current) {
        setOrder(prev => {
          const next = [...prev]
          const item = next.splice(touchIdx.current!, 1)[0]
          next.splice(i, 0, item)
          touchIdx.current = i
          return next
        })
        break
      }
    }
  }

  const handleTouchEnd = () => {
    setDragging(null)
    touchIdx.current = null
  }

  return (
    <div className="flex flex-col gap-1">
      {order.map((item, idx) => (
        <div
          key={item}
          data-drag-item
          draggable={!disabled}
          onDragStart={() => handleDragStart(idx)}
          onDragEnter={() => handleDragEnter(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          onTouchStart={e => handleTouchStart(e, idx)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing select-none transition-all ${
            dragging === idx
              ? 'opacity-50 border-[#4F8EF7] bg-[#4F8EF7]/10 scale-[0.98]'
              : 'border-white/[0.08] bg-[#1c1c26] hover:border-white/20'
          } ${disabled ? 'cursor-default' : ''}`}
        >
          <div className="flex flex-col gap-0.5 opacity-30 flex-shrink-0">
            <div className="w-4 h-px bg-white" /><div className="w-4 h-px bg-white" /><div className="w-4 h-px bg-white" />
          </div>
          <span className="w-6 h-6 rounded bg-white/[0.06] flex items-center justify-center text-[11px] font-mono text-white/40 flex-shrink-0">
            {idx + 1}
          </span>
          <span className="text-[12px] text-white/80 leading-relaxed">{item}</span>
        </div>
      ))}

      {!disabled && (
        <button
          onClick={() => onSubmit(order)}
          className="mt-3 w-full bg-[#4F8EF7] text-white font-bold text-[13px] py-3 rounded-xl hover:bg-[#3a7de8] transition-colors"
        >
          Submit Order →
        </button>
      )}
    </div>
  )
}
