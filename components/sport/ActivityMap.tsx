'use client'

import { useEffect, useRef } from 'react'
import type { GpxPoint } from '@/lib/parseGpx'

interface Props {
  points: GpxPoint[]
  height?: number | string
  borderRadius?: number
}

export function ActivityMap({ points, height = 320, borderRadius = 12 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return

    // Évite double init en cas de hot-reload
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    // Import dynamique de Leaflet (client-side uniquement)
    import('leaflet').then(L => {
      // Fix icônes Leaflet avec webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      })

      const latlngs = points.map(p => [p.lat, p.lon] as [number, number])

      const map = L.map(containerRef.current!, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true,
      })

      mapRef.current = map

      // Tuiles dark CartoDB — parfait avec la DA NYSA
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19 }
      ).addTo(map)

      // Route principale — orange accent NYSA
      L.polyline(latlngs, {
        color:   '#F2542D',
        weight:  3.5,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      // Marqueur départ — teal
      const startIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#0E9594;border:2px solid #F5DFBB;box-shadow:0 0 8px rgba(14,149,148,0.6)"></div>`,
        className: '',
        iconAnchor: [6, 6],
      })
      L.marker(latlngs[0], { icon: startIcon }).addTo(map)

      // Marqueur arrivée — orange
      const endIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#F2542D;border:2px solid #F5DFBB;box-shadow:0 0 8px rgba(242,84,45,0.6)"></div>`,
        className: '',
        iconAnchor: [6, 6],
      })
      L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(map)

      // Fit bounds avec padding
      const bounds = L.latLngBounds(latlngs)
      map.fitBounds(bounds, { padding: [32, 32] })

      // Contrôle zoom custom (coin BR)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  return (
    <>
      {/* CSS Leaflet inline — évite l'import global dans globals.css */}
      <style>{`
        @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        .leaflet-container { background: #0C0C0C !important; }
        .leaflet-control-zoom a { background: #161616 !important; color: #F5DFBB !important; border-color: rgba(245,223,187,0.12) !important; }
        .leaflet-control-zoom a:hover { background: #1E1E1E !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
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
    </>
  )
}
