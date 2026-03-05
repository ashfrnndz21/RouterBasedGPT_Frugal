'use client'
// src/app/learn/register/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password) { setError('All fields required'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Registration failed'); setLoading(false); return }

    // Auto sign-in after register
    await signIn('credentials', { email, password, redirect: false })
    router.push('/learn/start')  // Go to persona select
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4F8EF7] shadow-[0_0_12px_#4F8EF7]" />
          <span className="font-display text-[18px] font-bold tracking-tight text-white">FRUGAL AI</span>
        </div>

        <h1 className="font-display text-[22px] font-bold text-white text-center mb-1">Create your account</h1>
        <p className="text-[12px] text-white/40 text-center mb-7">Start mapping your AI skills — free</p>

        <button onClick={() => signIn('google', { callbackUrl: '/learn/start' })}
          className="w-full flex items-center justify-center gap-3 bg-white text-[#1a1a2e] font-semibold text-[13px] py-3 rounded-xl mb-4 hover:bg-white/90 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign up with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/[0.07]" /><span className="text-[11px] text-white/25">or</span><div className="flex-1 h-px bg-white/[0.07]" />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full bg-[#1c1c26] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#4F8EF7]/50 transition-colors" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-[#1c1c26] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#4F8EF7]/50 transition-colors" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
            placeholder="Password (8+ characters)"
            className="w-full bg-[#1c1c26] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#4F8EF7]/50 transition-colors" />
        </div>

        {error && <div className="text-[12px] text-[#EF4444] mb-3 text-center">{error}</div>}

        <button onClick={handleRegister} disabled={loading}
          className="w-full bg-[#4F8EF7] disabled:opacity-50 text-white font-bold text-[14px] py-3 rounded-xl hover:bg-[#3a7de8] transition-colors mb-4">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-center text-[12px] text-white/35">
          Already have an account?{' '}
          <Link href="/learn/login" className="text-[#4F8EF7] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
