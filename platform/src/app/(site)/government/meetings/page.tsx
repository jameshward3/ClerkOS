import Link from 'next/link'
import type { Where } from 'payload'
import { CouncilBand } from '@/components/CouncilBand'
import { GovTabs } from '@/components/GovTabs'
import { SubscribeForm } from '@/components/SubscribeForm'
import { DemoFlag, Empty, human } from '@/components/ui'
import { one, pick, qs, type SP } from '@/lib/params'
import { findPublic } from '@/lib/public'
import { fmtDate, fmtTime } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Meetings' }
const BODIES = ['city_council', 'planning_board', 'zoning_board', 'other'] as const

export default async function Meetings({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const when = one(sp.when) === 'past' ? 'past' : 'upcoming'
  const body = pick(one(sp.body), BODIES)
  const page = Math.max(1, Number(one(sp.page)) || 1)
  const now = new Date(Date.now() - 6 * 3600e3).toISOString()
  const and: Where[] = [when === 'past' ? { startsAt: { less_than: now } } : { startsAt: { greater_than_equal: now } }]
  if (body) and.push({ body: { equals: body } })
  const res = await findPublic('meetings', { where: { and }, sort: when === 'past' ? '-startsAt' : 'startsAt', limit: 20, page })
  return (
    <>
      <CouncilBand />
      <div className="container section">
        <GovTabs current="meetings" />
        <div className="layout-side">
          <div>
            <form className="filters" method="get" aria-label="Filter meetings">
              <div className="field"><label htmlFor="when">When</label><select id="when" name="when" defaultValue={when}><option value="upcoming">Upcoming</option><option value="past">Past</option></select></div>
              <div className="field"><label htmlFor="body">Body</label><select id="body" name="body" defaultValue={body ?? ''}><option value="">All bodies</option>{BODIES.map((b) => <option key={b} value={b}>{human(b)}</option>)}</select></div>
              <button className="btn" type="submit">Apply</button>
            </form>
            {res.docs.length === 0 ? <Empty title={`No ${when} meetings are published.`}><p>Historic agendas remain on the <a href="https://orangetwpnjcc.org/meetings/2026-meetings-2/">Council website</a> while migration continues.</p></Empty> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>{(res.docs as any[]).map((m) => (
                <li key={m.id} style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0' }}>
                  <h2 style={{ fontSize: 'var(--fs-h3)', margin: 0 }}><Link href={`/government/meetings/${m.slug}`}>{m.title}</Link> <DemoFlag show={m.verificationStatus === 'demo'} text="Sample meeting" /></h2>
                  <p className="meta" style={{ margin: 0 }}>{fmtDate(m.startsAt)} · {fmtTime(m.startsAt)} · {m.location} · {human(m.meetingStatus)}</p>
                </li>
              ))}</ul>
            )}
            <nav className="pagination" aria-label="Pages">
              {res.hasPrevPage && <Link className="btn btn--secondary" href={`/government/meetings${qs({ when, body }, { page: String(page - 1) })}`}>Previous</Link>}
              <span className="meta">Page {res.page} of {Math.max(1, res.totalPages)}</span>
              {res.hasNextPage && <Link className="btn btn--secondary" href={`/government/meetings${qs({ when, body }, { page: String(page + 1) })}`}>Next</Link>}
            </nav>
          </div>
          <aside className="panel">
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>Calendar feed</h2>
            <p>Add published meetings to your calendar: <a href="/data/calendar.ics">calendar.ics</a></p>
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>Meeting notifications</h2>
            <SubscribeForm topicType="meetings" />
          </aside>
        </div>
      </div>
    </>
  )
}
