import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC = ['/login', '/api/auth/']
const ADMIN_ONLY = ['/aprovacao']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Public paths — no auth needed
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  // Next.js internals
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next()

  const token = request.cookies.get('lqdz_sess')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'liquidz-secret-fallback')
    const { payload } = await jwtVerify(token, secret)

    // Aprovação is admin-only
    if (ADMIN_ONLY.some(p => pathname.startsWith(p)) && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('lqdz_sess')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
