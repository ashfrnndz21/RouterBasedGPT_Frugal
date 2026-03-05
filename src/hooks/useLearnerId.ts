// src/hooks/useLearnerId.ts
'use client'
import { useSession } from 'next-auth/react'

export function useLearnerId(): string | null {
  const { data: session } = useSession()
  return (session?.user as any)?.learnerId ?? null
}

export function useRequireLearnerId(): string {
  const id = useLearnerId()
  if (!id) throw new Error('Not authenticated')
  return id
}
