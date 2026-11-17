import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GovTabs } from '@/components/GovTabs'
import { Breadcrumbs, DemoFlag, Notice, StatusBadge, human } from '@/components/ui'
import { findOnePublic, findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'
const NEGATIVE = new Set(['defeated', 'withdrawn', 'vetoed', 'tabled'])

export default async function LegislationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const l = await findOnePublic('legislation', { slug: { equals: slug } }, { depth: 1 })
  if (!l) notFound()
  const votes = (await findPublic('votes', { where: { legislation: { equals: l.id } }, limit: 50, depth: 1 })).docs as any[]
  const actions = [...(l.actions ?? [])].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
  const sponsors = (l.sponsors ?? []).filter((s: any) => s.verified)
  return (
    <div className="container section">
      <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/government/legislation', label: 'Legislation' }, { label: l.identifier }]} />
      <GovTabs current="legislation" />
      <p className="eyebrow">{human(l.type)}</p>
      <h1>{l.identifier}: {l.title}</h1>
      <p><StatusBadge status={l.currentStatus} /> <DemoFlag show={l.verificationStatus === 'demo'} text="Sample legislation — not a City record" /></p>
      <div className="layout-side">
        <div>
          {l.summary && <p className="lede">{l.summary}</p>}
          <h2>Text</h2>
          {(l.textVersions ?? []).length === 0 ? <p>Official text has not been published here yet.</p> : l.textVersions.map((v: any) => (
            <section key={v.id} style={{ marginBottom: 24 }}>
              <h3>{v.label}{v.date ? ` (${fmtShortDate(v.date)})` : ''}</h3>
              {!v.reviewedAgainstOriginal && <Notice tone="warning" title="Unofficial text">This text has not yet been checked against the signed original. The original record controls.</Notice>}
              <div className="legal-text">{v.text}</div>
              {v.original?.url && <p><a href={v.original.url}>Original document</a></p>}
            </section>
          ))}
          <h2>Votes</h2>
          {votes.length === 0 ? <p>No roll-call votes recorded.</p> : votes.map((v) => (
            <div key={v.id} className="table-wrap" style={{ marginBottom: 16 }}><table>
              <caption>{v.motion} — {human(v.result)}{v.meeting?.startsAt ? `, ${fmtShortDate(v.meeting.startsAt)}` : ''}</caption>
              <thead><tr><th scope="col">Member</th><th scope="col">Vote</th></tr></thead>
              <tbody>{v.entries.map((e: any) => <tr key={e.id ?? e.member}><td>{e.member}</td><td>{human(e.vote)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={2}>{v.yesCount} yes · {v.noCount} no · {v.abstainCount} abstain · {v.absentCount} absent</td></tr></tfoot>
            </table></div>
          ))}
        </div>
        <aside className="panel">
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>Every step on the record</h2>
          {actions.length === 0 ? <p>No actions recorded yet.</p> : <ol className="timeline">{actions.map((a: any, i: number) => (
            <li key={a.id ?? i}><span className={`dot ${NEGATIVE.has(a.action) ? 'dot--negative' : 'dot--done'}`} aria-hidden="true" />
              <strong>{human(a.action)}</strong> — {fmtShortDate(a.date)}
              {a.meeting?.slug && <div><Link href={`/government/meetings/${a.meeting.slug}`}>{a.meeting.title}</Link></div>}
              {a.note && <div className="meta">{a.note}</div>}
              {a.evidenceUrl && <div><a href={a.evidenceUrl}>Evidence</a></div>}
            </li>
          ))}</ol>}
          <dl className="facts">
            <dt>Sponsors</dt><dd>{sponsors.length ? sponsors.map((s: any) => s.name).join(', ') : 'Not verified'}</dd>
            <dt>Effective</dt><dd>{l.effectiveDate ? fmtShortDate(l.effectiveDate) : 'Not available'}</dd>
          </dl>
        </aside>
      </div>
    </div>
  )
}
