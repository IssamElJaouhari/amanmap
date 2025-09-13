'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Trash2, Eye, Clock, AlertTriangle, Users, MessageSquare, TrendingUp, BarChart3, MapPin, Calendar } from 'lucide-react'
import StatsCard from '../../components/charts/StatsCard'
import LineChart from '../../components/charts/LineChart'
import BarChart from '../../components/charts/BarChart'
import DoughnutChart from '../../components/charts/DoughnutChart'
import RadarChart from '../../components/charts/RadarChart'
import AdminSidebar from '../../components/admin/AdminSidebar'

interface Rating {
  _id: string
  userId: { email: string }
  geometry: { type: string }
  scores: { safety: number; amenities: number; livability: number }
  note?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

interface AnalyticsData {
  users: {
    total: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
    growthData: Array<{ _id: { year: number; month: number }; count: number }>
  }
  ratings: {
    total: number
    pending: number
    approved: number
    rejected: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
    dailyActivity: Array<{ _id: { year: number; month: number; day: number }; count: number }>
    averageScores: { avgSafety: number; avgAmenities: number; avgLivability: number }
    distributions: {
      safety: Array<{ _id: number; count: number }>
      amenities: Array<{ _id: number; count: number }>
      livability: Array<{ _id: number; count: number }>
    }
    cityDistribution: Array<{ _id: string; count: number }>
    geometryDistribution: Array<{ _id: string; count: number }>
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'analytics' | 'moderation'>('analytics')

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin') && !session?.user?.roles?.includes('moderator')) {
      router.push('/')
      return
    }

    fetchAnalytics()
    if (activeSection === 'moderation') {
      fetchRatings()
    }
  }, [session, status, selectedStatus, activeSection])

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const response = await fetch('/api/admin/analytics')
      const data = await response.json()
      
      if (response.ok) {
        setAnalytics(data)
      } else {
        console.error('Failed to fetch analytics:', data.error)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const fetchRatings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ratings?status=${selectedStatus}&limit=50`)
      const data = await response.json()
      
      if (response.ok) {
        setRatings(data.ratings)
      } else {
        console.error('Failed to fetch ratings:', data.error)
      }
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRatingStatus = async (ratingId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setActionLoading(ratingId)
      const response = await fetch(`/api/ratings/${ratingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Remove from current list if status changed
        setRatings(prev => prev.filter(r => r._id !== ratingId))
      } else {
        const data = await response.json()
        alert(`Failed to update rating: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      alert('Failed to update rating')
    } finally {
      setActionLoading(null)
    }
  }

  const deleteRating = async (ratingId: string) => {
    if (!confirm('Are you sure you want to delete this rating?')) return

    try {
      setActionLoading(ratingId)
      const response = await fetch(`/api/ratings/${ratingId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setRatings(prev => prev.filter(r => r._id !== ratingId))
      } else {
        const data = await response.json()
        alert(`Failed to delete rating: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting rating:', error)
      alert('Failed to delete rating')
    } finally {
      setActionLoading(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session?.user?.roles?.includes('admin') && !session?.user?.roles?.includes('moderator')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Helper functions for chart data
  const prepareUserGrowthData = () => {
    if (!analytics?.users.growthData) return { labels: [], datasets: [] }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const labels = analytics.users.growthData.map(item => 
      `${monthNames[item._id.month - 1]} ${item._id.year}`
    )
    
    return {
      labels,
      datasets: [{
        label: 'New Users',
        data: analytics.users.growthData.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  }

  const prepareDailyActivityData = () => {
    if (!analytics?.ratings.dailyActivity) return { labels: [], datasets: [] }
    
    const labels = analytics.ratings.dailyActivity.map(item => 
      `${item._id.month}/${item._id.day}`
    )
    
    return {
      labels,
      datasets: [{
        label: 'Daily Ratings',
        data: analytics.ratings.dailyActivity.map(item => item.count),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  }

  const prepareRatingStatusData = () => {
    if (!analytics?.ratings) return { labels: [], datasets: [] }
    
    return {
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [{
        data: [analytics.ratings.approved, analytics.ratings.pending, analytics.ratings.rejected],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderColor: ['#059669', '#d97706', '#dc2626'],
        borderWidth: 2
      }]
    }
  }

  const prepareScoreDistributionData = () => {
    if (!analytics?.ratings.distributions) return { labels: [], datasets: [] }
    
    const labels = ['Poor (0-3)', 'Fair (3-6)', 'Good (6-8)', 'Excellent (8-10)']
    
    return {
      labels,
      datasets: [
        {
          label: 'Safety',
          data: analytics.ratings.distributions.safety.map(item => item.count),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        },
        {
          label: 'Amenities',
          data: analytics.ratings.distributions.amenities.map(item => item.count),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'Livability',
          data: analytics.ratings.distributions.livability.map(item => item.count),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        }
      ]
    }
  }

  const prepareAverageScoresData = () => {
    if (!analytics?.ratings.averageScores) return { labels: [], datasets: [] }
    
    return {
      labels: ['Safety', 'Amenities', 'Livability'],
      datasets: [{
        label: 'Average Scores',
        data: [
          analytics.ratings.averageScores.avgSafety,
          analytics.ratings.averageScores.avgAmenities,
          analytics.ratings.averageScores.avgLivability
        ],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(99, 102, 241)'
      }]
    }
  }

  const prepareCityDistributionData = () => {
    if (!analytics?.ratings.cityDistribution) return { labels: [], datasets: [] }
    
    return {
      labels: analytics.ratings.cityDistribution.map(item => item._id || 'Unknown'),
      datasets: [{
        label: 'Ratings Count',
        data: analytics.ratings.cityDistribution.map(item => item.count),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userEmail={session?.user?.email}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        <div className="lg:pl-8 pt-16 lg:pt-8 px-4 sm:px-6 lg:px-8 pb-8">

          {/* Content based on active section */}
          {activeSection === 'analytics' ? (
          <div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : analytics ? (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Total Users"
                    value={analytics.users.total}
                    change={`+${analytics.users.newThisMonth} this month`}
                    changeType="positive"
                    icon={Users}
                    description="Registered community members"
                  />
                  <StatsCard
                    title="Total Ratings"
                    value={analytics.ratings.total}
                    change={`+${analytics.ratings.newThisWeek} this week`}
                    changeType="positive"
                    icon={MessageSquare}
                    description="Community feedback submissions"
                  />
                  <StatsCard
                    title="Pending Reviews"
                    value={analytics.ratings.pending}
                    change={`${analytics.ratings.newToday} today`}
                    changeType={analytics.ratings.pending > 10 ? 'negative' : 'neutral'}
                    icon={Clock}
                    description="Awaiting moderation"
                  />
                  <StatsCard
                    title="Approval Rate"
                    value={`${Math.round((analytics.ratings.approved / analytics.ratings.total) * 100)}%`}
                    changeType="positive"
                    icon={CheckCircle}
                    description="Content approval percentage"
                  />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* User Growth */}
                  <LineChart
                    title="User Growth Over Time"
                    data={prepareUserGrowthData()}
                    height={350}
                  />

                  {/* Daily Activity */}
                  <LineChart
                    title="Daily Rating Activity (Last 30 Days)"
                    data={prepareDailyActivityData()}
                    height={350}
                  />

                  {/* Rating Status Distribution */}
                  <DoughnutChart
                    title="Rating Status Distribution"
                    data={prepareRatingStatusData()}
                    height={350}
                    centerText="Total"
                    centerValue={analytics.ratings.total}
                  />

                  {/* Average Scores Radar */}
                  <RadarChart
                    title="Average Community Scores"
                    data={prepareAverageScoresData()}
                    height={350}
                  />
                </div>

                {/* Additional Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Score Distribution */}
                  <BarChart
                    title="Score Distribution by Category"
                    data={prepareScoreDistributionData()}
                    height={400}
                  />

                  {/* Geographic Distribution */}
                  <BarChart
                    title="Top Cities by Rating Count"
                    data={prepareCityDistributionData()}
                    height={400}
                    horizontal={true}
                  />
                </div>

                {/* Geometry Type Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Types</h3>
                    <div className="space-y-3">
                      {analytics.ratings.geometryDistribution.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {item._id === 'Point' ? 'Point Ratings' : 'Area Ratings'}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Today</span>
                        <span className="text-sm font-bold text-green-600">+{analytics.ratings.newToday}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">This Week</span>
                        <span className="text-sm font-bold text-blue-600">+{analytics.ratings.newThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">This Month</span>
                        <span className="text-sm font-bold text-purple-600">+{analytics.ratings.newThisMonth}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Safety</span>
                        <span className="text-sm font-bold text-red-600">
                          {analytics.ratings.averageScores.avgSafety.toFixed(1)}/10
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Amenities</span>
                        <span className="text-sm font-bold text-blue-600">
                          {analytics.ratings.averageScores.avgAmenities.toFixed(1)}/10
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Livability</span>
                        <span className="text-sm font-bold text-green-600">
                          {analytics.ratings.averageScores.avgLivability.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load analytics</h3>
                <p className="text-gray-600">Please try refreshing the page.</p>
              </div>
            )}
          </div>
          ) : (
            <div>
              {/* Status Tabs */}
              <div className="mb-6">
                <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'pending', label: 'Pending Review', icon: Clock },
                    { key: 'approved', label: 'Approved', icon: CheckCircle },
                    { key: 'rejected', label: 'Rejected', icon: XCircle },
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedStatus(tab.key as any)}
                        className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                          selectedStatus === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
                </div>
              </div>

              {/* Ratings List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : ratings.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No ratings found</h3>
                <p className="text-gray-600">No {selectedStatus} ratings at the moment.</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {ratings.map((rating) => (
                    <li key={rating._id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-900">
                                {rating.userId?.email || 'Anonymous'}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {rating.geometry.type}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(rating.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center space-x-6">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Safety:</span> {rating.scores.safety}/10
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Amenities:</span> {rating.scores.amenities}/10
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Livability:</span> {rating.scores.livability}/10
                            </div>
                          </div>

                          {rating.note && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                                <span className="font-medium">Note:</span> {rating.note}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {selectedStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => updateRatingStatus(rating._id, 'approved')}
                                disabled={actionLoading === rating._id}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => updateRatingStatus(rating._id, 'rejected')}
                                disabled={actionLoading === rating._id}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => deleteRating(rating._id)}
                            disabled={actionLoading === rating._id}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
