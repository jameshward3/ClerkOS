import { NextResponse, type NextRequest } from 'next/server'

/** Sets the interface language cookie and returns to the same page (local paths only). */
export function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to') === 'es' ? 'es' : 'en'
  const next = req.nextUrl.searchParams.get('next') ?? '/'
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const res = NextResponse.redirect(new URL(safe, req.nextUrl.origin), 303)
  res.cookies.set('lang', to, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, httpOnly: true })
  return res
}
