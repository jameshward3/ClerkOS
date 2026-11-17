'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Accessibility, Menu, Search } from 'lucide-react'
import type { Strings } from '@/lib/i18n'

export const NAV = [
  { href: '/services', key: 'services' },
  { href: '/explore', key: 'explore' },
  { href: '/government', key: 'government' },
  { href: '/government/meetings', key: 'meetings' },
  { href: '/transparency', key: 'transparency' },
  { href: '/projects', key: 'projects' },
] as const

export function Masthead({ s, locale }: { s: Strings; locale: 'en' | 'es' }) {
  const path = usePathname() ?? '/'
  const current = (href: string) => {
    const match = NAV.filter((n) => path === n.href || path.startsWith(n.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]
    return match?.href === href ? 'page' : undefined
  }
  const links = NAV.map((n) => (
    <li key={n.href}><Link href={n.href} aria-current={current(n.href)}>{s[n.key]}</Link></li>
  ))
  return (
    <header className="masthead">
      <div className="container masthead__inner">
        {/* Text wordmark: an authenticated official seal file has not been supplied (see docs/asset-manifest.md). */}
        <Link href="/" className="wordmark">
          <span className="wordmark__text">
            <span className="wordmark__small">CITY OF</span>
            <span className="wordmark__name">ORANGE TOWNSHIP</span>
            <span className="wordmark__state">NEW JERSEY</span>
            <span className="sr-only"> — home</span>
          </span>
        </Link>
        <div className="mast-right">
          <div className="utility">
            <a href={`/lang?to=${locale === 'es' ? 'en' : 'es'}&next=${encodeURIComponent(path)}`} lang={locale === 'es' ? 'en' : 'es'} hrefLang={locale === 'es' ? 'en' : 'es'}>
              {s.language}
            </a>
            <span className="sep" aria-hidden="true" />
            <Link href="/accessibility"><Accessibility size={20} aria-hidden="true" />{s.accessibility}</Link>
            <span className="sep" aria-hidden="true" />
            <Link href="/search"><Search size={20} aria-hidden="true" />{s.search}</Link>
          </div>
          <nav className="mainnav" aria-label="Main"><ul>{links}</ul></nav>
          <details className="menu-toggle">
            <summary><Menu size={20} aria-hidden="true" />{s.menu}</summary>
            <nav aria-label="Main (mobile)"><ul>{links}</ul></nav>
          </details>
        </div>
      </div>
    </header>
  )
}

