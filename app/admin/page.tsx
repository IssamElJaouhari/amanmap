'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Trash2, Eye, Clock, AlertTriangle } from 'lucide-react'

interface Rating {
  _id: string
  userId: { email: string }
  geometry: { type: string }
  scores: { safety: number; amenities: number; livability: number }
  note?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin') && !session?.user?.roles?.includes('moderator')) {
      router.push('/')
      return
    }

    fetchRatings()
  }, [session, status, selectedStatus])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage community ratings and content moderation</p>
        </div>

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
    </div>
  )
}
