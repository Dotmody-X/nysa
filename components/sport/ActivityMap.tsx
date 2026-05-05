'use client'

import { useEffect, useRef, useState } from 'react'
import type { GpxPoint } from '@/lib/parseGpx'

interface Props {
  points: GpxPoint[]
  height?: number | string
  borderRadius?: number
}

// Injecte le CSS Leaflet une seule fois via un <link> (pas @import)
function ensureLeafletCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id   = 'leaflet-css'
  link.rel  = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

export function ActivityMap({ points, height = 320, borderRadius = 12 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return

    ensureLeafletCss()

    // Nettoyage instance précédente (hot-reload)
    if (mapRef.current) {
      try { mapRef.current.remove() } catch {}
      mapRef.current = null
    }

    let cancelled = false

    import('leaflet').then(L => {
      if (cancelled || !containerRef.current) return

      try {
        // Fix icônes Leaflet + webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        })

        const latlngs = points
          .filter(p => p.lat !== 0 && p.lon !== 0)
          .map(p => [p.lat, p.lon] as [number, number])

        if (latlngs.length < 2) return

        const map = L.map(containerRef.current, {
          zoomControl:      false,
          attributionControl: false,
          scrollWheelZoom:  false,
          dragging:         true,
          touchZoom:        true,
        })
        mapRef.current = map

        // Dark tiles CartoDB
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map)

        // Route orange NYSA
        L.polyline(latlngs, {
          color:    '#F2542D',
          weight:   3.5,
          opacity:  0.92,
          lineCap:  'round',
          lineJoin: 'round',
        }).addTo(map)

        // Marqueur départ — teal
        L.marker(latlngs[0], {
          icon: L.divIcon({
            html: '<div style="width:12px;height:12px;border-radius:50%;background:#0E9594;border:2px solid #F5DFBB;box-shadow:0 0 8px rgba(14,149,148,0.6)"></div>',
            className: '', iconAnchor: [6, 6],
          }),
        }).addTo(map)

        // Marqueur arrivée — orange
        L.marker(latlngs[latlngs.length - 1], {
          icon: L.divIcon({
            html: '<div style="width:12px;height:12px;border-radius:50%;background:#F2542D;border:2px solid #F5DFBB;box-shadow:0 0 8px rgba(242,84,45,0.6)"></div>',
            className: '', iconAnchor: [6, 6],
          }),
        }).addTo(map)

        map.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32] })
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // Style overrides après init
        const style = document.createElement('style')
        style.textContent = `
          .leaflet-container { background: #0C0C0C !important; }
          .leaflet-control-zoom a { background: #161616 !important; color: #F5DFBB !important; border-color: rgba(245,223,187,0.12) !important; }
          .leaflet-control-zoom a:hover { background: #1E1E1E !important; }
          .leaflet-control-attribution { display: none !important; }
        `
        document.head.appendChild(style)

      } catch (err) {
        console.error('[ActivityMap] Leaflet init error:', err)
        setError('Impossible de charger la carte.')
      }
    }).catch(err => {
      console.error('[ActivityMap] Leaflet import error:', err)
      setError('Leaflet non disponible.')
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        try { mapRef.current.remove() } catch {}
        mapRef.current = null
      }
    }
  }, [points])

  if (error) {
    return (
      <div style={{ height, width: '100%', borderRadius, background: '#161616', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 24 }}>🗺️</span>
        <p style={{ fontSize: 12, color: 'rgba(245,223,187,0.4)', fontFamily: 'var(--font-display)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius,
        overflow: 'hidden',
        background: '#0C0C0C',
        position: 'relative',
      }}
    />
  )
}
