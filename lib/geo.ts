// Geospatial utility functions

export function computeCentroid(geometry: any): [number, number] {
  if (geometry.type === 'Point') {
    return geometry.coordinates as [number, number]
  }
  
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates[0] // First ring (exterior)
    let x = 0, y = 0
    for (const coord of coordinates) {
      x += coord[0]
      y += coord[1]
    }
    return [x / coordinates.length, y / coordinates.length]
  }
  
  throw new Error('Unsupported geometry type')
}

export function quantizeCoordinate(coord: number, gridSize: number = 0.001): number {
  return Math.round(coord / gridSize) * gridSize
}

export function quantizeCentroid(centroid: [number, number], gridSize: number = 0.001): [number, number] {
  return [
    quantizeCoordinate(centroid[0], gridSize),
    quantizeCoordinate(centroid[1], gridSize)
  ]
}

export function addJitter(coord: number, maxJitter: number = 0.0003): number {
  const jitter = (Math.random() - 0.5) * 2 * maxJitter
  return coord + jitter
}

export function createBboxPolygon(bbox: number[]) {
  const [minLng, minLat, maxLng, maxLat] = bbox
  return {
    type: 'Polygon',
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]]
  }
}

export function parseBbox(bboxString: string): number[] {
  return bboxString.split(',').map(Number)
}

export function isValidBbox(bbox: number[]): boolean {
  if (bbox.length !== 4) return false
  const [minLng, minLat, maxLng, maxLat] = bbox
  return minLng < maxLng && minLat < maxLat &&
         minLng >= -180 && maxLng <= 180 &&
         minLat >= -90 && maxLat <= 90
}
