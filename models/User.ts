import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  email: string
  name?: string
  passwordHash: string
  roles: ('user' | 'moderator' | 'admin')[]
  provider: 'credentials' | 'google'
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  roles: {
    type: [String],
    enum: ['user', 'moderator', 'admin'],
    default: ['user'],
  },
  provider: {
    type: String,
    enum: ['credentials', 'google'],
    default: 'credentials',
  },
}, {
  timestamps: true,
})

// Index for unique email
UserSchema.index({ email: 1 }, { unique: true })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
