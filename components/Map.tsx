'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
// @ts-ignore - No types available for @mapbox/mapbox-gl-draw
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
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11')
  const [currentHeatmapStyle, setCurrentHeatmapStyle] = useState(heatmapStyle)
  const [drawingActive, setDrawingActive] = useState(false)
  const [instructions, setInstructions] = useState('')
  
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

    // Initialize draw with custom styling and controls
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        line_string: false,
        polygon: true,
        trash: true
      },
      styles: [
        // Active polygon style
        {
          'id': 'gl-draw-polygon-fill-active',
          'type': 'fill',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          'paint': {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2
          }
        },
        // Inactive polygon style
        {
          'id': 'gl-draw-polygon-fill-inactive',
          'type': 'fill',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          'paint': {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1
          }
        },
        // Polygon outline
        {
          'id': 'gl-draw-polygon-stroke-active',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          'layout': {
            'line-cap': 'round',
            'line-join': 'round'
          },
          'paint': {
            'line-color': '#3b82f6',
            'line-width': 2,
            'line-dasharray': [0.2, 2]
          }
        },
        // Vertex point
        {
          'id': 'gl-draw-polygon-and-line-vertex-active',
          'type': 'circle',
          'filter': ['all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point']
          ],
          'paint': {
            'circle-radius': 6,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#3b82f6'
          }
        },
        // Point style
        {
          'id': 'point-style',
          'type': 'circle',
          'filter': ['all',
            ['==', '$type', 'Point'],
            ['==', 'meta', 'feature']
          ],
          'paint': {
            'circle-radius': 8,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
          }
        }
      ]
    });

    map.current.addControl(draw.current, 'top-left')

    // Handle draw events with better user feedback
    map.current.on('draw.create', (e: any) => {
      if (onDrawCreate && e.features && e.features.length > 0) {
        // Don't delete the feature immediately, let user see it
        const feature = e.features[0];
        onDrawCreate(feature);
        
        // Change style to show completion
        if (draw.current) {
          const featureId = feature.id;
          draw.current.setFeatureProperty(featureId, 'active', false);
          
          // Auto-remove after a short delay
          setTimeout(() => {
            draw.current?.delete(featureId);
            // Return to draw mode if still in polygon mode
            if (drawMode === 'polygon') {
              draw.current?.changeMode('draw_polygon');
            }
          }, 1500);
        }
      }
    });

    // Handle draw mode changes
    map.current.on('draw.modechange', (e: any) => {
      if (e.mode === 'draw_polygon') {
        // Show instructions when starting to draw
        // You can customize or remove this based on your UI needs
        console.log('Click on the map to start drawing a polygon. Double-click to complete.');
      }
    });

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
      // Remove existing layers and sources
      const layersToRemove = [
        'red-heat', 'yellow-heat', 'green-heat', 
        'feedback-dots'
      ]
      
      layersToRemove.forEach(layer => {
        if (mapInstance.getLayer(layer)) {
          mapInstance.removeLayer(layer)
        }
      })
      
      if (mapInstance.getSource('heatmap')) {
        mapInstance.removeSource('heatmap')
      }

      // Add heatmap source
      mapInstance.addSource('heatmap', {
        type: 'geojson',
        data: heatmapData
      })

      // Red heatmap (unsafe areas - 1-2 stars) - Enhanced blob style
      mapInstance.addLayer({
        id: 'red-heat',
        type: 'heatmap',
        source: 'heatmap',
        filter: ['<', ['get', 'weight'], 0.4],
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 0.4, 1.5],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 15, 2.5],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(139, 0, 0, 0.1)',      // Dark red center
            0.3, 'rgba(178, 34, 34, 0.3)',    // Fire brick
            0.5, 'rgba(220, 20, 60, 0.5)',    // Crimson
            0.7, 'rgba(255, 69, 0, 0.7)',     // Red orange
            0.85, 'rgba(255, 99, 71, 0.8)',   // Tomato
            1, 'rgba(255, 160, 122, 0.9)'     // Light salmon edge
          ],
          'heatmap-radius': [
            'interpolate', 
            ['exponential', 1.5], 
            ['zoom'], 
            5, 25,    // Larger radius at low zoom
            10, 45,   // Medium radius
            15, 80,   // Large radius at high zoom
            20, 120   // Very large for detailed view
          ],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 15, 0.95]
        }
      })

      // Orange/Yellow heatmap (moderate areas - ~3 stars) - Enhanced blob style
      mapInstance.addLayer({
        id: 'yellow-heat',
        type: 'heatmap',
        source: 'heatmap',
        filter: ['all', ['>=', ['get', 'weight'], 0.4], ['<', ['get', 'weight'], 0.6]],
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 0, 0.6, 1.3],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 15, 2.0],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(184, 134, 11, 0.1)',    // Dark orange center
            0.3, 'rgba(217, 119, 6, 0.3)',     // Orange
            0.5, 'rgba(245, 158, 11, 0.5)',    // Amber
            0.7, 'rgba(251, 191, 36, 0.7)',    // Yellow-orange
            0.85, 'rgba(254, 240, 138, 0.8)',  // Light yellow
            1, 'rgba(255, 251, 235, 0.9)'      // Very light yellow edge
          ],
          'heatmap-radius': [
            'interpolate', 
            ['exponential', 1.4], 
            ['zoom'], 
            5, 20,    // Medium radius at low zoom
            10, 38,   // Medium radius
            15, 70,   // Large radius at high zoom
            20, 100   // Large for detailed view
          ],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 15, 0.85]
        }
      })

      // Green heatmap (safe areas - 4-5 stars) - Enhanced blob style
      mapInstance.addLayer({
        id: 'green-heat',
        type: 'heatmap',
        source: 'heatmap',
        filter: ['>=', ['get', 'weight'], 0.6],
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0.6, 0, 1, 1.2],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 15, 1.8],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.1, 'rgba(0, 100, 0, 0.1)',       // Dark green center
            0.3, 'rgba(34, 139, 34, 0.3)',     // Forest green
            0.5, 'rgba(50, 205, 50, 0.5)',     // Lime green
            0.7, 'rgba(124, 252, 0, 0.7)',     // Lawn green
            0.85, 'rgba(173, 255, 47, 0.8)',   // Green yellow
            1, 'rgba(240, 255, 240, 0.9)'      // Honeydew edge
          ],
          'heatmap-radius': [
            'interpolate', 
            ['exponential', 1.3], 
            ['zoom'], 
            5, 18,    // Smaller radius for safe areas
            10, 35,   // Medium radius
            15, 65,   // Large radius at high zoom
            20, 90    // Large for detailed view
          ],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 15, 0.8]
        }
      })

      // Enhanced feedback dots with better visibility
      mapInstance.addLayer({
        id: 'feedback-dots',
        type: 'circle',
        source: 'heatmap',
        minzoom: 12,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3,
            14, 6,
            18, 10,
            22, 15
          ],
          'circle-color': [
            'case',
            ['<', ['get', 'weight'], 0.4], '#dc2626',      // Red (unsafe)
            ['<', ['get', 'weight'], 0.6], '#f59e0b',      // Orange (moderate)
            '#16a34a'                                       // Green (safe)
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 1,
            14, 2,
            18, 3
          ],
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
          'circle-stroke-opacity': 0.8
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

  // Update drawing mode when prop changes
  useEffect(() => {
    if (!draw.current) return;
    
    if (drawMode === 'polygon') {
      draw.current.changeMode('draw_polygon');
      setDrawingActive(true);
      setInstructions('Click on the map to start drawing. Click to add points. Double-click to complete.');
    } else if (drawMode === 'point') {
      draw.current.changeMode('draw_point');
      setDrawingActive(true);
      setInstructions('Click on the map to add a point.');
    } else {
      draw.current.changeMode('simple_select');
      setDrawingActive(false);
      setInstructions('');
    }
  }, [drawMode])

  const styles = [
    { id: 'dark', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'light', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
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
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Drawing Instructions */}
      {drawingActive && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{instructions}</span>
            <button 
              onClick={() => {
                draw.current?.deleteAll();
                setDrawingActive(false);
                if (onDrawCreate) onDrawCreate(null);
              }}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
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