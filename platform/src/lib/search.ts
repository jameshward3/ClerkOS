/**
 * Public search index (civic.search_documents). Behind a small interface so a
 * dedicated engine can replace Postgres FTS later without touching callers.
 *
 * Invariant: only documents that are publicly visible are ever indexed.
 */
import type { Payload } from 'payload'
import { q } from './db'

export type SearchDoc = {
  collection: string
  docId: string
  title: string
  identifier?: string | null
  body?: string | null
  url: string
  contentType: string
  department?: string | null
  ward?: string | null
  date?: string | null
  isDemo?: boolean
}

export type SearchFilters = { type?: string; department?: string; ward?: string; from?: string; to?: string }
export type SearchHit = SearchDoc & { snippet: string; rank: number }

export function isPubliclyVisible(doc: { workflowStatus?: string; expiresAt?: string | null }) {
  return doc.workflowStatus === 'published' && (!doc.expiresAt || new Date(doc.expiresAt) > new Date())
}

export async function indexDoc(payload: Payload, d: SearchDoc) {
  await q(
    payload,
    `INSERT INTO civic.search_documents (collection, doc_id, title, identifier, body, url, content_type, department, ward, doc_date, is_demo, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     ON CONFLICT (collection, doc_id) DO UPDATE SET title=EXCLUDED.title, identifier=EXCLUDED.identifier, body=EXCLUDED.body,
       url=EXCLUDED.url, content_type=EXCLUDED.content_type, department=EXCLUDED.department, ward=EXCLUDED.ward,
       doc_date=EXCLUDED.doc_date, is_demo=EXCLUDED.is_demo, updated_at=now()`,
    [d.collection, d.docId, d.title, d.identifier ?? null, (d.body ?? '').slice(0, 100_000), d.url, d.contentType,
     d.department ?? null, d.ward ?? null, d.date ?? null, !!d.isDemo],
  )
}

export async function removeDoc(payload: Payload, collection: string, docId: string) {
  await q(payload, 'DELETE FROM civic.search_documents WHERE collection=$1 AND doc_id=$2', [collection, docId])
}

const MAX_Q = 200
export async function search(payload: Payload, raw: string, f: SearchFilters = {}, page = 1, perPage = 20) {
  const text = raw.trim().slice(0, MAX_Q)
  if (!text) return { hits: [] as SearchHit[], total: 0 }
  const params: unknown[] = [text]
  const where: string[] = [
    `(tsv @@ websearch_to_tsquery('english', $1) OR title % $1 OR identifier ILIKE '%' || $1 || '%')`,
  ]
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)) }
  if (f.type) add('content_type = ?', f.type)
  if (f.department) add('department = ?', f.department)
  if (f.ward) add('ward = ?', f.ward)
  if (f.from) add('doc_date >= ?', f.from)
  if (f.to) add('doc_date <= ?', f.to)
  const limit = Math.min(Math.max(perPage, 1), 50)
  const offset = (Math.max(page, 1) - 1) * limit
  const rows = await q(
    payload,
    `SELECT collection, doc_id, title, identifier, url, content_type, department, ward, doc_date, is_demo,
       ts_headline('english', body, websearch_to_tsquery('english', $1), 'MaxWords=30,MinWords=12,StartSel=<mark>,StopSel=</mark>') AS snippet,
       ( CASE WHEN lower(identifier) = lower($1) THEN 10 ELSE 0 END
       + ts_rank(tsv, websearch_to_tsquery('english', $1)) * 2
       + similarity(title, $1) ) AS rank,
       count(*) OVER () AS total
     FROM civic.search_documents WHERE ${where.join(' AND ')}
     ORDER BY rank DESC, doc_date DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`,
    params,
  )
  return {
    total: rows[0] ? Number(rows[0].total) : 0,
    hits: rows.map((r) => ({
      collection: r.collection, docId: r.doc_id, title: r.title, identifier: r.identifier, url: r.url,
      contentType: r.content_type, department: r.department, ward: r.ward,
      date: r.doc_date ? new Date(r.doc_date).toISOString() : null, isDemo: r.is_demo,
      snippet: r.snippet ?? '', rank: Number(r.rank),
    })),
  }
}
