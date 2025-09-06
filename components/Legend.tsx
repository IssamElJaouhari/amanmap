'use client'

import { Info } from 'lucide-react'

interface LegendProps {
  category: 'safety' | 'amenities' | 'livability'
  heatmapStyle?: 'density' | 'intensity' | 'classic'
}

export default function Legend({ category, heatmapStyle = 'density' }: LegendProps) {
  const categoryLabels = {
    safety: 'Safety',
    amenities: 'Ameniti',
    livability: 'Livability'
  }

  const categoryDescriptions = {
    safety: 'Personal security, crime rates, emergency services',
    amenities: 'Schools, clinics, transport, shops, restaurants',
    livability: 'Overall quality of life and suitability for living'
  }

  const safetyColorStops = [
    { score: '0-1', color: 'bg-red-800', label: 'Very Dangerous', textColor: 'text-white' },
    { score: '2-3', color: 'bg-red-500', label: 'Dangerous', textColor: 'text-white' },
    { score: '4', color: 'bg-orange-500', label: 'Unsafe', textColor: 'text-white' },
    { score: '5', color: 'bg-yellow-500', label: 'Moderate', textColor: 'text-black' },
    { score: '6-7', color: 'bg-lime-500', label: 'Good', textColor: 'text-black' },
    { score: '8-9', color: 'bg-green-600', label: 'Safe', textColor: 'text-white' },
    { score: '10', color: 'bg-green-800', label: 'Very Safe', textColor: 'text-white' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900">
          {categoryLabels[category]} Heatmap
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {categoryDescriptions[category]}
      </p>

      {/* Enhanced Safety Color Legend */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Safety Rating Scale</h4>
        
        {/* Gradient bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Dangerous</span>
            <span>Moderate</span>
            <span>Safe</span>
          </div>
          <div className="h-4 rounded-lg bg-gradient-to-r from-red-800  via-yellow-500    to-green-800 shadow-inner"></div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Heat visualization info */}
      <div className="border-t pt-3 mb-3">
        <h4 className="text-sm font-medium text-gray-700 mb-1">Heat Visualization</h4>
        <p className="text-xs text-gray-600">
          • <strong>Red clouds:</strong> High-risk areas requiring caution<br/>
          • <strong>Yellow clouds:</strong> Moderate safety, stay alert<br/>
          • <strong>Green clouds:</strong> Safe areas with low risk
        </p>
      </div>

      {/* Disclaimer */}
      <div className="border-t pt-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Disclaimer:</strong> This map reflects community opinions and is for guidance only. 
          Conditions can change quickly. For emergencies, contact local authorities.
        </p>
      </div>
    </div>
  )
}
