import { useState, useEffect, useCallback } from 'react'
import { Map } from 'mapbox-gl'

export function useBbox(map: Map | null) {
  const [bbox, setBbox] = useState<number[] | null>(null)

  const updateBbox = useCallback(() => {
    if (!map) return
    
    const bounds = map.getBounds()
    const newBbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ]
    setBbox(newBbox)
  }, [map])

  useEffect(() => {
    if (!map) return

    // Initial bbox
    updateBbox()

    // Debounced move handler
    let timeoutId: NodeJS.Timeout
    const handleMove = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateBbox, 300)
    }

    map.on('moveend', handleMove)
    map.on('zoomend', handleMove)

    return () => {
      map.off('moveend', handleMove)
      map.off('zoomend', handleMove)
      clearTimeout(timeoutId)
    }
  }, [map, updateBbox])

  return bbox
}
