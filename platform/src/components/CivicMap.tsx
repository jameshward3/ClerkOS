'use client'
/**
 * MapLibre map with an always-available HTML alternative (the list rendered by
 * the page). Basemap tiles come from NEXT_PUBLIC_MAP_STYLE_URL (provider
 * adapter); without one the map draws only our own data on a neutral canvas.
 * Project routes differ from ward fills by line pattern AND color.
 */
import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

type FC = { type: 'FeatureCollection'; features: any[] }
export type MapProps = {
  label: string
  projects?: FC
  places?: FC
  wards?: FC | null
  selectedId?: string | null
  onSelect?: (id: string) => void
  linkBase?: string
}

const PHASE_DASH: Record<string, number[]> = { planned: [1, 2], design: [3, 2], bidding: [3, 2], awarded: [3, 2], construction: [1, 0], substantially_complete: [6, 2], closed_out: [6, 2] }

export function CivicMap({ label, projects, places, wards, linkBase }: MapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let map: any
    let cancelled = false
    ;(async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        if (cancelled || !ref.current) return
        maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs')
        const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL
        map = new maplibregl.Map({
          container: ref.current,
          style: styleUrl || { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#EEF1F4' } }] },
          center: [-74.233, 40.770], zoom: 13.4, attributionControl: { compact: false },
          cooperativeGestures: true,
        })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
        map.on('load', () => {
          if (wards?.features.length) {
            map.addSource('wards', { type: 'geojson', data: wards })
            map.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': ['match', ['get', 'ward'], 'north', '#DCE8F2', 'south', '#F3E7CA', 'east', '#D9ECE8', 'west', '#EADDE6', '#eee'], 'fill-opacity': 0.7 } })
            map.addLayer({ id: 'ward-line', type: 'line', source: 'wards', paint: { 'line-color': '#526171', 'line-width': 1.5 } })
          }
          if (projects?.features.length) {
            map.addSource('projects', { type: 'geojson', data: projects })
            for (const [phase, dash] of Object.entries(PHASE_DASH)) {
              map.addLayer({ id: `proj-${phase}`, type: 'line', source: 'projects', filter: ['==', ['get', 'phase'], phase],
                layout: { 'line-cap': 'butt' },
                paint: { 'line-color': ['case', ['==', ['get', 'phase'], 'construction'], '#0B2035', ['in', ['get', 'phase'], ['literal', ['closed_out', 'substantially_complete']]], '#24664E', '#70551F'], 'line-width': 6, 'line-dasharray': dash } })
            }
            map.on('click', (e: any) => {
              const f = map.queryRenderedFeatures(e.point).find((x: any) => x.properties?.slug)
              if (f && linkBase) window.location.href = `${linkBase}/${f.properties.slug}`
            })
            const bounds = new maplibregl.LngLatBounds()
            projects.features.forEach((f: any) => (f.geometry.coordinates.flat ? f.geometry.coordinates : []).forEach((c: any) => Array.isArray(c[0]) ? c.forEach((cc: any) => bounds.extend(cc)) : bounds.extend(c)))
            if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 })
          }
          if (places?.features.length) {
            map.addSource('places', { type: 'geojson', data: places })
            map.addLayer({ id: 'places', type: 'circle', source: 'places', paint: { 'circle-radius': 8, 'circle-color': ['match', ['get', 'jurisdiction'], 'municipal', '#0B2035', '#FFFFFF'], 'circle-stroke-color': '#0B2035', 'circle-stroke-width': 3 } })
            map.on('click', 'places', (e: any) => { const s = e.features?.[0]?.properties?.slug; if (s && linkBase) window.location.href = `${linkBase}/${s}` })
          }
        })
      } catch (e) {
        setError('The interactive map could not load. All information is available in the list.')
      }
    })()
    return () => { cancelled = true; map?.remove() }
  }, [projects, places, wards, linkBase])

  return (
    <figure style={{ margin: 0 }}>
      <div ref={ref} className="map-frame" role="region" aria-label={`${label} (interactive map; the same information is in the list)`} />
      {error && <p role="status" className="alert alert--warning">{error}</p>}
      {!process.env.NEXT_PUBLIC_MAP_STYLE_URL && <figcaption className="meta">Basemap not configured in this environment — only platform data is drawn. See docs/operations.md (map tile provider).</figcaption>}
    </figure>
  )
}
