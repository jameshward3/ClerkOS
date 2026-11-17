import Link from 'next/link'
import { DemoFlag, Empty, PageBand, human } from '@/components/ui'
import { one, pick, qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { search } from '@/lib/search'
import { fmtShortDate } from '@/lib/time'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Search' }
const TYPES = ['legislation', 'meeting', 'notice', 'service', 'project', 'place', 'dataset', 'event'] as const
/** Allow only <mark> from ts_headline; escape everything else. */
const safeSnippet = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>')
export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const q = one(sp.q).slice(0, 200), type = pick(one(sp.type), TYPES), page = Math.max(1, Number(one(sp.page)) || 1)
  const ward = pick(one(sp.ward), ['north', 'south', 'east', 'west'] as const)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.from)) ? one(sp.from) : undefined
  const res = q ? await search(await getClient(), q, { type, ward, from }, page, 20) : { hits: [], total: 0 }
  const base = { q, type, ward, from }
  return (<><PageBand eyebrow="Search" title={q ? `Results for “${q}”` : 'Search the City'} /><div className="container section">
    <form className="filters" method="get" role="search" aria-label="Search">
      <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="q">Keywords or record number</label><input id="q" name="q" type="search" defaultValue={q} /></div>
      <div className="field"><label htmlFor="type">Type</label><select id="type" name="type" defaultValue={type ?? ''}><option value="">All</option>{TYPES.map((t) => <option key={t} value={t}>{human(t)}</option>)}</select></div>
      <div className="field"><label htmlFor="ward">Ward</label><select id="ward" name="ward" defaultValue={ward ?? ''}><option value="">All</option>{['north', 'south', 'east', 'west'].map((w) => <option key={w} value={w}>{human(w)}</option>)}</select></div>
      <div className="field"><label htmlFor="from">On or after</label><input id="from" name="from" type="text" inputMode="numeric" placeholder="YYYY-MM-DD" defaultValue={from} /></div>
      <button className="btn" type="submit">Search</button>
    </form>
    {q && <p role="status">{res.total} result{res.total === 1 ? '' : 's'}.</p>}
    {q && res.hits.length === 0 && <Empty title="No results."><p>Try fewer words, a record number like &ldquo;Ordinance 40-2026&rdquo;, or browse <Link href="/services">services</Link>.</p></Empty>}
    <ol style={{ listStyle: 'none', padding: 0 }}>{res.hits.map((h) => (
      <li key={`${h.collection}-${h.docId}`} style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0' }}>
        <span className="badge badge--neutral">{human(h.contentType)}</span> <DemoFlag show={!!h.isDemo} text="Sample" />
        <h2 style={{ fontSize: 'var(--fs-h3)', margin: '8px 0' }}><Link href={h.url}>{h.identifier ? `${h.identifier}: ` : ''}{h.title}</Link></h2>
        {h.snippet && <p className="meta" dangerouslySetInnerHTML={{ __html: safeSnippet(h.snippet) }} />}
        {h.date && <p className="meta">{fmtShortDate(h.date)}</p>}
      </li>))}</ol>
    {res.total > page * 20 && <Link className="btn btn--secondary" href={`/search${qs(base, { page: String(page + 1) })}`}>More results</Link>}
  </div></>)
}
