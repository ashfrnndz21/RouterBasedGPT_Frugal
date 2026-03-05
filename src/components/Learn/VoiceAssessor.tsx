'use client'
// src/components/Learn/VoiceAssessor.tsx
// Uses browser Web Speech API — no external deps
import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  questionText: string
  onTranscriptReady: (transcript: string) => void
  onCancel: () => void
}

type RecordState = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'unsupported'

export default function VoiceAssessor({ questionText, onTranscriptReady, onCancel }: Props) {
  const [state, setState] = useState<RecordState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [bars, setBars] = useState<number[]>(Array(11).fill(4))
  const recognitionRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check Web Speech API support
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null

  useEffect(() => {
    if (!SpeechRecognition) setState('unsupported')
  }, [SpeechRecognition])

  // Waveform animation
  useEffect(() => {
    if (state !== 'listening') {
      cancelAnimationFrame(animFrameRef.current)
      setBars(Array(11).fill(4))
      return
    }
    const animate = () => {
      setBars(prev => prev.map(() => Math.floor(Math.random() * 28) + 4))
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [state])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return
    setState('listening')
    setTranscript('')
    setInterimText('')

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim += t
      }
      if (final) setTranscript(prev => prev + final)
      setInterimText(interim)

      // Auto-stop after 3s of silence
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
      silenceTimer.current = setTimeout(() => {
        recognition.stop()
      }, 3000)
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') setState('error')
    }

    recognition.onend = () => {
      setState(prev => prev === 'listening' ? 'done' : prev)
      setInterimText('')
    }

    recognition.start()
  }, [SpeechRecognition])

  const stopListening = () => {
    recognitionRef.current?.stop()
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    setState('done')
  }

  const submitTranscript = () => {
    const full = transcript.trim()
    if (!full) return
    onTranscriptReady(full)
  }

  const reset = () => {
    recognitionRef.current?.abort()
    setState('idle')
    setTranscript('')
    setInterimText('')
  }

  if (state === 'unsupported') {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">🎙️</div>
        <p className="text-[12px] text-white/40 mb-4">Your browser doesn't support voice input.<br />Please use Chrome or Edge.</p>
        <button onClick={onCancel} className="text-[12px] text-[#4F8EF7] hover:underline">Switch to typed mode</button>
      </div>
    )
  }

  const BAR_COLORS = ['#A78BFA', '#A78BFA', '#7C3AED', '#A78BFA', '#F0A500', '#F0A500', '#A78BFA', '#7C3AED', '#A78BFA', '#A78BFA', '#F0A500']

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Waveform visualiser */}
      <div className="flex items-center gap-[3px] h-[48px]">
        {bars.map((h, i) => (
          <div key={i}
            className="rounded-full transition-all"
            style={{
              width: 3,
              height: state === 'listening' ? h : 4,
              background: state === 'listening' ? BAR_COLORS[i] : 'rgba(255,255,255,0.1)',
              transitionDuration: state === 'listening' ? '80ms' : '300ms',
            }}
          />
        ))}
      </div>

      {/* Status label */}
      <div className={`text-[11px] font-bold font-mono uppercase tracking-widest ${
        state === 'listening' ? 'text-[#A78BFA]' :
        state === 'done' ? 'text-[#00E5A0]' :
        state === 'error' ? 'text-[#EF4444]' :
        'text-white/30'
      }`}>
        {state === 'idle' ? 'Tap mic to answer' :
         state === 'listening' ? '● Recording — speak now' :
         state === 'done' ? '✓ Recording complete' :
         state === 'error' ? 'Mic error — try again' : ''}
      </div>

      {/* Live transcript */}
      {(transcript || interimText) && (
        <div className="w-full bg-[#1c1c26] border border-white/[0.07] rounded-xl px-4 py-3 text-[12px] text-white/70 leading-relaxed max-h-28 overflow-y-auto">
          {transcript}
          {interimText && <span className="text-white/30 italic">{interimText}</span>}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 items-center">
        {state === 'idle' && (
          <button onClick={startListening}
            className="w-14 h-14 rounded-full bg-[#A78BFA] hover:bg-[#9170f0] transition-colors flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(167,139,250,0.3)]">
            🎙️
          </button>
        )}

        {state === 'listening' && (
          <button onClick={stopListening}
            className="w-14 h-14 rounded-full bg-[#EF4444] hover:bg-[#dc2626] transition-colors flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            ■
          </button>
        )}

        {state === 'done' && (
          <>
            <button onClick={reset}
              className="px-4 py-2.5 border border-white/[0.08] rounded-xl text-[12px] text-white/50 hover:text-white/80 transition-colors">
              Re-record
            </button>
            <button onClick={submitTranscript}
              disabled={!transcript.trim()}
              className="px-6 py-2.5 bg-[#4F8EF7] disabled:opacity-40 text-white font-bold text-[13px] rounded-xl hover:bg-[#3a7de8] transition-colors">
              Submit Answer →
            </button>
          </>
        )}

        {state === 'error' && (
          <button onClick={reset}
            className="px-4 py-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-[12px] text-[#EF4444]">
            Try Again
          </button>
        )}

        <button onClick={onCancel} className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
          Switch to typed
        </button>
      </div>
    </div>
  )
}
