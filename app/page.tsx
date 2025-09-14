'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { MapPin, User, LogOut, Shield, Building, Home, Menu, X } from 'lucide-react'
import Map from '@/components/Map'
import AuthDialog from '@/components/AuthDialog'
import AddRatingPanel from '@/components/AddRatingPanel'
import Legend from '@/components/Legend'
import AccountDrawer from '@/components/AccountDrawer'
import { CreateRatingInput } from '@/lib/zod-schemas'

export default function HomePage() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<'safety' | 'amenities' | 'livability'>('safety')
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showAddRating, setShowAddRating] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [drawnFeature, setDrawnFeature] = useState<any>(null)
  const [currentDrawMode, setCurrentDrawMode] = useState<'point' | 'polygon' | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false)

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
      {/* Enhanced Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex-shrink-0 flex items-center">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-200"></div>
                <img 
                  src="/amanmaplogo.png" 
                  alt="AmanMap" 
                  className="h-14 w-auto relative z-10 transform transition-transform duration-300 group-hover:scale-110"
                />
              </div>
            </div>
            
            {/* Centered Navigation - Hidden on mobile */}
            <div className="hidden sm:flex sm:items-center">

              {/* Desktop Navigation */}
              <nav className="hidden sm:flex sm:items-center sm:space-x-1">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setIsMobileMenuOpen(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{category.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
            
            {/* Auth Section */}
            <div className="flex items-center space-x-2">
              {/* Mobile Menu Button - Only visible on mobile */}
              <div className="sm:hidden">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="h-8 w-8" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Desktop Auth Section */}
              <div className="hidden sm:block">
                {status === 'loading' ? (
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                ) : session ? (
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setIsAccountDrawerOpen(true)}
                      className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Account menu"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="sr-only">Open user menu</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthDialog(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <User className="-ml-1 mr-2 h-4 w-4" />
                    Sign in
                  </button>
                )}
              </div>

              {/* Mobile Auth - Only visible on mobile */}
              <div className="sm:hidden">
                {status === 'authenticated' ? (
                  <button
                    onClick={() => setIsAccountDrawerOpen(true)}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Account menu"
                  >
                    <User className="h-6 w-6" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthDialog(true)}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Sign in"
                  >
                    <User className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-in menu from right */}
      <div className={`
        sm:hidden fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl border-l border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile menu header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation categories */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Categories</h3>
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{category.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Auth section */}
          <div className="border-t border-gray-200 p-4">
            {status === 'authenticated' ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsAccountDrawerOpen(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-5 h-5" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowAuthDialog(true)
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 p-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
              >
                <User className="w-5 h-5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col items-end space-y-3">
          {currentDrawMode && (
            <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col items-center animate-fade-in">
              <p className="text-sm text-gray-600 mb-2">
                {currentDrawMode === 'point' ? 'Click on map to add point' : 'Click to draw area'}
              </p>
              <button
                onClick={() => setCurrentDrawMode(null)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
              >
                <span>Cancel</span>
              </button>
            </div>
          )}
          
          <button
            onClick={handleAddRating}
            className="flex items-center justify-center space-x-2 px-6 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors transform hover:scale-105"
            title="Add rating"
          >
            <MapPin className="h-5 w-5" />
            <span>Add Rating</span>
          </button>
        </div>
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
          selectedFeature={drawnFeature}
          onClearDrawing={() => {
            setDrawnFeature(null);
            setCurrentDrawMode(null);
          }}
          deviceId="default-device-id" // You might want to generate a proper device ID
          drawMode={currentDrawMode}
        />
      )}
      {/* Account Drawer */}
      <AccountDrawer 
        isOpen={isAccountDrawerOpen} 
        onClose={() => setIsAccountDrawerOpen(false)} 
      />
    </div>
  )
}
