import { z } from 'zod'

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Rating schemas
export const createRatingSchema = z.object({
  geometry: z.object({
    type: z.enum(['Point', 'Polygon']),
    coordinates: z.union([
      z.array(z.number()).min(2).max(2), // Point coordinates [lng, lat]
      z.array(z.array(z.array(z.number()).min(2).max(2))), // Polygon coordinates [[[lng, lat], ...]]
    ]),
  }),
  scores: z.object({
    safety: z.number().min(0).max(10),
    amenities: z.number().min(0).max(10),
    livability: z.number().min(0).max(10),
  }),
  note: z.string().max(140).optional(),
  deviceId: z.string().optional(),
})

// Heatmap query schema
export const heatmapQuerySchema = z.object({
  bbox: z.string().refine((val) => {
    const coords = val.split(',').map(Number)
    return coords.length === 4 && coords.every(n => !isNaN(n))
  }, 'Invalid bbox format'),
  category: z.enum(['safety', 'amenities', 'livability']),
  zoom: z.number().min(0).max(22),
})

// Flag rating schema
export const flagRatingSchema = z.object({
  ratingId: z.string(),
  reason: z.string().min(1, 'Reason is required'),
})

// Admin schemas
export const updateRatingStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateRatingInput = z.infer<typeof createRatingSchema>
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>
export type FlagRatingInput = z.infer<typeof flagRatingSchema>
export type UpdateRatingStatusInput = z.infer<typeof updateRatingStatusSchema>
