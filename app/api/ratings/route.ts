import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Rating from '@/models/Rating'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { createRatingSchema } from '@/lib/zod-schemas'
import { computeCentroid, quantizeCentroid, addJitter } from '@/lib/geo'
import { checkRateLimit } from '@/lib/rate-limit'
import { containsProfanity } from '@/lib/profanity'

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/ratings - Starting rating submission')
  
  try {
    // Parse request body first
    const body = await request.json()
    console.log('📝 Request body received:', JSON.stringify(body, null, 2))
    
    // Validate input data
    const validatedFields = createRatingSchema.parse(body)
    console.log('✅ Input validation passed')
    
    // Check authentication
    let session
    try {
      session = await requireAuth()
      console.log('👤 User authenticated:', { userId: session.user.id, email: session.user.email })
    } catch (authError: any) {
      console.error('🚫 Authentication failed:', authError.message)
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 })
    }
    
    // Connect to database
    try {
      await dbConnect()
      console.log('🔗 Database connected successfully')
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError.message)
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please ensure MongoDB is running.',
          details: 'Check your MONGODB_URI environment variable and MongoDB service.'
        },
        { status: 503 }
      )
    }

    // Rate limiting
    const rateLimitKey = session.user.id
    const rateLimit = checkRateLimit(rateLimitKey, 10) // 10 per day
    console.log('⏱️ Rate limit check:', { allowed: rateLimit.allowed, remaining: rateLimit.remaining })
    
    if (!rateLimit.allowed) {
      console.log('❌ Rate limit exceeded for user:', session.user.id)
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
    console.log('📍 Computed centroid:', centroid)
    
    // Quantize centroid for privacy
    const quantizedCentroid = quantizeCentroid(centroid)
    console.log('🔒 Quantized centroid:', quantizedCentroid)
    
    // Add slight jitter
    const jitteredCentroid: [number, number] = [
      addJitter(quantizedCentroid[0]),
      addJitter(quantizedCentroid[1])
    ]
    console.log('🎲 Jittered centroid:', jitteredCentroid)

    // Check for profanity in note
    let status = 'approved'
    if (validatedFields.note && containsProfanity(validatedFields.note)) {
      status = 'pending'
      console.log('⚠️ Profanity detected, setting status to pending')
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
    console.log('📄 Rating document to create:', JSON.stringify(ratingDoc, null, 2))

    // Create rating
    const rating = await Rating.create(ratingDoc)
    console.log('✅ Rating created successfully:', { 
      id: rating._id, 
      userId: rating.userId,
      scores: rating.scores,
      status: rating.status 
    })

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
    
    console.log('🎉 Sending success response:', response)
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('❌ Create rating error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error.errors && { zodErrors: error.errors })
    })
    
    if (error.message === 'Unauthorized') {
      console.log('🚫 Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.name === 'ZodError') {
      console.log('📋 Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    // MongoDB specific errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      console.error('🗄️ Database error:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    console.error('💥 Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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
