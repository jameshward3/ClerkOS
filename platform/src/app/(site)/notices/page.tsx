import Link from 'next/link'
import { SubscribeForm } from '@/components/SubscribeForm'
import { DemoFlag, Empty, PageBand, human } from '@/components/ui'
import { getLocale } from '@/lib/i18n'
import { findPublic } from '@/lib/public'
import { fmtShortDate } from '@/lib/time'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notices' }
export default async function Notices() {
  const docs = (await findPublic('notices', { sort: '-publishedAt', limit: 50, locale: await getLocale() })).docs as any[]
  return (<><PageBand eyebrow="Public notices" title="Notices" /><div className="container section layout-side"><div>
    {docs.length === 0 ? <Empty title="No current notices." /> : <ul style={{ listStyle: 'none', padding: 0 }}>{docs.map((n) => (
      <li key={n.id} style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0' }}><span className="badge badge--neutral">{human(n.kind)}</span> <DemoFlag show={n.verificationStatus === 'demo'} text="Sample" />
        <h2 style={{ fontSize: 'var(--fs-h3)', margin: '8px 0' }}><Link href={`/notices/${n.slug}`}>{n.title}</Link></h2><p className="meta">{fmtShortDate(n.publishedAt)} — {n.summary}</p></li>))}</ul>}
  </div><aside className="panel"><h2 style={{ fontSize: 'var(--fs-h3)' }}>Email me new notices</h2><SubscribeForm topicType="notices" /></aside></div></>)
}
