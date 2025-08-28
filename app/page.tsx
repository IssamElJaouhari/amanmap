'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Plus, User, LogOut, Shield, Building, Home } from 'lucide-react'
import Map from '@/components/Map'
import AuthDialog from '@/components/AuthDialog'
import AddRatingPanel from '@/components/AddRatingPanel'
import Legend from '@/components/Legend'
import { CreateRatingInput } from '@/lib/zod-schemas'

export default function HomePage() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<'safety' | 'amenities' | 'livability'>('safety')
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showAddRating, setShowAddRating] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [drawnFeature, setDrawnFeature] = useState<any>(null)
  const [currentDrawMode, setCurrentDrawMode] = useState<'point' | 'polygon' | null>(null)

  const categories = [
    { id: 'safety', label: 'Safety', icon: Shield, color: 'bg-red-500' },
    { id: 'amenities', label: 'Amenities', icon: Building, color: 'bg-blue-500' },
    { id: 'livability', label: 'Livability', icon: Home, color: 'bg-green-500' },
  ] as const

  const handleAddRating = () => {
    if (!session) {
      setShowAuthDialog(true)
      return
    }
    setShowAddRating(true)
  }

  const handleSubmitRating = async (data: CreateRatingInput) => {
    console.log('🚀 Frontend: Starting rating submission with data:', data)

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      console.log('📡 Frontend: API response status:', response.status)

      const result = await response.json()
      console.log('📋 Frontend: API response data:', result)

      if (!response.ok) {
        console.error('❌ Frontend: API error response:', result)
        throw new Error(result.error || `HTTP ${response.status}: Failed to submit rating`)
      }

      if (result.success) {
        console.log('✅ Frontend: Rating submitted successfully:', result.ratingId)
      }

      return result
    } catch (error: any) {
      console.error('💥 Frontend: Rating submission failed:', {
        message: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthDialog(false)
    // Optionally open add rating panel after successful auth
    setTimeout(() => setShowAddRating(true), 100)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">AmanMap</h1>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedCategory === category.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Auth & Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAddRating}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Rating</span>
              </button>

              {status === 'loading' ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : session ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 hidden sm:inline">
                    {session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-2 py-1 rounded"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthDialog(true)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        <Map
          category={selectedCategory}
          onDrawCreate={(feature) => {
            setDrawnFeature(feature)
            setCurrentDrawMode(null)
          }}
          drawMode={currentDrawMode}
        />

        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 z-10">
            <Legend category={selectedCategory} />
            <button
              onClick={() => setShowLegend(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Hide legend
            </button>
          </div>
        )}

        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Show legend
          </button>
        )}
      </div>

      {/* Dialogs */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Add Rating Panel */}
      {showAddRating && (
        <AddRatingPanel
          isOpen={showAddRating}
          onClose={() => setShowAddRating(false)}
          onSubmit={handleSubmitRating}
          isAuthenticated={!!session}
          onAuthRequired={() => setShowAuthDialog(true)}
          drawnFeature={drawnFeature}
          onDrawModeChange={setCurrentDrawMode}
        />
      )}
    </div>
  )
}
