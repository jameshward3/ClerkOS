/**
 * The ONLY way public pages read CMS data. Forces overrideAccess:false with no
 * user, so collection access rules (published-only) always apply — the Local
 * API would otherwise bypass access control by default.
 */
import type { CollectionSlug, Where } from 'payload'
import { getClient } from './payload'
import type { Locale } from './i18n'

type FindOpts = { where?: Where; sort?: string; limit?: number; page?: number; depth?: number; locale?: Locale; pagination?: boolean }

export async function findPublic<S extends CollectionSlug>(collection: S, o: FindOpts = {}) {
  const payload = await getClient()
  return payload.find({ collection, overrideAccess: false, user: null, depth: o.depth ?? 0, limit: Math.min(o.limit ?? 20, 500), ...o, fallbackLocale: 'en' } as any)
}

export async function findOnePublic<S extends CollectionSlug>(collection: S, where: Where, o: Omit<FindOpts, 'where'> = {}) {
  const r = await findPublic(collection, { ...o, where, limit: 1 })
  return (r.docs[0] ?? null) as any
}

/** True when a localized field has no Spanish value (so the page shows English with a notice). */
export async function lacksSpanish(collection: CollectionSlug, id: number | string, field = 'title') {
  const payload = await getClient()
  const es = await payload.findByID({ collection, id, overrideAccess: false, user: null, locale: 'es', fallbackLocale: false as any, depth: 0, disableErrors: true } as any)
  return !es || !(es as any)[field]
}
