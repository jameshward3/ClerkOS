import Link from 'next/link'
import type { Strings } from '@/lib/i18n'
import { CITY_HALL } from '@/lib/facts'

export function Footer({ s }: { s: Strings }) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <h2>{s.footerAbout}</h2>
          <p>{CITY_HALL.name}<br />{CITY_HALL.address}<br /><a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a></p>
        </div>
        <div>
          <h2>{s.footerGov}</h2>
          <ul>
            <li><Link href="/government/meetings">Meetings &amp; agendas</Link></li>
            <li><Link href="/government/legislation">Legislation</Link></li>
            <li><Link href="/transparency/budget">Budget</Link></li>
            <li><Link href="/departments">Departments</Link></li>
          </ul>
        </div>
        <div>
          <h2>{s.footerHelp}</h2>
          <ul>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/report-a-concern">Report a concern</Link></li>
            <li><Link href="/subscribe">Get updates</Link></li>
            <li><Link href="/accessibility">{s.accessibility}</Link></li>
            <li><Link href="/privacy">{s.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{s.officialSite}</h2>
          <p>Until this platform is approved, official information remains at <a href="https://orangenj.gov">orangenj.gov</a> and <a href="https://orangetwpnjcc.org">orangetwpnjcc.org</a>.</p>
        </div>
      </div>
      <div className="footer__base"><div className="container">{s.designNote.toUpperCase()}</div></div>
    </footer>
  )
}
