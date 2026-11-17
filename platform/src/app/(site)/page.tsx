import Link from 'next/link'
import { ArrowRight, CalendarDays, CreditCard, FileText, Landmark, TrafficCone, Trash2, TriangleAlert, BarChart3 } from 'lucide-react'
import { DemoFlag, Notice, WardChip } from '@/components/ui'
import { WardLookup } from '@/components/WardLookup'
import { getLocale } from '@/lib/i18n'
import { findPublic } from '@/lib/public'
import { selectHomepage } from '@/lib/seasonal'
import { fmtDate, fmtTime } from '@/lib/time'

export const dynamic = 'force-dynamic'

const TASKS = [
  { href: '/services/pay-a-bill', label: 'Pay a bill', icon: CreditCard },
  { href: '/services/permits-and-licenses', label: 'Permits & licenses', icon: FileText },
  { href: '/report-a-concern', label: 'Report a concern', icon: TriangleAlert },
  { href: '/services/trash-and-recycling', label: 'Trash & recycling', icon: Trash2 },
  { href: '/government/meetings', label: 'Meetings & agendas', icon: CalendarDays },
]

export default async function Home() {
  const locale = await getLocale()
  const now = new Date()
  const [notices, features, meetings] = await Promise.all([
    findPublic('notices', { sort: '-publishedAt', limit: 20, locale }),
    findPublic('seasonal-features', { limit: 20, locale, depth: 1 }),
    findPublic('meetings', { where: { startsAt: { greater_than_equal: new Date(now.getTime() - 864e5).toISOString() } }, sort: 'startsAt', limit: 3 }),
  ])
  const { emergencies, feature } = selectHomepage(features.docs as any[], notices.docs as any[], now)
  const routine = (notices.docs as any[]).filter((n) => n.kind !== 'emergency').slice(0, 4)
  const img = feature?.image && typeof feature.image === 'object' && feature.image.approvalStatus === 'approved' && feature.image.locationVerified ? feature.image : null

  return (
    <>
      {emergencies.length > 0 && (
        <div className="container section--tight">
          {emergencies.map((e: any) => (
            <Notice key={e.id} tone="emergency" title={e.title}><p>{e.summary} <Link href={`/notices/${e.slug}`}>Details</Link></p></Notice>
          ))}
        </div>
      )}
      <section className="hero on-navy" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">Your city. Connected.</p>
          <h1 id="hero-title">A stronger city.<br />A clearer connection.</h1>
          <p>Access key services, find official information, stay informed about city business, and get involved in Orange Township.</p>
          <form action="/search" role="search" aria-label="Site search">
            <label htmlFor="home-q" className="sr-only">How can we help you?</label>
            <div className="searchbar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input id="home-q" name="q" type="search" placeholder="How can we help you?" />
              <button className="btn btn--gold" type="submit">Search</button>
            </div>
          </form>
        </div>
        <div className="hero__media">
          {img ? <img src={img.sizes?.hero?.url ?? img.url} alt={img.alt} style={{ objectPosition: `${img.focalX ?? 50}% ${img.focalY ?? 50}%` }} />
            : <div className="hero__placeholder"><p>Photography pending — a licensed, location‑verified photograph of Orange will appear here once approved.</p></div>}
        </div>
      </section>
      <nav className="tasks" aria-label="Common tasks">
        <ul>{TASKS.map(({ href, label, icon: Icon }) => (
          <li key={href}><Link href={href}><Icon className="lead" size={30} aria-hidden="true" /><span>{label}</span><ArrowRight className="arrow" size={22} aria-hidden="true" /></Link></li>
        ))}</ul>
      </nav>

      {feature && (
        <div className="container section--tight">
          <div className="panel panel--warm">
            <p className="eyebrow">This season</p>
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>{feature.title}</h2>
            <p>{feature.message}</p>
            {feature.linkUrl && <Link className="cta-link" href={feature.linkUrl}>{feature.linkLabel ?? 'Learn more'} <ArrowRight size={18} aria-hidden="true" /></Link>}
          </div>
        </div>
      )}

      <section className="container section" aria-labelledby="inview">
        <h2 id="inview" className="rule-heading" style={{ fontSize: 'var(--fs-h1)' }}>Your city, in view.</h2>
        <div className="grid grid-3">
          {[
            { eyebrow: 'Public meetings', title: 'City meetings and agendas', body: 'View upcoming meetings, agendas, and records of past proceedings.', href: '/government/meetings', cta: 'View meetings', Icon: Landmark },
            { eyebrow: 'Budget & spending', title: 'City budget and financials', body: 'Explore the annual budget and how city resources are used.', href: '/transparency/budget', cta: 'See the budget', Icon: BarChart3 },
            { eyebrow: 'Street improvements', title: 'Infrastructure in progress', body: 'Follow street improvements, project details, and what is coming next.', href: '/projects', cta: 'View projects', Icon: TrafficCone },
          ].map(({ eyebrow, title, body, href, cta, Icon }) => (
            <article key={href} className="feature">
              <div className="feature__img" aria-hidden="true"><Icon size={56} strokeWidth={1.5} /></div>
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h3><Link href={href}>{title}</Link></h3>
                <p>{body}</p>
                <Link className="cta-link" href={href}>{cta} <ArrowRight size={18} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--surface-cool)' }} aria-labelledby="wards">
        <div className="container layout-side">
          <div>
            <h2 id="wards">Four wards. One Orange.</h2>
            <p className="lede">Find your ward, your representatives, and what is happening near you.</p>
            <WardLookup />
          </div>
          <div>
            <h3>Browse by ward</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
              {['north', 'south', 'east', 'west'].map((w) => <li key={w}><Link href={`/explore/wards/${w}`}><WardChip ward={w} /></Link></li>)}
            </ul>
            <p className="meta">Ward boundaries will appear on the map once official geometry is verified with the City.</p>
          </div>
        </div>
      </section>

      <div className="container section grid grid-2">
        <section aria-labelledby="upcoming">
          <h2 id="upcoming">Upcoming meetings</h2>
          {meetings.docs.length === 0 ? <p>No upcoming meetings are published yet. <Link href="/government/meetings">See all meetings</Link>.</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {(meetings.docs as any[]).map((m) => (
                <li key={m.id} style={{ borderBottom: '1px solid var(--divider)', padding: '12px 0' }}>
                  <Link href={`/government/meetings/${m.slug}`}><strong>{m.title}</strong></Link> <DemoFlag show={m.verificationStatus === 'demo'} text="Sample" />
                  <div className="meta">{fmtDate(m.startsAt)} · {fmtTime(m.startsAt)} · {m.location}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="news">
          <h2 id="news">Notices</h2>
          {routine.length === 0 ? <p>No current notices.</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {routine.map((n) => (
                <li key={n.id} style={{ borderBottom: '1px solid var(--divider)', padding: '12px 0' }}>
                  <Link href={`/notices/${n.slug}`}><strong>{n.title}</strong></Link> <DemoFlag show={n.verificationStatus === 'demo'} text="Sample" />
                  <div className="meta">{n.summary}</div>
                </li>
              ))}
            </ul>
          )}
          <Link className="cta-link" href="/notices">All notices <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </div>
    </>
  )
}
