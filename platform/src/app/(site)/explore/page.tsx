import Link from 'next/link'
import type { Where } from 'payload'
import { CivicMap, ProjectLegend } from '@/components/CivicMap'
import { DemoFlag, Empty, Notice, PageBand, StatusBadge, WardChip, human } from '@/components/ui'
import { WardLookup } from '@/components/WardLookup'
import { CITY_HALL } from '@/lib/facts'
import { municipalGeoJSON, placesGeoJSON, projectGeoJSON, wardGeoJSON } from '@/lib/gis'
import { one, pick, qs, type SP } from '@/lib/params'
import { getClient } from '@/lib/payload'
import { findPublic } from '@/lib/public'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Explore Orange' }
const WARDS = ['north', 'south', 'east', 'west'] as const
const JUR: Record<string, string> = { municipal: 'City of Orange Township', county: 'Essex County', state: 'State of New Jersey', school_district: 'Orange Board of Education', other: 'Other / private' }
/** Guide §5 layers. Each place-kind layer maps to one or more place kinds. */
const LAYERS = [
  { key: 'parks', label: 'Parks', kinds: ['park'] },
  { key: 'facilities', label: 'Public facilities', kinds: ['facility', 'library', 'transit'] },
  { key: 'schools', label: 'Schools', kinds: ['school'] },
  { key: 'history', label: 'Local history', kinds: ['historic_site'] },
  { key: 'projects', label: 'Street projects', kinds: [] },
] as const

export default async function Explore({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const ward = pick(one(sp.ward), WARDS)
  const view = (['list', 'map'] as const).find((v) => v === one(sp.view)) ?? 'default'
  // `layers` sentinel distinguishes "form submitted with boxes unchecked" from "first visit" (all on).
  const raw = ([] as string[]).concat(sp.layer ?? [])
  const on = new Set<string>(one(sp.layers) ? raw : LAYERS.map((l) => l.key))
  const kinds = LAYERS.filter((l) => on.has(l.key)).flatMap((l) => l.kinds as readonly string[])

  const and: Where[] = [{ kind: { in: kinds } }]
  if (ward) and.push({ ward: { equals: ward } })
  const payload = await getClient()
  const [placesRes, projectsRes, wards, wardDoc] = await Promise.all([
    kinds.length ? findPublic('places', { where: { and }, sort: 'name', limit: 300 }) : Promise.resolve({ docs: [] }),
    on.has('projects') ? findPublic('projects', { where: ward ? { wards: { in: [ward] } } : undefined, limit: 200 }) : Promise.resolve({ docs: [] }),
    wardGeoJSON(payload),
    ward ? findPublic('wards', { where: { slug: { equals: ward } }, depth: 1, limit: 1 }) : Promise.resolve({ docs: [] }),
  ])
  const places = placesRes.docs as any[]
  const projects = projectsRes.docs as any[]
  const [pts, proj, boundary] = await Promise.all([placesGeoJSON(payload, places), projectGeoJSON(payload, projects.map((p) => p.id)), municipalGeoJSON(payload)])
  const byId = new Map(projects.map((p) => [p.id, p]))
  proj.features.forEach((ft: any) => { const p = byId.get(ft.properties.projectId); ft.properties.phase = p?.phase; ft.properties.slug = p?.slug })
  const verifiedWards = wards?.verification === 'verified' ? wards.fc : null
  const illustrative = !verifiedWards || pts.features.some((f: any) => f.properties.verification !== 'verified') || proj.features.some((f: any) => f.properties.verification !== 'verified')
  const selected = (wardDoc.docs as any[])[0]
  const base = { ward, layers: one(sp.layers) || undefined }
  const layerQs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams(qs(base, patch).slice(1))
    if (one(sp.layers)) raw.forEach((l) => u.append('layer', l))
    const s = u.toString()
    return s ? `?${s}` : ''
  }
  const nothing = places.length === 0 && projects.length === 0

  return (
    <>
      <PageBand eyebrow="Explore Orange" title="Four wards. One Orange."><p style={{ color: '#DCE3EA' }}>Find your ward, public places, street projects, and who is responsible for them.</p></PageBand>
      <div className="container section">
        <div className="layout-side">
          <div>
            {!verifiedWards && <Notice tone="info" title="Ward boundaries are not yet verified">Official ward maps have not been supplied by the responsible custodian, so this site does not draw ward areas or assign addresses to wards. Choose a ward from the list, or contact the City Clerk at <a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a>.</Notice>}
            <WardLookup />
          </div>
          <nav aria-label="Wards" className="panel">
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>Choose a ward</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>{WARDS.map((w) => (
              <li key={w}><Link href={`/explore${layerQs({ ward: ward === w ? undefined : w })}`} aria-current={ward === w ? 'true' : undefined}><WardChip ward={w} />{ward === w && <span className="meta"> (selected — choose again to clear)</span>}</Link></li>
            ))}</ul>
          </nav>
        </div>

        {selected && (
          <section className="panel panel--warm" aria-labelledby="sel-ward" style={{ marginTop: 24 }}>
            <h2 id="sel-ward" style={{ fontSize: 'var(--fs-h3)' }}>{selected.name}</h2>
            <p>{selected.verificationStatus === 'verified' ? selected.summary : 'Boundaries and representation for this ward have not yet been confirmed against official records.'}</p>
            <p>{places.length} place{places.length === 1 ? '' : 's'} and {projects.length} project{projects.length === 1 ? '' : 's'} are assigned to this ward. <Link href={`/explore/wards/${selected.slug}`}>Open the {selected.name} page</Link></p>
          </section>
        )}

        <form className="filters" method="get" aria-label="Map layers" style={{ marginTop: 24 }}>
          <fieldset style={{ border: 0, padding: 0, margin: 0, gridColumn: '1 / -1' }}>
            <legend className="label">Layers</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              <label style={{ fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, color: 'var(--text-muted)' }}>
                <input type="checkbox" disabled aria-describedby="wards-layer-note" /> Wards <span id="wards-layer-note" className="meta">(unavailable until boundaries are verified)</span>
              </label>
              {LAYERS.map((l) => (
                <label key={l.key} style={{ fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
                  <input type="checkbox" name="layer" value={l.key} defaultChecked={on.has(l.key)} /> {l.label}
                </label>
              ))}
            </div>
          </fieldset>
          <input type="hidden" name="layers" value="1" />
          {ward && <input type="hidden" name="ward" value={ward} />}
          {view !== 'default' && <input type="hidden" name="view" value={view} />}
          <button className="btn" type="submit">Update map and list</button>
        </form>

        <div className="tabs" role="navigation" aria-label="View">
          <Link href={`/explore${layerQs({})}`} aria-current={view !== 'list' ? 'page' : undefined}>Map and list</Link>
          <Link href={`/explore${layerQs({ view: 'list' })}`} aria-current={view === 'list' ? 'page' : undefined}>List only</Link>
        </div>

        {view !== 'list' && !nothing && <>
          {view === 'default' && <Link className="btn btn--secondary map-toggle" href={`/explore${layerQs({ view: 'map' })}`}>Show map</Link>}
          <div className={view === 'default' ? 'map-optional' : undefined}>
            <CivicMap label="Places and street projects" places={pts as any} projects={proj as any} wards={verifiedWards as any} boundary={boundary} linkBase="/projects" placesLinkBase="/explore/places" illustrative={illustrative} />
            <div className="map-legend"><span><i style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--navy)', display: 'inline-block' }} aria-hidden="true" />City-operated place</span><span><i style={{ width: 14, height: 14, borderRadius: '50%', border: '3px solid var(--navy)', display: 'inline-block' }} aria-hidden="true" />Operated by another agency</span></div>
            {projects.length > 0 && <ProjectLegend />}
          </div>
        </>}

        {nothing ? <Empty title="Nothing matches these layers."><p><Link href="/explore">Show all layers</Link></p></Empty> : <>
          {places.length > 0 && <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)"><table>
            <caption>Places ({places.length})</caption>
            <thead><tr><th scope="col">Place</th><th scope="col">Type</th><th scope="col">Operated by</th><th scope="col">Ward</th></tr></thead>
            <tbody>{places.map((p) => <tr key={p.id}><td><Link href={`/explore/places/${p.slug}`}>{p.name}</Link> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></td><td>{human(p.kind)}</td><td>{JUR[p.jurisdiction]}</td><td>{p.ward ? <WardChip ward={p.ward} /> : 'Not determined'}</td></tr>)}</tbody>
          </table></div>}
          {projects.length > 0 && <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways on small screens)" style={{ marginTop: 24 }}><table>
            <caption>Street projects ({projects.length})</caption>
            <thead><tr><th scope="col">Project</th><th scope="col">Status</th><th scope="col">Ward</th></tr></thead>
            <tbody>{projects.map((p) => <tr key={p.id}><td><Link href={`/projects/${p.slug}`}>{p.title}</Link> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></td><td><StatusBadge status={p.phase} /></td><td>{(p.wards ?? []).map((w: string) => <WardChip key={w} ward={w} />)}</td></tr>)}</tbody>
          </table></div>}
        </>}
      </div>
    </>
  )
}
