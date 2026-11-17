import Link from 'next/link'
import type { Where } from 'payload'
import { CivicMap } from '@/components/CivicMap'
import { DemoFlag, Empty, Notice, PageBand, WardChip, human } from '@/components/ui'
import { WardLookup } from '@/components/WardLookup'
import { placesGeoJSON, wardGeoJSON } from '@/lib/gis'
import { one, pick, qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { findPublic } from '@/lib/public'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Explore Orange' }
const WARDS = ['north', 'south', 'east', 'west'] as const
const KINDS = ['facility', 'park', 'school', 'library', 'historic_site', 'transit'] as const
const JUR: Record<string, string> = { municipal: 'City of Orange Township', county: 'Essex County', state: 'State of New Jersey', school_district: 'Orange Board of Education', other: 'Other / private' }

export default async function Explore({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const ward = pick(one(sp.ward), WARDS), kind = pick(one(sp.kind), KINDS), view = one(sp.view) === 'list' ? 'list' : 'map'
  const and: Where[] = []
  if (ward) and.push({ ward: { equals: ward } })
  if (kind) and.push({ kind: { equals: kind } })
  const places = (await findPublic('places', { where: and.length ? { and } : undefined, sort: 'name', limit: 300 })).docs as any[]
  const payload = await getClient()
  const [pts, wards] = await Promise.all([placesGeoJSON(payload, places), wardGeoJSON(payload)])
  const verifiedWards = wards?.verification === 'verified' ? wards.fc : null
  const base = { ward, kind }
  return (
    <>
      <PageBand eyebrow="Explore Orange" title="Four wards. One Orange."><p style={{ color: '#DCE3EA' }}>Find your ward, public places, and who is responsible for them.</p></PageBand>
      <div className="container section">
        <div className="layout-side">
          <div>
            {!verifiedWards && <Notice tone="info" title="Ward boundaries are not yet verified">Official ward maps have not been supplied by the responsible custodian, so this site does not draw ward areas or assign addresses to wards automatically. Ward filters apply only to places whose ward has been confirmed.</Notice>}
            <WardLookup />
          </div>
          <nav aria-label="Wards" className="panel">
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>Wards</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>{WARDS.map((w) => (
              <li key={w}><Link href={`/explore${qs(base, { ward: ward === w ? undefined : w })}`} aria-current={ward === w ? 'true' : undefined}><WardChip ward={w} /></Link> · <Link href={`/explore/wards/${w}`}>ward page</Link></li>
            ))}</ul>
          </nav>
        </div>
        <form className="filters" method="get" aria-label="Filter places" style={{ marginTop: 24 }}>
          <div className="field"><label htmlFor="kind">Place type</label><select id="kind" name="kind" defaultValue={kind ?? ''}><option value="">All</option>{KINDS.map((k) => <option key={k} value={k}>{human(k)}</option>)}</select></div>
          <div className="field"><label htmlFor="ward">Ward</label><select id="ward" name="ward" defaultValue={ward ?? ''}><option value="">All</option>{WARDS.map((w) => <option key={w} value={w}>{human(w)}</option>)}</select></div>
          <input type="hidden" name="view" value={view} />
          <button className="btn" type="submit">Apply</button>
        </form>
        <div className="tabs" role="navigation" aria-label="View">
          <Link href={`/explore${qs(base, {})}`} aria-current={view === 'map' ? 'page' : undefined}>Map and list</Link>
          <Link href={`/explore${qs(base, { view: 'list' })}`} aria-current={view === 'list' ? 'page' : undefined}>List only</Link>
        </div>
        {view === 'map' && places.length > 0 && <>
          <CivicMap label="Public places" places={pts as any} wards={verifiedWards as any} linkBase="/explore/places" />
          <div className="map-legend"><span><i style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--navy)', display: 'inline-block' }} aria-hidden="true" />City-operated</span><span><i style={{ width: 14, height: 14, borderRadius: '50%', border: '3px solid var(--navy)', display: 'inline-block' }} aria-hidden="true" />Operated by another agency</span></div>
        </>}
        {places.length === 0 ? <Empty title="No places match."><p><Link href="/explore">Clear filters</Link></p></Empty> : (
          <div className="table-wrap"><table>
            <caption>Places ({places.length})</caption>
            <thead><tr><th scope="col">Place</th><th scope="col">Type</th><th scope="col">Operated by</th><th scope="col">Ward</th></tr></thead>
            <tbody>{places.map((p) => <tr key={p.id}><td><Link href={`/explore/places/${p.slug}`}>{p.name}</Link> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></td><td>{human(p.kind)}</td><td>{JUR[p.jurisdiction]}</td><td>{p.ward ? <WardChip ward={p.ward} /> : 'Not determined'}</td></tr>)}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
