import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import dbConnect from './db'
import User from '../models/User'
import { loginSchema } from './zod-schemas'
import { checkEnhancedRateLimit } from './enhanced-rate-limit'
import { InputSanitizer } from './input-sanitizer'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Rate limiting for auth attempts
          const clientIP = credentials.email // Using email as identifier for rate limiting
          const rateLimit = checkEnhancedRateLimit(clientIP, 'AUTH_ATTEMPTS')
          
          if (!rateLimit.allowed) {
            console.warn('Auth rate limit exceeded for:', credentials.email)
            return null
          }

          // Sanitize and validate input
          const sanitizedEmail = InputSanitizer.sanitizeEmail(credentials.email)
          const validatedFields = loginSchema.parse({
            email: sanitizedEmail,
            password: credentials.password
          })
          
          await dbConnect()

          const user = await User.findOne({ email: validatedFields.email })
          if (!user) {
            // Add delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
            return null
          }

          const isValidPassword = await bcrypt.compare(
            validatedFields.password,
            user.passwordHash
          )

          if (!isValidPassword) {
            // Add delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
            return null
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            roles: user.roles,
            isAdmin: user.roles.includes('admin')
          }
        } catch (error) {
          console.error('Auth error')
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 2 * 60 * 60, // Update session every 2 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.email = user.email
        token.name = user.name
        token.roles = user.roles
        token.isAdmin = user.roles.includes('admin')
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.email = token.email as string
        session.user.name = token.name as string | undefined
        session.user.roles = token.roles as string[]
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (!session.user.roles?.includes('admin') && !session.user.roles?.includes('moderator')) {
    throw new Error('Forbidden: Admin access required')
  }
  return session
}
