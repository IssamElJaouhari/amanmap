import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import dbConnect from './db'
import User from '../models/User'
import { loginSchema } from './zod-schemas'

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
          const validatedFields = loginSchema.parse(credentials)
          await dbConnect()

          const user = await User.findOne({ email: validatedFields.email })
          if (!user) {
            return null
          }

          const isValidPassword = await bcrypt.compare(
            validatedFields.password,
            user.passwordHash
          )

          if (!isValidPassword) {
            return null
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email.split('@')[0], // Fallback to email username if name not set
            roles: user.roles,
            isAdmin: user.roles.includes('admin')
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
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
