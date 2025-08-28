import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Rating from '@/models/Rating'
import { requireAdmin } from '@/lib/auth'
import { updateRatingStatusSchema } from '@/lib/zod-schemas'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validatedFields = updateRatingStatusSchema.parse(body)
    const { id } = await params

    await dbConnect()

    const rating = await Rating.findByIdAndUpdate(
      id,
      { status: validatedFields.status },
      { new: true }
    )

    if (!rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Rating status updated',
      rating: {
        id: rating._id,
        status: rating.status,
      }
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
    await requireAdmin()
    const { id } = await params
    await dbConnect()

    const rating = await Rating.findByIdAndDelete(id)

    if (!rating) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Rating deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete rating error:', error)
    
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
