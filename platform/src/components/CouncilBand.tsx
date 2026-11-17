export function CouncilBand() {
  return (
    <div className="band on-navy">
      <div className="container band__inner">
        <div><p className="eyebrow">Council &amp; public records</p><h1 style={{ fontSize: 'var(--fs-hero)' }}>Open government.<br />Every step on the record.</h1></div>
        <form action="/search" role="search" aria-label="Search records">
          <label htmlFor="rec-q" className="sr-only">Search meetings, legislation, or keywords</label>
          <input type="hidden" name="type" value="" />
          <div className="searchbar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input id="rec-q" name="q" type="search" placeholder="Search meetings, legislation, or keywords" /><button className="btn btn--gold" type="submit">Search</button></div>
        </form>
      </div>
    </div>
  )
}
