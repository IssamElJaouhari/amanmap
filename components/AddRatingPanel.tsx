'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, MapPin, Square, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { createRatingSchema, type CreateRatingInput } from '@/lib/zod-schemas'

interface AddRatingPanelProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateRatingInput) => Promise<void>
  isAuthenticated: boolean
  onAuthRequired: () => void
  drawnFeature?: any
  onDrawModeChange?: (mode: 'point' | 'polygon' | null) => void
}

export default function AddRatingPanel({
  isOpen,
  onClose,
  onSubmit,
  isAuthenticated,
  onAuthRequired,
  drawnFeature,
  onDrawModeChange
}: AddRatingPanelProps) {
  const [drawMode, setDrawMode] = useState<'point' | 'polygon' | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Update selectedFeature when drawnFeature changes
  useEffect(() => {
    if (drawnFeature) {
      setSelectedFeature(drawnFeature)
      setDrawMode(null)
    }
  }, [drawnFeature])

  // Create a form schema without geometry (we'll add it manually)
  const formSchema = z.object({
    scores: z.object({
      safety: z.number().min(0).max(10),
      amenities: z.number().min(0).max(10),
      livability: z.number().min(0).max(10),
    }),
    note: z.string().max(140).optional(),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scores: { safety: 5, amenities: 5, livability: 5 },
      note: ''
    }
  })

  const handleStartDrawing = (mode: 'point' | 'polygon') => {
    if (!isAuthenticated) {
      onAuthRequired()
      return
    }
    setDrawMode(mode)
    setSelectedFeature(null)
    setError(null)
    setSubmitStatus(null)
    onDrawModeChange?.(mode)
  }

  const handleFeatureDrawn = (feature: any) => {
    setSelectedFeature(feature)
    setDrawMode(null)
  }

  const handleSubmitRating = async (data: CreateRatingInput) => {
    console.log('🎯 handleSubmitRating called with data:', data)
    console.log('🎯 selectedFeature state:', selectedFeature)
    
    if (!selectedFeature) {
      console.log('❌ No selectedFeature - showing error')
      setError('Please draw a point or polygon on the map first')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Get device ID from cookie or generate one
      let deviceId = document.cookie
        .split('; ')
        .find(row => row.startsWith('deviceId='))
        ?.split('=')[1]

      if (!deviceId) {
        deviceId = crypto.randomUUID()
        document.cookie = `deviceId=${deviceId}; path=/; max-age=${365 * 24 * 60 * 60}` // 1 year
      }

      const submitData: CreateRatingInput = {
        geometry: selectedFeature.geometry,
        scores: data.scores,
        note: data.note || undefined,
        deviceId
      }

      console.log('🚀 AddRatingPanel: Submitting rating data:', submitData)
      const result = await onSubmit(submitData)
      console.log('✅ AddRatingPanel: Rating submitted successfully:', result)
      
      setSubmitStatus('success')
      form.reset()
      clearDrawing()
    } catch (err: any) {
      console.error('❌ AddRatingPanel: Submit rating error:', err)
      
      // Handle specific error types
      if (err.message.includes('Authentication required') || err.message.includes('Unauthorized')) {
        setError('Please log in to submit a rating')
        onAuthRequired()
      } else if (err.message.includes('Rate limit')) {
        setError('You have reached the daily limit of 10 ratings. Please try again tomorrow.')
      } else {
        setError(err.message || 'Failed to submit rating. Please try again.')
      }
      
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearDrawing = () => {
    setSelectedFeature(null)
    setDrawMode(null)
    onDrawModeChange?.(null)
    setError(null)
    setSubmitStatus(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add Rating</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Draw on map */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              1. Select location on map
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleStartDrawing('point')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                  drawMode === 'point'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Point
              </button>
              <button
                onClick={() => handleStartDrawing('polygon')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                  drawMode === 'polygon'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Square className="w-4 h-4" />
                Area
              </button>
              {selectedFeature && (
                <button
                  onClick={clearDrawing}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {selectedFeature && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                ✓ Location selected ({selectedFeature.geometry.type})
              </div>
            )}
          </div>

          {/* Step 2: Rate categories */}
          <form 
            onSubmit={(e) => {
              console.log('📋 Form onSubmit triggered!')
              console.log('📋 Form errors:', form.formState.errors)
              console.log('📋 Form values:', form.getValues())
              form.handleSubmit(
                (data) => {
                  console.log('✅ Form validation passed, calling handleSubmitRating')
                  // Add geometry from selectedFeature to form data
                  const submitData = {
                    ...data,
                    geometry: selectedFeature.geometry
                  }
                  console.log('📦 Complete submit data:', submitData)
                  handleSubmitRating(submitData)
                },
                (errors) => {
                  console.log('❌ Form validation failed:', errors)
                }
              )(e)
            }} 
            className="space-y-4"
          >
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                2. Rate this location
              </h3>
              
              {/* Safety */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Safety
                  </label>
                  <span className="text-sm text-gray-500">
                    {form.watch('scores.safety')}/10
                  </span>
                </div>
                <input
                  {...form.register('scores.safety', { valueAsNumber: true })}
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  className="slider w-full"
                />
              </div>

              {/* Amenities */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Amenities
                  </label>
                  <span className="text-sm text-gray-500">
                    {form.watch('scores.amenities')}/10
                  </span>
                </div>
                <input
                  {...form.register('scores.amenities', { valueAsNumber: true })}
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  className="slider w-full"
                />
              </div>

              {/* Livability */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Livability
                  </label>
                  <span className="text-sm text-gray-500">
                    {form.watch('scores.livability')}/10
                  </span>
                </div>
                <input
                  {...form.register('scores.livability', { valueAsNumber: true })}
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  className="slider w-full"
                />
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Optional note (private)
              </label>
              <textarea
                {...form.register('note')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                maxLength={140}
                placeholder="Brief note about this location (not shown publicly)"
              />
              <p className="mt-1 text-xs text-gray-500">
                {form.watch('note')?.length || 0}/140 characters
              </p>
            </div>

            {/* Error/Success messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {submitStatus === 'success' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">Rating submitted successfully!</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={!selectedFeature || isSubmitting || submitStatus === 'success'}
              onClick={(e) => {
                console.log('🔘 Submit button clicked!')
                console.log('🔍 selectedFeature:', selectedFeature)
                console.log('🔍 isSubmitting:', isSubmitting)
                console.log('🔍 submitStatus:', submitStatus)
                
                // If button is disabled, prevent submission
                if (!selectedFeature || isSubmitting || submitStatus === 'success') {
                  console.log('❌ Button is disabled, preventing submission')
                  e.preventDefault()
                  return
                }
                
                console.log('✅ Button enabled, form should submit')
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </form>

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Your rating helps others discover safe and livable areas</p>
            <p>• Individual locations are never shown, only aggregated heat</p>
            <p>• Notes are private and used for moderation only</p>
          </div>
        </div>
      </div>
    </div>
  )
}
