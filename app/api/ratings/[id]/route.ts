import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Rating from '@/models/Rating'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { updateRatingStatusSchema } from '@/lib/zod-schemas'
import { z } from 'zod'

// Schema for updating a rating
const updateRatingSchema = z.object({
  scores: z.object({
    safety: z.number().min(1).max(5),
    amenities: z.number().min(1).max(5),
    livability: z.number().min(1).max(5),
  }),
  note: z.string().max(500).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { id } = await params
    
    await dbConnect()
    
    // Find the rating first to check ownership
    const rating = await Rating.findById(id)
    if (!rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      )
    }
    
    // Check if user is the owner or admin
    if (String(rating.userId) !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to update this rating' },
        { status: 403 }
      )
    }

    let updatedRating;
    
    // If admin is updating status
    if (session.user.isAdmin && 'status' in body) {
      const validatedFields = updateRatingStatusSchema.parse(body)
      updatedRating = await Rating.findByIdAndUpdate(
        id,
        { status: validatedFields.status },
        { new: true }
      )
      
      return NextResponse.json({
        message: 'Rating status updated',
        rating: updatedRating
      })
    }
    
    // If user is updating their own rating
    const validatedFields = updateRatingSchema.parse(body)
    updatedRating = await Rating.findByIdAndUpdate(
      id,
      { 
        scores: validatedFields.scores,
        note: validatedFields.note,
        updatedAt: new Date()
      },
      { new: true }
    )
    
    return NextResponse.json({
      message: 'Rating updated successfully',
      rating: updatedRating
    })
  } catch (error: any) {
    console.error('Update rating error:', error)
    
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error?.name === 'ZodError') {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    await dbConnect()
    
    // Find the rating first to check ownership
    const rating = await Rating.findById(id)
    if (!rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      )
    }
    
    // Check if user is the owner or admin
    if (String(rating.userId) !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to delete this rating' },
        { status: 403 }
      )
    }
    
    // Delete the rating
    await Rating.findByIdAndDelete(id)

    return NextResponse.json({
      message: 'Rating deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete rating error:', error)
    
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
