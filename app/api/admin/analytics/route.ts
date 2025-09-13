import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '../../../../lib/db'
import User from '../../../../models/User'
import Rating from '../../../../models/Rating'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.roles?.includes('admin') && !session?.user?.roles?.includes('moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // Get date ranges for analytics
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // User Analytics
    const totalUsers = await User.countDocuments()
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfToday } })
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: startOfWeek } })
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } })

    // User growth over last 12 months
    const userGrowthData = await User.aggregate([
      {
        $match: { createdAt: { $gte: startOfYear } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    // Rating Analytics
    const totalRatings = await Rating.countDocuments()
    const pendingRatings = await Rating.countDocuments({ status: 'pending' })
    const approvedRatings = await Rating.countDocuments({ status: 'approved' })
    const rejectedRatings = await Rating.countDocuments({ status: 'rejected' })

    const ratingsToday = await Rating.countDocuments({ createdAt: { $gte: startOfToday } })
    const ratingsThisWeek = await Rating.countDocuments({ createdAt: { $gte: startOfWeek } })
    const ratingsThisMonth = await Rating.countDocuments({ createdAt: { $gte: startOfMonth } })

    // Rating distribution by score ranges
    const safetyDistribution = await Rating.aggregate([
      { $match: { status: 'approved' } },
      {
        $bucket: {
          groupBy: '$scores.safety',
          boundaries: [0, 3, 6, 8, 10],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ])

    const amenitiesDistribution = await Rating.aggregate([
      { $match: { status: 'approved' } },
      {
        $bucket: {
          groupBy: '$scores.amenities',
          boundaries: [0, 3, 6, 8, 10],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ])

    const livabilityDistribution = await Rating.aggregate([
      { $match: { status: 'approved' } },
      {
        $bucket: {
          groupBy: '$scores.livability',
          boundaries: [0, 3, 6, 8, 10],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ])

    // Average scores
    const averageScores = await Rating.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: null,
          avgSafety: { $avg: '$scores.safety' },
          avgAmenities: { $avg: '$scores.amenities' },
          avgLivability: { $avg: '$scores.livability' }
        }
      }
    ])

    // Daily activity over last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dailyActivity = await Rating.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ])

    // Geographic distribution (top cities)
    const cityDistribution = await Rating.aggregate([
      { $match: { status: 'approved', city: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    // Geometry type distribution
    const geometryDistribution = await Rating.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$geometry.type',
          count: { $sum: 1 }
        }
      }
    ])

    return NextResponse.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        growthData: userGrowthData
      },
      ratings: {
        total: totalRatings,
        pending: pendingRatings,
        approved: approvedRatings,
        rejected: rejectedRatings,
        newToday: ratingsToday,
        newThisWeek: ratingsThisWeek,
        newThisMonth: ratingsThisMonth,
        dailyActivity: dailyActivity,
        averageScores: averageScores[0] || { avgSafety: 0, avgAmenities: 0, avgLivability: 0 },
        distributions: {
          safety: safetyDistribution,
          amenities: amenitiesDistribution,
          livability: livabilityDistribution
        },
        cityDistribution: cityDistribution,
        geometryDistribution: geometryDistribution
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
