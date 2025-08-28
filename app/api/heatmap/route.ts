import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Rating from '@/models/Rating'
import { heatmapQuerySchema } from '@/lib/zod-schemas'
import { parseBbox, isValidBbox, createBboxPolygon, quantizeCentroid } from '@/lib/geo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bbox = searchParams.get('bbox')
    const category = searchParams.get('category') || 'safety'
    const zoom = parseInt(searchParams.get('zoom') || '10')

    if (!bbox) {
      return NextResponse.json(
        { error: 'bbox parameter is required' },
        { status: 400 }
      )
    }

    const validatedQuery = heatmapQuerySchema.parse({
      bbox,
      category,
      zoom
    })

    const bboxCoords = parseBbox(validatedQuery.bbox)
    if (!isValidBbox(bboxCoords)) {
      return NextResponse.json(
        { error: 'Invalid bbox coordinates' },
        { status: 400 }
      )
    }

    await dbConnect()

    const bboxPolygon = createBboxPolygon(bboxCoords)

    // Query ratings within bbox
    const ratings = await Rating.find({
      status: 'approved',
      centroid: {
        $geoWithin: {
          $geometry: bboxPolygon
        }
      }
    }).select('centroid scores')

    // Group by quantized grid cells and aggregate
    const cellMap = new Map<string, { scores: number[], count: number }>()

    ratings.forEach(rating => {
      const [lng, lat] = rating.centroid.coordinates
      const quantized = quantizeCentroid([lng, lat])
      const cellKey = `${quantized[0]},${quantized[1]}`
      
      const score = rating.scores[validatedQuery.category as keyof typeof rating.scores]
      
      if (!cellMap.has(cellKey)) {
        cellMap.set(cellKey, { scores: [], count: 0 })
      }
      
      const cell = cellMap.get(cellKey)!
      cell.scores.push(score)
      cell.count++
    })

    // Convert to GeoJSON features
    const features = Array.from(cellMap.entries()).map(([cellKey, data]) => {
      const [lng, lat] = cellKey.split(',').map(Number)
      const averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      const weight = averageScore / 10 // Normalize to 0-1

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          weight,
          count: data.count,
          averageScore: Math.round(averageScore * 10) / 10
        }
      }
    })

    const featureCollection = {
      type: 'FeatureCollection',
      features
    }

    return NextResponse.json(featureCollection)
  } catch (error) {
    console.error('Heatmap error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
