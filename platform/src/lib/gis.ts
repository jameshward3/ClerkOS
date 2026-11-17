/**
 * Ward determination. Authoritative ONLY when a *verified* ward boundary
 * version is effective on the requested date. Unverified or demo geometry can
 * be drawn (labeled) but never yields an authoritative ward.
 */
import type { Payload } from 'payload'
import { q } from './db'

export const BOUNDARY_TOLERANCE_M = 15

export type WardLookup =
  | { status: 'unavailable'; reason: string }
  | { status: 'outside'; message: string }
  | { status: 'ok'; ward: string; authoritative: true; versionId: number; custodian: string }
  | { status: 'ambiguous'; candidates: string[]; message: string; versionId: number }
  | { status: 'illustrative'; ward: string | null; authoritative: false; message: string }

async function effectiveVersion(payload: Payload, kind: 'ward' | 'municipal', verifiedOnly: boolean, onDate: string) {
  const rows = await q(
    payload,
    `SELECT id, verification, custodian FROM civic.boundary_versions
      WHERE kind=$1 AND (effective_from IS NULL OR effective_from <= $2::date)
        AND (effective_to IS NULL OR effective_to > $2::date)
        ${verifiedOnly ? "AND verification='verified'" : ''}
      ORDER BY (verification='verified') DESC, effective_from DESC NULLS LAST, id DESC LIMIT 1`,
    [kind, onDate],
  )
  return rows[0] as { id: number; verification: string; custodian: string } | undefined
}

export async function lookupWard(
  payload: Payload,
  lng: number,
  lat: number,
  opts: { onDate?: string; allowIllustrative?: boolean } = {},
): Promise<WardLookup> {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { status: 'unavailable', reason: 'Invalid coordinates.' }
  }
  const onDate = opts.onDate ?? new Date().toISOString().slice(0, 10)
  const wardV = await effectiveVersion(payload, 'ward', true, onDate)
  const cityV = await effectiveVersion(payload, 'municipal', true, onDate)

  if (!wardV || !cityV) {
    if (opts.allowIllustrative) {
      const demo = await effectiveVersion(payload, 'ward', false, onDate)
      if (demo) {
        const hit = await q(payload,
          `SELECT ward_slug FROM civic.ward_geometries WHERE boundary_version_id=$1 AND ST_Covers(geom, ST_SetSRID(ST_MakePoint($2,$3),4326)) LIMIT 1`,
          [demo.id, lng, lat])
        return { status: 'illustrative', ward: hit[0]?.ward_slug ?? null, authoritative: false,
          message: 'Illustrative development geometry only. This is not an official ward determination.' }
      }
    }
    return { status: 'unavailable', reason: 'Verified ward boundaries have not been published yet. Contact the City Clerk to confirm your ward.' }
  }

  const pt = 'ST_SetSRID(ST_MakePoint($2,$3),4326)'
  const inside = await q(payload, `SELECT 1 FROM civic.municipal_geometries WHERE boundary_version_id=$1 AND ST_Covers(geom, ${pt})`, [cityV.id, lng, lat])
  if (!inside.length) {
    const near = await q(payload,
      `SELECT 1 FROM civic.municipal_geometries WHERE boundary_version_id=$1 AND ST_DWithin(geom::geography, ${pt}::geography, $4)`,
      [cityV.id, lng, lat, BOUNDARY_TOLERANCE_M])
    return { status: 'outside', message: near.length
      ? 'This location is at the edge of the City boundary. Please contact the City Clerk to confirm.'
      : 'This address appears to be outside the City of Orange Township.' }
  }
  const candidates = await q<{ ward_slug: string; covers: boolean }>(payload,
    `SELECT ward_slug, ST_Covers(geom, ${pt}) AS covers FROM civic.ward_geometries
      WHERE boundary_version_id=$1 AND ST_DWithin(geom::geography, ${pt}::geography, $4)`,
    [wardV.id, lng, lat, BOUNDARY_TOLERANCE_M])
  const covering = candidates.filter((c) => c.covers)
  if (candidates.length === 1 && covering.length === 1) {
    return { status: 'ok', ward: covering[0].ward_slug, authoritative: true, versionId: wardV.id, custodian: wardV.custodian }
  }
  if (candidates.length === 0) {
    // Inside the city but in no ward: a data gap. Never guess.
    return { status: 'unavailable', reason: 'No ward covers this location in the published boundary data. Staff have been asked to review.' }
  }
  return { status: 'ambiguous', versionId: wardV.id, candidates: candidates.map((c) => c.ward_slug).sort(),
    message: `This location is within ${BOUNDARY_TOLERANCE_M} m of a ward boundary. Please confirm your ward with the City Clerk.` }
}

/** Validation report for a boundary version: invalid rings, overlaps, gaps vs. municipal outline, containment. */
export async function validateWardVersion(payload: Payload, wardVersionId: number, cityVersionId: number) {
  const [r] = await q(payload,
    `WITH w AS (SELECT ward_slug, geom FROM civic.ward_geometries WHERE boundary_version_id=$1),
          c AS (SELECT ST_Union(geom) g FROM civic.municipal_geometries WHERE boundary_version_id=$2)
     SELECT
       (SELECT count(*) FROM w WHERE NOT ST_IsValid(geom)) AS invalid,
       (SELECT coalesce(sum(ST_Area(ST_Intersection(a.geom,b.geom)::geography)),0) FROM w a JOIN w b ON a.ward_slug < b.ward_slug AND ST_Intersects(a.geom,b.geom)) AS overlap_m2,
       (SELECT ST_Area(ST_Difference(c.g, ST_Union(w.geom))::geography) FROM w, c GROUP BY c.g) AS gap_m2,
       (SELECT ST_Area(ST_Difference(ST_Union(w.geom), c.g)::geography) FROM w, c GROUP BY c.g) AS outside_m2,
       (SELECT count(*) FROM w) AS wards`,
    [wardVersionId, cityVersionId])
  return { invalid: Number(r.invalid), overlapM2: Number(r.overlap_m2), gapM2: Number(r.gap_m2 ?? 0), outsideM2: Number(r.outside_m2 ?? 0), wards: Number(r.wards) }
}

export async function wardGeoJSON(payload: Payload) {
  const v = await effectiveVersion(payload, 'ward', false, new Date().toISOString().slice(0, 10))
  if (!v) return null
  const rows = await q(payload, `SELECT ward_slug, ST_AsGeoJSON(geom, 6)::json AS g FROM civic.ward_geometries WHERE boundary_version_id=$1`, [v.id])
  return {
    verification: v.verification as 'verified' | 'unverified' | 'demo',
    custodian: v.custodian,
    fc: { type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', properties: { ward: r.ward_slug }, geometry: r.g })) },
  }
}

export async function projectGeoJSON(payload: Payload, projectIds: number[]) {
  if (!projectIds.length) return { type: 'FeatureCollection', features: [] }
  const rows = await q(payload,
    `SELECT project_id, label, verification, ST_AsGeoJSON(geom, 6)::json AS g FROM civic.project_geometries WHERE project_id = ANY($1::int[])`,
    [projectIds])
  return { type: 'FeatureCollection', features: rows.map((r) => ({ type: 'Feature', properties: { projectId: r.project_id, label: r.label, verification: r.verification }, geometry: r.g })) }
}
