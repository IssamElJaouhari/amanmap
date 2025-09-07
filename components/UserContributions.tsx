'use client'

import { useCallback, useEffect, useState } from 'react';
import { Star, Edit, Trash2, MapPin, Clock } from 'lucide-react';
import { IRating } from '@/models/Rating';

// Extend the IRating interface to include _id and handle Date types
interface RatingWithId extends Omit<IRating, '_id' | 'createdAt' | 'updatedAt'> {
  _id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  scores: {
    safety: number;
    amenities: number;
    livability: number;
  };
  note?: string;
}

interface UserContributionsProps {
  userId: string;
}

export default function UserContributions({ userId }: UserContributionsProps) {
  const [contributions, setContributions] = useState<RatingWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{safety: number; amenities: number; livability: number; note: string} | null>(null);

  const fetchContributions = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ratings?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load contributions');
      }
      const data = await response.json();
      setContributions(data.ratings || []);
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const handleEdit = (contribution: RatingWithId) => {
    setEditingId(contribution._id);
    setEditData({
      safety: contribution.scores.safety,
      amenities: contribution.scores.amenities,
      livability: contribution.scores.livability,
      note: contribution.note || ''
    });
  };

  const handleUpdate = async (id: string) => {
    if (!editData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/ratings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: {
            safety: editData.safety,
            amenities: editData.amenities,
            livability: editData.livability,
          },
          note: editData.note,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contribution');
      }

      const updated = await response.json();
      setContributions(contributions.map(c => c._id === id ? updated.rating as RatingWithId : c));
      setEditingId(null);
      
      // Show success feedback
      // You can replace this with a toast notification
      alert('Contribution updated successfully');
    } catch (err) {
      console.error('Failed to update contribution:', err);
      setError(err instanceof Error ? err.message : 'Failed to update contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contribution? This action cannot be undone.')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/ratings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contribution');
      }

      setContributions(contributions.filter(c => c._id !== id));
      // Show success feedback
      alert('Contribution deleted successfully');
    } catch (err) {
      console.error('Failed to delete contribution:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <p className="text-sm text-gray-500">Loading your contributions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading contributions</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
              <button
                onClick={fetchContributions}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-700 focus:outline-none focus:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="mx-auto h-16 w-16 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contributions yet</h3>
        <p className="mt-1 text-sm text-gray-500">Your safety ratings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-blue-700">
          Your contributions help keep the community safe. You can update your ratings if the safety conditions change.
        </p>
      </div>
      
      <div className="space-y-4">
  {contributions.map((contribution: RatingWithId) => (
          <div key={contribution._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(contribution.createdAt).toLocaleDateString()}
                </div>
                {contribution.note && (
                  <p className="text-gray-700 mb-3">{contribution.note}</p>
                )}
                
                {editingId === contribution._id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Safety</label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditData(prev => ({
                              ...prev!,
                              safety: star
                            }))}
                            className="p-1"
                          >
                            <Star
                              className={`h-5 w-5 ${star <= (editData?.safety || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                      <textarea
                        value={editData?.note || ''}
                        onChange={(e) => setEditData(prev => ({
                          ...prev!,
                          note: e.target.value
                        }))}
                        className="w-full p-2 border rounded-md text-sm"
                        rows={3}
                        placeholder="Update your notes..."
                      />
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleUpdate(contribution._id)}
                        disabled={isSubmitting}
                        className={`px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isSubmitting}
                        className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-20">Safety:</span>
                      <div className="flex">
                        {renderStars(contribution.scores.safety)}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-20">Amenities:</span>
                      <div className="flex">
                        {renderStars(contribution.scores.amenities)}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-20">Livability:</span>
                      <div className="flex">
                        {renderStars(contribution.scores.livability)}
                      </div>
                    </div>
                    
                    <div className="flex space-x-4 pt-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(contribution)}
                        disabled={isSubmitting}
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(contribution._id)}
                        disabled={isSubmitting}
                        className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 text-right">
                {contribution.updatedAt !== contribution.createdAt ? (
                  <span>Updated {new Date(contribution.updatedAt).toLocaleDateString()}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
