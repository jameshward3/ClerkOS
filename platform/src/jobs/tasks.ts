/**
 * Durable background tasks (Payload jobs, persisted in Postgres).
 * Run by the dedicated worker (scripts/worker.ts) — never by visitor requests.
 * Each task is idempotent: re-running after a crash cannot duplicate effects.
 */
import type { CollectionSlug, Payload, TaskConfig } from 'payload'
import { SEARCH_REGISTRY, WORKFLOW_COLLECTIONS } from '../fields/workflow'
import { runImport } from '../lib/imports'
import { sendMail } from '../lib/mail'
import { indexDoc, isPubliclyVisible, removeDoc } from '../lib/search'
import { q } from '../lib/db'

export async function publicationSweep(payload: Payload, now = new Date()) {
  const iso = now.toISOString()
  let published = 0, archived = 0
  for (const slug of WORKFLOW_COLLECTIONS) {
    const due = await payload.find({ collection: slug as CollectionSlug, depth: 0, limit: 200, overrideAccess: true,
      where: { and: [{ workflowStatus: { equals: 'scheduled' } }, { publishAt: { less_than_equal: iso } }] } })
    for (const d of due.docs) {
      await payload.update({ collection: slug as CollectionSlug, id: d.id, data: { workflowStatus: 'published' } as any, overrideAccess: true, context: { system: true } })
      published++
    }
    const expired = await payload.find({ collection: slug as CollectionSlug, depth: 0, limit: 200, overrideAccess: true,
      where: { and: [{ workflowStatus: { equals: 'published' } }, { expiresAt: { less_than_equal: iso } }] } })
    for (const d of expired.docs) {
      await payload.update({ collection: slug as CollectionSlug, id: d.id, data: { workflowStatus: 'archived' } as any, overrideAccess: true, context: { system: true } })
      archived++
    }
  }
  return { published, archived }
}

const MAX_ATTEMPTS = 5
export async function deliverOutbox(payload: Payload, limit = 50) {
  // Atomically claim rows so two workers can never send the same message.
  const claimed = await q(payload,
    `UPDATE outbox SET status='sending', attempts = attempts + 1, updated_at = now()
      WHERE id IN (SELECT id FROM outbox WHERE status IN ('pending','failed') AND attempts < $1
                     AND (next_attempt_at IS NULL OR next_attempt_at <= now())
                   ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED)
      RETURNING id, dedupe_key, "to", subject, text, attempts`, [MAX_ATTEMPTS, limit])
  let sent = 0, failed = 0, suppressed = 0
  for (const m of claimed) {
    const subId = /:sub:(\d+)$/.exec(m.dedupe_key)?.[1]
    if (subId && !m.dedupe_key.startsWith('confirm:')) {
      const [sub] = await q(payload, 'SELECT status FROM subscriptions WHERE id=$1', [Number(subId)])
      if (!sub || sub.status !== 'confirmed') {
        await q(payload, `UPDATE outbox SET status='suppressed', updated_at=now() WHERE id=$1`, [m.id]); suppressed++; continue
      }
    }
    try {
      const r = await sendMail({ to: m.to, subject: m.subject, text: m.text })
      await q(payload, `UPDATE outbox SET status='sent', provider_message_id=$2, sent_at=now(), last_error=NULL, updated_at=now() WHERE id=$1`, [m.id, r.messageId])
      sent++
    } catch (e) {
      const backoffMin = 2 ** Number(m.attempts)
      await q(payload, `UPDATE outbox SET status='failed', last_error=$2, next_attempt_at = now() + ($3 || ' minutes')::interval, updated_at=now() WHERE id=$1`,
        [m.id, String((e as Error).message).slice(0, 500), String(backoffMin)])
      failed++
    }
  }
  return { sent, failed, suppressed }
}

export async function reconcileSearch(payload: Payload) {
  let indexed = 0, removed = 0
  for (const [slug, map] of SEARCH_REGISTRY) {
    const all = await payload.find({ collection: slug as CollectionSlug, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    const visible = new Set<string>()
    for (const d of all.docs as any[]) {
      const entry = isPubliclyVisible(d) ? map(d) : null
      if (entry) { await indexDoc(payload, { ...entry, collection: slug, docId: String(d.id), isDemo: d.verificationStatus === 'demo' }); visible.add(String(d.id)); indexed++ }
    }
    const rows = await q(payload, 'SELECT doc_id FROM civic.search_documents WHERE collection=$1', [slug])
    for (const r of rows) if (!visible.has(r.doc_id)) { await removeDoc(payload, slug, r.doc_id); removed++ }
  }
  return { indexed, removed }
}

const everyMinute = [{ cron: '* * * * *', queue: 'maintenance' }]

export const tasks: TaskConfig[] = [
  { slug: 'publicationSweep', retries: 3, schedule: everyMinute, outputSchema: [{ name: 'published', type: 'number' }, { name: 'archived', type: 'number' }],
    handler: async ({ req }) => ({ output: await publicationSweep(req.payload) }) },
  { slug: 'deliverOutbox', retries: 3, schedule: everyMinute, outputSchema: [{ name: 'sent', type: 'number' }, { name: 'failed', type: 'number' }, { name: 'suppressed', type: 'number' }],
    handler: async ({ req }) => ({ output: await deliverOutbox(req.payload) }) },
  { slug: 'reconcileSearch', retries: 2, schedule: [{ cron: '17 * * * *', queue: 'maintenance' }], outputSchema: [{ name: 'indexed', type: 'number' }, { name: 'removed', type: 'number' }],
    handler: async ({ req }) => ({ output: await reconcileSearch(req.payload) }) },
  { slug: 'importBatch', retries: 0,
    inputSchema: [{ name: 'batchId', type: 'number', required: true }, { name: 'action', type: 'text', required: true }],
    outputSchema: [{ name: 'result', type: 'text' }],
    handler: async ({ input, req }: any) => ({ output: { result: await runImport(req.payload, Number(input.batchId), input.action) } }) },
] as TaskConfig[]
