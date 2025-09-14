'use client'

import { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  MapPin, 
  Square, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Star, 
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building,
  Home
} from 'lucide-react';
import { createRatingSchema, type CreateRatingInput } from '@/lib/zod-schemas';
import { getCookie, setSecureCookie } from '../lib/cookieUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface FormValues {
  scores: {
    safety: number;
    amenities: number;
    livability: number;
  };
  note: string;
}

interface Geometry {
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][][];
}

interface Feature {
  geometry: Geometry;
  properties?: Record<string, unknown>;
}

interface AddRatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRatingInput) => Promise<void>;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onDrawModeChange?: (mode: 'point' | 'polygon' | null) => void;
  drawMode?: 'point' | 'polygon' | null;
  onFeatureDrawn?: (feature: Feature) => void;
  selectedFeature: Feature | null;
  onClearDrawing: () => void;
  deviceId: string;
  drawnFeature?: Feature | null;
}

export default function AddRatingPanel({
  isOpen,
  onClose,
  onSubmit,
  isAuthenticated,
  onAuthRequired,
  onDrawModeChange,
  drawMode,
  onFeatureDrawn,
  selectedFeature,
  onClearDrawing,
  deviceId,
  drawnFeature
}: AddRatingPanelProps) {
  const [localDrawMode, setLocalDrawMode] = useState<'point' | 'polygon' | null>(null);
  const [localSelectedFeature, setLocalSelectedFeature] = useState<Feature | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>({});

  // Use the prop if provided, otherwise use local state
  const currentDrawMode = drawMode ?? localDrawMode;
  const currentSelectedFeature = selectedFeature ?? localSelectedFeature;

  const categories = [
    { id: 'safety', label: 'Safety', icon: Shield, color: 'bg-red-500' },
    { id: 'amenities', label: 'Amenities', icon: Building, color: 'bg-blue-500' },
    { id: 'livability', label: 'Livability', icon: Home, color: 'bg-green-500' },
  ] as const;

  // Sync local state with props
  useEffect(() => {
    if (drawMode !== undefined) {
      setLocalDrawMode(drawMode);
    }
    if (selectedFeature !== undefined) {
      setLocalSelectedFeature(selectedFeature);
    }
  }, [drawMode, selectedFeature]);

  // Update selectedFeature when drawnFeature changes
  useEffect(() => {
    if (drawnFeature) {
      setLocalSelectedFeature(drawnFeature);
      setLocalDrawMode(null);
      onFeatureDrawn?.(drawnFeature);
    }
  }, [drawnFeature, onFeatureDrawn]);

  // Create a form schema without geometry (we'll add it manually)
  const formSchema = z.object({
    scores: z.object({
      safety: z.number().min(1).max(5),
      amenities: z.number().min(1).max(5),
      livability: z.number().min(1).max(5),
    }),
    note: z.string().max(280).optional(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scores: { safety: 0, amenities: 0, livability: 0 },
      note: ''
    }
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = form;

  const scores = watch('scores');

  // Get device ID from cookie or generate a new one
  const getDeviceId = useCallback((): string => {
    if (typeof window === 'undefined') return '';

    // Check if we already have a device ID in cookies
    const existingId = getCookie('deviceId');
    if (existingId) return existingId;

    // Generate a new device ID and store it securely
    const newDeviceId = `device_${crypto.getRandomValues(new Uint8Array(8)).join('')}`;
    setSecureCookie('deviceId', newDeviceId, 90);
    
    return newDeviceId;
  }, []);

  // Type-safe way to set score values
  const setScore = useCallback((category: keyof FormValues['scores'], value: number) => {
    setValue(`scores.${category}`, value, { shouldValidate: true });
  }, [setValue]);

  const handleFormSubmit: SubmitHandler<FormValues> = useCallback(async (data) => {
    if (!currentSelectedFeature) {
      setError('Please select a location first');
      return;
    }

    const submitData: CreateRatingInput = {
      ...data,
      geometry: currentSelectedFeature.geometry,
      deviceId: getDeviceId()
    };

    await handleSubmitRating(submitData);
  }, [currentSelectedFeature, getDeviceId]);

  const handleSubmitRating = useCallback(async (data: CreateRatingInput) => {
    console.log('🎯 handleSubmitRating called with data:', data);
    console.log('🎯 currentSelectedFeature state:', currentSelectedFeature);

    if (!currentSelectedFeature) {
      console.log('❌ No currentSelectedFeature - showing error');
      setError('Please draw a point or polygon on the map first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
      console.log('✅ AddRatingPanel: Rating submitted successfully');
      setSubmitStatus('success');
      reset();
      onClearDrawing();
    } catch (err: any) {
      console.error('❌ AddRatingPanel: Submit rating error:', err);
      setError(err.message || 'Failed to submit rating. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentSelectedFeature, onClearDrawing, onSubmit, reset]);

  const handleStartDrawing = useCallback((mode: 'point' | 'polygon') => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    const newDrawMode = mode;
    setLocalDrawMode(newDrawMode);
    setLocalSelectedFeature(null);
    setError(null);
    setSubmitStatus(null);
    onDrawModeChange?.(newDrawMode);
  }, [isAuthenticated, onAuthRequired, onDrawModeChange]);

  const handleFeatureDrawn = useCallback((feature: Feature) => {
    setLocalSelectedFeature(feature);
    setLocalDrawMode(null);
    onFeatureDrawn?.(feature);
  }, [onFeatureDrawn]);

  const clearDrawing = useCallback(() => {
    setLocalSelectedFeature(null);
    setLocalDrawMode(null);
    onDrawModeChange?.(null);
    setError(null);
    setSubmitStatus(null);
    reset();
  }, [onDrawModeChange, reset]);

  const renderStars = useCallback((category: keyof FormValues['scores'], value: number) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`p-1 ${(hoveredRating[category] || value) >= star ? 'text-yellow-400' : 'text-gray-300'}`}
        onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [category]: star }))}
        onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [category]: 0 }))}
        onClick={() => {
          setValue(`scores.${category}`, star);
          setHoveredRating(prev => ({ ...prev, [category]: 0 }));
        }}
      >
        <Star className="w-6 h-6 fill-current" />
      </button>
    ));
  }, [hoveredRating, setValue]);

  const renderStepIndicator = useCallback(() => {
    const steps = [
      { number: 1, label: 'Location' },
      { number: 2, label: 'Rate' },
      { number: 3, label: 'Review' }
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isActive || isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.number}
              </div>
              <div
                className={`text-sm font-medium ml-2 ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </div>
              {!isLast && (
                <div className="w-12 h-0.5 bg-gray-200 mx-2"></div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [currentStep]);

  const renderStep = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          <div key="step-1" className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Select Location</h3>
            <p className="text-sm text-gray-500">
              Choose a point or draw an area on the map to rate this location
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleStartDrawing('point')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  currentDrawMode === 'point'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <MapPin className="h-6 w-6 text-gray-700 mb-2" />
                <span className="text-sm font-medium">Point</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleStartDrawing('polygon')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  currentDrawMode === 'polygon'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <Square className="h-6 w-6 text-gray-700 mb-2" />
                <span className="text-sm font-medium">Area</span>
              </button>
            </div>

            {currentSelectedFeature && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">
                    {currentSelectedFeature.geometry.type === 'Point' ? 'Point' : 'Area'} selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearDrawing}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div key="step-2" className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Rate this location</h3>
            <p className="text-sm text-gray-500">
              Rate the following aspects of this location from 1 to 5 stars
            </p>

            <div className="space-y-6">
              {categories.map(({ id, label, icon: Icon, color }) => (
                <div key={id} className="space-y-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center mr-3`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center">
                    {renderStars(id as keyof FormValues['scores'], scores[id as keyof typeof scores] || 0)}
                    <span className="ml-2 text-sm text-gray-500">
                      {scores[id as keyof typeof scores] || 0} / 5
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional notes (optional)
                </label>
                <textarea
                  id="note"
                  {...register('note')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Share more details about your experience..."
                />
                {errors.note && (
                  <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div key="step-3" className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review your rating</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Location</h4>
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span>{currentSelectedFeature?.geometry.type === 'Point' ? 'Point' : 'Area'} selected</span>
              </div>

              <h4 className="font-medium text-gray-900 mb-3">Ratings</h4>
              <div className="space-y-3">
                {categories.map(({ id, label, icon: Icon, color }) => (
                  <div key={id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center mr-2`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < (scores[id as keyof typeof scores] || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {watch('note') && (
                <>
                  <h4 className="font-medium text-gray-900 mt-4 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                    {watch('note')}
                  </p>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [currentStep, currentDrawMode, currentSelectedFeature, categories, renderStars, scores, watch, register, errors.note, handleStartDrawing, clearDrawing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {currentStep === 1 ? 'Select Location' : currentStep === 2 ? 'Rate Location' : 'Review'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renderStepIndicator()}

            <form onSubmit={handleSubmit(handleFormSubmit)}>
              {renderStep()}

              {submitStatus === 'success' && (
                <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Rating submitted successfully!</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isSubmitting || !currentSelectedFeature}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}