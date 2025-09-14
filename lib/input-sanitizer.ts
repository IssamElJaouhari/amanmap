import DOMPurify from 'isomorphic-dompurify'

// Input sanitization utilities
export class InputSanitizer {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
  }

  // Sanitize and validate email addresses
  static sanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format')
    }
    
    // Additional checks for suspicious patterns
    if (sanitized.includes('..') || sanitized.includes('--')) {
      throw new Error('Invalid email format')
    }
    
    return sanitized
  }

  // Sanitize text input (notes, comments, etc.)
  static sanitizeText(input: string, maxLength: number = 500): string {
    if (!input) return ''
    
    // Remove HTML tags and decode entities
    let sanitized = this.sanitizeHtml(input)
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim()
    }
    
    return sanitized
  }

  // Sanitize numeric inputs
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = parseFloat(input)
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number')
    }
    
    if (min !== undefined && num < min) {
      throw new Error(`Number must be at least ${min}`)
    }
    
    if (max !== undefined && num > max) {
      throw new Error(`Number must be at most ${max}`)
    }
    
    return num
  }

  // Sanitize coordinate values
  static sanitizeCoordinates(coords: any): [number, number] {
    if (!Array.isArray(coords) || coords.length !== 2) {
      throw new Error('Coordinates must be an array of two numbers')
    }
    
    const [lng, lat] = coords
    const sanitizedLng = this.sanitizeNumber(lng, -180, 180)
    const sanitizedLat = this.sanitizeNumber(lat, -90, 90)
    
    return [sanitizedLng, sanitizedLat]
  }

  // Sanitize MongoDB query parameters to prevent injection
  static sanitizeMongoQuery(query: any): any {
    if (query === null || query === undefined) {
      return query
    }
    
    if (typeof query === 'string') {
      // Remove potential MongoDB operators
      return query.replace(/^\$/, '_dollar_')
    }
    
    if (Array.isArray(query)) {
      return query.map(item => this.sanitizeMongoQuery(item))
    }
    
    if (typeof query === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(query)) {
        // Remove keys starting with $ to prevent operator injection
        const sanitizedKey = key.startsWith('$') ? `_${key.substring(1)}` : key
        sanitized[sanitizedKey] = this.sanitizeMongoQuery(value)
      }
      return sanitized
    }
    
    return query
  }

  // Validate and sanitize device ID
  static sanitizeDeviceId(deviceId: string): string {
    if (!deviceId) return ''
    
    // Allow only alphanumeric characters, hyphens, and underscores
    const sanitized = deviceId.replace(/[^a-zA-Z0-9\-_]/g, '')
    
    if (sanitized.length < 3 || sanitized.length > 50) {
      throw new Error('Device ID must be between 3 and 50 characters')
    }
    
    return sanitized
  }

  // Sanitize file paths to prevent directory traversal
  static sanitizeFilePath(path: string): string {
    if (!path) return ''
    
    // Remove directory traversal attempts
    let sanitized = path.replace(/\.\./g, '')
    
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    
    // Normalize path separators
    sanitized = sanitized.replace(/[\\\/]+/g, '/')
    
    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '')
    
    return sanitized
  }
}

// Enhanced profanity filter with context awareness
export class EnhancedProfanityFilter {
  private static readonly PROFANITY_PATTERNS = [
    // Basic profanity (add your patterns here)
    /\b(fuck|shit|damn|hell|ass|bitch)\b/gi,
    // Leetspeak variations
    /\bf[u\*@]ck\b/gi,
    /\bs[h\*]it\b/gi,
    // Hate speech patterns (simplified examples)
    /\b(hate|kill|die)\s+(all|every)\s+\w+/gi,
  ]

  private static readonly SUSPICIOUS_PATTERNS = [
    // Repeated characters (potential spam)
    /(.)\1{10,}/,
    // Excessive caps
    /[A-Z]{20,}/,
    // Potential spam URLs
    /https?:\/\/[^\s]+\.(tk|ml|ga|cf)/gi,
  ]

  static containsProfanity(text: string): boolean {
    if (!text) return false
    
    return this.PROFANITY_PATTERNS.some(pattern => pattern.test(text))
  }

  static containsSuspiciousContent(text: string): boolean {
    if (!text) return false
    
    return this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(text))
  }

  static analyzeContent(text: string): {
    hasProfanity: boolean
    isSuspicious: boolean
    riskScore: number
    reasons: string[]
  } {
    const reasons: string[] = []
    let riskScore = 0

    const hasProfanity = this.containsProfanity(text)
    if (hasProfanity) {
      reasons.push('Contains profanity')
      riskScore += 50
    }

    const isSuspicious = this.containsSuspiciousContent(text)
    if (isSuspicious) {
      reasons.push('Contains suspicious patterns')
      riskScore += 30
    }

    // Additional risk factors
    if (text.length > 1000) {
      reasons.push('Unusually long content')
      riskScore += 10
    }

    if (text.split('\n').length > 20) {
      reasons.push('Too many line breaks')
      riskScore += 15
    }

    return {
      hasProfanity,
      isSuspicious,
      riskScore: Math.min(riskScore, 100),
      reasons
    }
  }
}
