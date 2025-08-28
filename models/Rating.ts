import mongoose, { Document, Schema } from 'mongoose'

export interface IRating extends Document {
  userId: mongoose.Types.ObjectId
  geometry: {
    type: 'Point' | 'Polygon'
    coordinates: number[] | number[][][]
  }
  centroid: {
    type: 'Point'
    coordinates: [number, number]
  }
  scores: {
    safety: number
    amenities: number
    livability: number
  }
  note?: string
  city?: string
  status: 'pending' | 'approved' | 'rejected'
  deviceId?: string
  createdAt: Date
  updatedAt: Date
}

const RatingSchema = new Schema<IRating>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'Polygon'],
      required: true,
    },
    coordinates: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  centroid: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v: number[]) {
          return v.length === 2
        },
        message: 'Centroid coordinates must be [lng, lat]'
      }
    },
  },
  scores: {
    safety: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    amenities: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    livability: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
  },
  note: {
    type: String,
    maxlength: 140,
  },
  city: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  deviceId: {
    type: String,
  },
}, {
  timestamps: true,
})

// 2dsphere index on centroid for geospatial queries
RatingSchema.index({ centroid: '2dsphere' })
// 2dsphere index on geometry for polygon queries
RatingSchema.index({ geometry: '2dsphere' })
// Compound index for status and creation date
RatingSchema.index({ status: 1, createdAt: -1 })

export default mongoose.models.Rating || mongoose.model<IRating>('Rating', RatingSchema)
