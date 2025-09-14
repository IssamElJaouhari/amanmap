import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Rating from '@/models/Rating'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { createRatingSchema } from '@/lib/zod-schemas'
import { computeCentroid, quantizeCentroid, addJitter } from '@/lib/geo'
import { checkEnhancedRateLimit } from '@/lib/enhanced-rate-limit'
import { InputSanitizer, EnhancedProfanityFilter } from '@/lib/input-sanitizer'

export async function POST(request: NextRequest) {
  try {
    // Parse request body first
    const body = await request.json()
    
    // Validate input data
    const validatedFields = createRatingSchema.parse(body)
    
    // Check authentication
    let session
    try {
      session = await requireAuth()
    } catch (authError: any) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Connect to database
    try {
      await dbConnect()
    } catch (dbError: any) {
      console.error('Database connection failed')
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Rate limiting
    const rateLimitKey = session.user.id
    const rateLimit = checkEnhancedRateLimit(rateLimitKey, 'RATING_SUBMIT')
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime,
          remaining: rateLimit.remaining
        },
        { status: 429 }
      )
    }

    // Compute centroid
    const centroid = computeCentroid(validatedFields.geometry)
    
    // Quantize centroid for privacy
    const quantizedCentroid = quantizeCentroid(centroid)
    
    // Add slight jitter
    const jitteredCentroid: [number, number] = [
      addJitter(quantizedCentroid[0]),
      addJitter(quantizedCentroid[1])
    ]

    // Enhanced content analysis
    let status = 'approved'
    if (validatedFields.note) {
      const sanitizedNote = InputSanitizer.sanitizeText(validatedFields.note, 140)
      const contentAnalysis = EnhancedProfanityFilter.analyzeContent(sanitizedNote)
      
      if (contentAnalysis.hasProfanity || contentAnalysis.isSuspicious || contentAnalysis.riskScore > 30) {
        status = 'pending'
      }
      
      // Update the note with sanitized version
      validatedFields.note = sanitizedNote
    }

    // Prepare rating document
    const ratingDoc = {
      userId: session.user.id,
      geometry: validatedFields.geometry,
      centroid: {
        type: 'Point',
        coordinates: jitteredCentroid
      },
      scores: validatedFields.scores,
      note: validatedFields.note,
      status,
      deviceId: validatedFields.deviceId,
    }

    // Create rating
    const rating = await Rating.create(ratingDoc)

    const response = {
      success: true,
      message: 'Rating created successfully',
      ratingId: rating._id,
      rating: {
        id: rating._id,
        scores: rating.scores,
        status: rating.status,
      },
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('Create rating error:', error.name)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }

    // MongoDB specific errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')

    await dbConnect()

    // If userId is provided, only return ratings for that user
    // Otherwise, check if user is admin and return all ratings
    let query: any = {}
    
    if (userId) {
      if (userId !== session.user.id && !session.user.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      query.userId = userId
    } else if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (status) {
      query.status = status
    }

    const ratings = await Rating.find(query)
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .limit(limit)

    return NextResponse.json({ ratings })
  } catch (error: any) {
    console.error('Get ratings error:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
