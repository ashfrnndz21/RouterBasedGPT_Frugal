'use client'
// src/app/studio/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StudioLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/studio/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/studio')
    } else {
      setError('Invalid studio password')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-2">
          <div className="w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_12px_#6366F1]" />
          <span className="font-display text-[16px] font-bold">FRUGAL AI</span>
          <span className="text-[10px] font-mono text-[#6366F1] bg-[#6366F1]/10 px-1.5 py-0.5 rounded">STUDIO</span>
        </div>
        <h1 className="font-display text-[20px] font-bold text-center mb-1">Admin Access</h1>
        <p className="text-[12px] text-white/35 text-center mb-7">Enter your studio password to continue</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Studio password"
          className="w-full bg-[#1c1c26] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 outline-none focus:border-[#6366F1]/50 mb-3 transition-colors" />
        {error && <div className="text-[12px] text-[#EF4444] mb-3 text-center">{error}</div>}
        <button onClick={handleLogin} disabled={loading || !password}
          className="w-full bg-[#6366F1] disabled:opacity-40 text-white font-bold text-[14px] py-3 rounded-xl hover:bg-[#5254cc] transition-colors">
          {loading ? 'Authenticating…' : 'Access Studio'}
        </button>
      </div>
    </div>
  )
}
