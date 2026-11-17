import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DemoFlag, Notice, PageBand, StatusBadge } from '@/components/ui'
import { findPublic } from '@/lib/public'
import { CITY_HALL } from '@/lib/facts'

export const dynamic = 'force-dynamic'

export default async function Ward({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ward = (await findPublic('wards', { where: { slug: { equals: slug } }, depth: 1, limit: 1 })).docs[0] as any
  if (!ward) notFound()
  const [projects, places] = await Promise.all([
    findPublic('projects', { where: { wards: { in: [slug] } }, limit: 50 }),
    findPublic('places', { where: { ward: { equals: slug } }, limit: 50 }),
  ])
  const reps = (ward.representatives ?? []).filter((r: any) => r.verificationStatus === 'verified')
  return (
    <>
      <PageBand eyebrow="Ward" title={ward.name} crumbs={[{ href: '/', label: 'Home' }, { href: '/explore', label: 'Explore Orange' }, { label: ward.name }]} />
      <div className="container section layout-side">
        <div>
          {ward.verificationStatus !== 'verified' && <Notice tone="info" title="Ward details are being verified">Boundaries and representation for this ward have not yet been confirmed against official records.</Notice>}
          {ward.summary && <p>{ward.summary}</p>}
          <h2>Projects</h2>
          {projects.docs.length === 0 ? <p>No projects are assigned to this ward.</p> : <ul>{(projects.docs as any[]).map((p) => <li key={p.id}><Link href={`/projects/${p.slug}`}>{p.title}</Link> <StatusBadge status={p.phase} /> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></li>)}</ul>}
          <h2>Places</h2>
          {places.docs.length === 0 ? <p>No places have a confirmed ward yet.</p> : <ul>{(places.docs as any[]).map((p) => <li key={p.id}><Link href={`/explore/places/${p.slug}`}>{p.name}</Link></li>)}</ul>}
        </div>
        <aside className="panel">
          <h2 style={{ fontSize: 'var(--fs-h3)' }}>Representation</h2>
          {reps.length ? <ul>{reps.map((r: any) => <li key={r.id}>{r.name}, {r.office}</li>)}</ul> : <p>Representation for this ward will be listed once confirmed from the official roster. Contact the City Clerk at <a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a>.</p>}
          <p><Link href="/services">City services</Link></p>
        </aside>
      </div>
    </>
  )
}
