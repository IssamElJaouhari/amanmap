'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useBbox } from '@/hooks/useBbox'
import useSWR from 'swr'

import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

interface MapProps {
  category: 'safety' | 'amenities' | 'livability'
  onDrawCreate?: (feature: any) => void
  drawMode?: 'point' | 'polygon' | null
  heatmapStyle?: 'density' | 'intensity' | 'classic'
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Map({ category, onDrawCreate, drawMode = null, heatmapStyle = 'density' }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v11')
  const [currentHeatmapStyle, setCurrentHeatmapStyle] = useState(heatmapStyle)
  
  const bbox = useBbox(map.current)
  
  // Fetch heatmap data
  const { data: heatmapData, error } = useSWR(
    bbox ? `/api/heatmap?bbox=${bbox.join(',')}&category=${category}&zoom=${map.current?.getZoom() || 10}` : null,
    fetcher,
    { refreshInterval: 60000 } // Cache for 60s
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error('Mapbox token not found')
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-7.62, 33.57], // Morocco center
      zoom: 5.2,
    })

    // Add controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right')
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    // Initialize draw
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        polygon: true,
        trash: true
      },
      modes: {
        ...MapboxDraw.modes,
      }
    })

    map.current.addControl(draw.current, 'top-left')

    // Handle draw events
    map.current.on('draw.create', (e: any) => {
      if (onDrawCreate && e.features && e.features.length > 0) {
        onDrawCreate(e.features[0])
        draw.current?.deleteAll()
      }
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyle)
    }
  }, [mapStyle])

  // Update heatmap layer
  useEffect(() => {
    if (!map.current || !heatmapData) return

    const mapInstance = map.current

    const updateHeatmap = () => {
      // Remove existing heatmap layers (remove layers before source)
      if (mapInstance.getLayer('heatmap-point')) {
        mapInstance.removeLayer('heatmap-point')
      }
      if (mapInstance.getLayer('heatmap')) {
        mapInstance.removeLayer('heatmap')
      }
      if (mapInstance.getSource('heatmap')) {
        mapInstance.removeSource('heatmap')
      }

      // Add heatmap source
      mapInstance.addSource('heatmap', {
        type: 'geojson',
        data: heatmapData
      })

      // Get safety-based heatmap configuration
      const getSafetyHeatmapConfig = () => {
        // Create weight-based color mapping for safety visualization
        const getSafetyColors = (style: string) => {
          // All heatmap colors must use heatmap-density, not data expressions
          switch (style) {
            case 'intensity':
              return [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0,0,0,0)',            // Transparent
                0.1, 'rgba(220,38,38,0.4)',    // Deep red - dangerous areas
                0.2, 'rgba(239,68,68,0.5)',    // Red - dangerous
                0.3, 'rgba(251,146,60,0.6)',   // Orange - unsafe
                0.4, 'rgba(245,158,11,0.65)',  // Amber - caution
                0.5, 'rgba(234,179,8,0.7)',    // Yellow - moderate
                0.6, 'rgba(163,230,53,0.75)',  // Yellow-green - fair
                0.7, 'rgba(101,163,13,0.8)',   // Light green - good
                0.8, 'rgba(34,197,94,0.85)',   // Green - safe
                0.9, 'rgba(22,163,74,0.9)',    // Dark green - very safe
                1, 'rgba(21,128,61,0.95)'      // Deep green - extremely safe
              ]
            case 'classic':
              return [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0,0,0,0)',            // Transparent
                0.2, 'rgba(185,28,28,0.4)',    // Dark red - dangerous
                0.3, 'rgba(220,38,38,0.5)',    // Red
                0.4, 'rgba(239,68,68,0.6)',    // Light red
                0.5, 'rgba(251,146,60,0.65)',  // Orange
                0.6, 'rgba(234,179,8,0.7)',    // Yellow - moderate
                0.7, 'rgba(163,230,53,0.75)',  // Yellow-green
                0.8, 'rgba(34,197,94,0.8)',    // Green - safe
                0.9, 'rgba(22,163,74,0.85)',   // Dark green
                1, 'rgba(21,128,61,0.9)'       // Deep green - very safe
              ]
            default: // 'density' - smooth gradient
              return [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0,0,0,0)',            // Transparent
                0.1, 'rgba(185,28,28,0.3)',    // Dark red start
                0.2, 'rgba(220,38,38,0.4)',    // Red
                0.3, 'rgba(239,68,68,0.5)',    // Light red
                0.4, 'rgba(251,146,60,0.6)',   // Orange
                0.5, 'rgba(234,179,8,0.65)',   // Yellow - moderate safety
                0.6, 'rgba(163,230,53,0.7)',   // Yellow-green
                0.7, 'rgba(101,163,13,0.75)',  // Light green
                0.8, 'rgba(34,197,94,0.8)',    // Green - safe areas
                0.9, 'rgba(22,163,74,0.85)',   // Dark green
                1, 'rgba(21,128,61,0.9)'       // Deep green - very safe
              ]
          }
        }

        switch (currentHeatmapStyle) {
          case 'intensity':
            return {
              weight: [
                'interpolate',
                ['exponential', 1.5],
                ['get', 'weight'],
                0, 0.2,     // Dangerous areas get strong weight
                0.3, 0.8,   // Moderate areas
                0.6, 1.2,   // Good areas
                1, 2.0      // Very safe areas get maximum weight
              ],
              intensity: [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1.2,
                6, 2.2,
                12, 3.8,
                15, 5.0
              ],
              color: getSafetyColors('intensity'),
              radius: [25, 35, 55, 75, 95, 125],
              opacity: [0.85, 0.9, 0.85, 0.7, 0.5]
            }
          case 'classic':
            return {
              weight: [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                0, 0.3,     // Show dangerous areas prominently
                0.5, 1.0,   // Moderate visibility for medium safety
                1, 1.6      // Strong visibility for safe areas
              ],
              intensity: [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1.0,
                6, 1.8,
                12, 2.8,
                15, 3.5
              ],
              color: getSafetyColors('classic'),
              radius: [18, 28, 45, 65, 85, 105],
              opacity: [0.8, 0.85, 0.8, 0.65, 0.45]
            }
          default: // 'density' - smooth safety visualization
            return {
              weight: [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                0, 0.2,     // Low weight for dangerous areas
                0.2, 0.4,   // Build up gradually
                0.4, 0.7,   // Medium weight for moderate safety
                0.6, 1.1,   // Higher weight for good safety
                0.8, 1.6,   // Strong weight for high safety
                1, 2.2      // Maximum weight for perfect safety
              ],
              intensity: [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.8,
                3, 1.2,
                6, 2.0,
                9, 2.8,
                12, 3.8,
                15, 4.5
              ],
              color: getSafetyColors('density'),
              radius: [12, 20, 32, 48, 68, 88],
              opacity: [0.8, 0.85, 0.8, 0.65, 0.45]
            }
        }
      }

      const config = getSafetyHeatmapConfig()

      // Add heatmap layer with configurable styling
      mapInstance.addLayer({
        id: 'heatmap',
        type: 'heatmap',
        source: 'heatmap',
        maxzoom: 15,
        paint: {
          'heatmap-weight': config.weight as any,
          'heatmap-intensity': config.intensity as any,
          'heatmap-color': config.color as any,
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, config.radius[0],
            3, config.radius[1],
            6, config.radius[2],
            9, config.radius[3],
            12, config.radius[4],
            15, config.radius[5]
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, config.opacity[0],
            6, config.opacity[1],
            9, config.opacity[2],
            12, config.opacity[3],
            15, config.opacity[4]
          ]
        }
      })

      // Add circle layer for individual points at high zoom with safety colors
      mapInstance.addLayer({
        id: 'heatmap-point',
        type: 'circle',
        source: 'heatmap',
        minzoom: 10,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, ['interpolate', ['linear'], ['get', 'weight'], 0, 2, 1, 6],
            16, ['interpolate', ['linear'], ['get', 'weight'], 0, 8, 1, 24]
          ],
          // Safety-based color scheme for individual points
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 'rgb(185,28,28)',      // Dark red - very dangerous (0-1)
            0.15, 'rgb(220,38,38)',   // Red - dangerous (1-1.5)
            0.25, 'rgb(239,68,68)',   // Light red - unsafe (2.5)
            0.35, 'rgb(251,146,60)',  // Orange - caution (3.5)
            0.45, 'rgb(234,179,8)',   // Yellow - moderate safety (4.5)
            0.55, 'rgb(163,230,53)',  // Yellow-green - fair (5.5)
            0.65, 'rgb(101,163,13)',  // Light green - good (6.5)
            0.75, 'rgb(34,197,94)',   // Green - safe (7.5)
            0.85, 'rgb(22,163,74)',   // Dark green - very safe (8.5)
            1, 'rgb(21,128,61)'       // Deep green - extremely safe (10)
          ],
          'circle-stroke-color': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 'rgba(255,255,255,0.9)',     // White border for red areas
            0.5, 'rgba(255,255,255,0.8)',   // White border for yellow areas
            1, 'rgba(0,0,0,0.3)'            // Dark border for green areas
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 1,
            16, 2
          ],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0,
            10, 0.8,
            16, 0.9
          ]
        }
      })
    }

    // Update heatmap when style loads or immediately if already loaded
    if (mapInstance.isStyleLoaded()) {
      updateHeatmap()
    } else {
      mapInstance.on('style.load', updateHeatmap)
    }

    // Cleanup
    return () => {
      mapInstance.off('style.load', updateHeatmap)
    }
  }, [heatmapData])

  // Toggle draw mode
  useEffect(() => {
    if (!draw.current) return

    if (drawMode === 'point') {
      draw.current.changeMode('draw_point')
    } else if (drawMode === 'polygon') {
      draw.current.changeMode('draw_polygon')
    } else {
      draw.current.changeMode('simple_select')
      draw.current.deleteAll()
    }
  }, [drawMode])

  const styles = [
    { id: 'light', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
    { id: 'dark', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
  ]

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load map data</p>
          <p className="text-sm text-gray-600">Please check your Mapbox token</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        {/* Map Style Switcher */}
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
          <p className="text-xs font-medium text-gray-700 px-2 mb-1">Map Style</p>
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => setMapStyle(style.url)}
              className={`w-full px-3 py-1 text-sm rounded ${
                mapStyle === style.url
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
