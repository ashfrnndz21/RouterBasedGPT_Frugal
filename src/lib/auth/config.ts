// src/lib/auth/config.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import { randomUUID } from 'crypto'

function getDB() {
  return new Database(path.join(process.cwd(), 'data', 'frugal.db'))
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? 'frugal-ai-secret-change-in-production',
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: '/learn/login',
    error: '/learn/login',
  },

  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const db = getDB()
        try {
          const learner = db.prepare('SELECT * FROM learners WHERE email = ?').get(credentials.email) as any
          if (!learner?.password_hash) return null
          const valid = await bcrypt.compare(credentials.password, learner.password_hash)
          if (!valid) return null
          db.prepare("UPDATE learners SET last_active = datetime('now') WHERE id = ?").run(learner.id)
          return { id: learner.id, email: learner.email, name: learner.name, image: null }
        } finally { db.close() }
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const db = getDB()
        try {
          const existing = db.prepare('SELECT id FROM learners WHERE email = ?').get(user.email!) as any
          if (!existing) {
            const id = randomUUID()
            db.prepare(`
              INSERT INTO learners (id, name, email, auth_provider)
              VALUES (?, ?, ?, 'google')
            `).run(id, user.name ?? user.email, user.email)
            user.id = id
          } else {
            user.id = existing.id
            db.prepare("UPDATE learners SET last_active = datetime('now') WHERE id = ?").run(existing.id)
          }
        } finally { db.close() }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) token.learnerId = user.id
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).learnerId = token.learnerId
      }
      return session
    },
  },
}
