import { z } from 'zod'

// Environment variable validation schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  
  // External APIs
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1, 'NEXT_PUBLIC_MAPBOX_TOKEN is required'),
  
  // Optional OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Admin credentials (for seeding)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type EnvConfig = z.infer<typeof envSchema>

class EnvironmentValidator {
  private static instance: EnvironmentValidator
  private validatedEnv: EnvConfig | null = null

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator()
    }
    return EnvironmentValidator.instance
  }

  validate(): EnvConfig {
    if (this.validatedEnv) {
      return this.validatedEnv
    }

    try {
      this.validatedEnv = envSchema.parse(process.env)
      
      // Additional security checks
      this.performSecurityChecks(this.validatedEnv)
      
      return this.validatedEnv
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n')
        
        throw new Error(`Environment validation failed:\n${errorMessages}`)
      }
      throw error
    }
  }

  private performSecurityChecks(env: EnvConfig): void {
    const issues: string[] = []

    // Check for weak secrets
    if (env.NEXTAUTH_SECRET && this.isWeakSecret(env.NEXTAUTH_SECRET)) {
      issues.push('NEXTAUTH_SECRET appears to be weak or predictable')
    }

    // Check for development values in production
    if (env.NODE_ENV === 'production') {
      if (env.NEXTAUTH_URL?.includes('localhost')) {
        issues.push('NEXTAUTH_URL should not use localhost in production')
      }
      
      if (env.MONGODB_URI?.includes('localhost')) {
        issues.push('MONGODB_URI should not use localhost in production')
      }
      
      if (env.NEXT_PUBLIC_MAPBOX_TOKEN?.includes('pk.test')) {
        issues.push('Using test Mapbox token in production')
      }
    }

    // Check for exposed secrets
    if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length < 64) {
      issues.push('NEXTAUTH_SECRET should be at least 64 characters for better security')
    }

    if (issues.length > 0) {
      console.warn('Security warnings:', issues.join('\n'))
      
      if (env.NODE_ENV === 'production') {
        throw new Error(`Critical security issues in production:\n${issues.join('\n')}`)
      }
    }
  }

  private isWeakSecret(secret: string): boolean {
    const weakPatterns = [
      /^(secret|password|key|token)$/i,
      /^(123|abc|test|dev|prod)/i,
      /^(.)\1{10,}$/, // Repeated characters
      /^(qwerty|password|123456)/i,
    ]

    return weakPatterns.some(pattern => pattern.test(secret))
  }

  // Get validated environment variables
  getEnv(): EnvConfig {
    return this.validate()
  }

  // Check if running in production
  isProduction(): boolean {
    return this.getEnv().NODE_ENV === 'production'
  }

  // Check if running in development
  isDevelopment(): boolean {
    return this.getEnv().NODE_ENV === 'development'
  }
}

// Export singleton instance
export const envValidator = EnvironmentValidator.getInstance()

// Validate environment on import (fail fast)
try {
  envValidator.validate()
} catch (error) {
  console.error('Environment validation failed:', error)
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
}
