// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Studio routes (except login): check for studio_auth cookie
  if (pathname.startsWith('/studio') && !pathname.startsWith('/studio/login')) {
    const isAdmin = req.cookies.get('studio_auth')?.value === process.env.STUDIO_SECRET
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/studio/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/studio/:path*'],
}
