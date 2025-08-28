import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Rating from '@/models/Rating'
import { requireAuth } from '@/lib/auth'
import { flagRatingSchema } from '@/lib/zod-schemas'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const validatedFields = flagRatingSchema.parse(body)

    await dbConnect()

    // Find the rating
    const rating = await Rating.findById(validatedFields.ratingId)
    if (!rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      )
    }

    // Update status to pending for review
    rating.status = 'pending'
    await rating.save()

    // In a real app, you'd also create a Flag record with the reason
    // For MVP, we just mark as pending

    return NextResponse.json({
      message: 'Rating flagged for review',
      ratingId: rating._id
    })
  } catch (error) {
    console.error('Flag rating error:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
