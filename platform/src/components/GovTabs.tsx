import Link from 'next/link'
export function GovTabs({ current }: { current: 'meetings' | 'legislation' | 'votes' | 'notices' }) {
  const tabs = [['meetings', 'Meetings', '/government/meetings'], ['legislation', 'Legislation', '/government/legislation'], ['votes', 'Votes', '/government/legislation?view=votes'], ['notices', 'Public notices', '/notices']] as const
  return <nav className="tabs" aria-label="Council & public records">{tabs.map(([k, l, h]) => <Link key={k} href={h} aria-current={current === k ? 'page' : undefined}>{l}</Link>)}</nav>
}
