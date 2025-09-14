// Enhanced rate limiter with sliding window and multiple tiers
// Production-ready alternative to simple in-memory store

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (identifier: string) => string
}

interface RateLimitEntry {
  requests: number[]
  blocked: boolean
  blockUntil?: number
}

class EnhancedRateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      // Remove requests older than 1 hour
      entry.requests = entry.requests.filter(timestamp => now - timestamp < 60 * 60 * 1000)
      
      // Remove blocked entries that have expired
      if (entry.blocked && entry.blockUntil && now > entry.blockUntil) {
        entry.blocked = false
        entry.blockUntil = undefined
      }
      
      // Remove empty entries
      if (entry.requests.length === 0 && !entry.blocked) {
        this.store.delete(key)
      }
    }
  }

  checkLimit(identifier: string, config: RateLimitConfig): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    const now = Date.now()
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier
    
    let entry = this.store.get(key)
    if (!entry) {
      entry = { requests: [], blocked: false }
      this.store.set(key, entry)
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockUntil,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000)
      }
    }

    // Remove expired requests
    const windowStart = now - config.windowMs
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart)

    // Check if limit exceeded
    if (entry.requests.length >= config.maxRequests) {
      // Block for the remainder of the window
      entry.blocked = true
      entry.blockUntil = now + config.windowMs
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockUntil,
        retryAfter: Math.ceil(config.windowMs / 1000)
      }
    }

    // Add current request
    entry.requests.push(now)
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.requests.length,
      resetTime: now + config.windowMs
    }
  }

  // Progressive rate limiting - stricter limits for suspicious behavior
  checkProgressiveLimit(identifier: string, baseConfig: RateLimitConfig): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
    suspiciousActivity?: boolean
  } {
    const result = this.checkLimit(identifier, baseConfig)
    
    // Check for suspicious patterns
    const entry = this.store.get(identifier)
    if (entry && entry.requests.length > 0) {
      const recentRequests = entry.requests.filter(t => Date.now() - t < 60 * 1000) // Last minute
      
      // Flag as suspicious if more than 20 requests in last minute
      if (recentRequests.length > 20) {
        return {
          ...result,
          allowed: false,
          suspiciousActivity: true,
          retryAfter: 300 // 5 minute penalty
        }
      }
    }
    
    return result
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Singleton instance
const rateLimiter = new EnhancedRateLimiter()

// Rate limiting configurations
export const RATE_LIMITS = {
  API_GENERAL: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 per 15 minutes
  RATING_SUBMIT: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 10 }, // 10 per day
  AUTH_ATTEMPTS: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15 minutes
  ADMIN_ACTIONS: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 per hour
} as const

export function checkEnhancedRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
) {
  return rateLimiter.checkLimit(identifier, RATE_LIMITS[limitType])
}

export function checkProgressiveRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
) {
  return rateLimiter.checkProgressiveLimit(identifier, RATE_LIMITS[limitType])
}

export default rateLimiter
