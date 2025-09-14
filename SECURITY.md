# AmanMap Security Documentation

## Security Overview

This document outlines the security measures implemented in the AmanMap application and provides guidelines for maintaining security best practices.

## 🔐 Authentication & Authorization

### NextAuth.js Implementation
- **JWT Strategy**: Secure token-based authentication with configurable expiration
- **Session Management**: 24-hour session duration with 2-hour update intervals
- **Rate Limiting**: 5 authentication attempts per 15 minutes per email
- **Timing Attack Protection**: Random delays prevent user enumeration
- **Input Sanitization**: Email addresses are sanitized and validated

### Role-Based Access Control (RBAC)
- **User Roles**: `user`, `moderator`, `admin`
- **API Protection**: All sensitive endpoints require authentication
- **Admin Routes**: Protected with `requireAdmin()` middleware
- **Authorization Checks**: Consistent role validation across the application

## 🛡️ Input Validation & Sanitization

### Zod Schema Validation
- **Type Safety**: All API inputs validated with Zod schemas
- **Data Constraints**: Enforced limits on text length, numeric ranges, coordinates
- **Geometry Validation**: GeoJSON structure validation for map data

### Enhanced Input Sanitization
- **HTML Sanitization**: DOMPurify removes malicious HTML/XSS attempts
- **Text Cleaning**: Control character removal and whitespace normalization
- **Email Validation**: RFC-compliant email format checking
- **Coordinate Bounds**: Longitude/latitude range validation
- **MongoDB Injection Prevention**: Query parameter sanitization

### Content Moderation
- **Profanity Detection**: Multi-pattern profanity filtering
- **Suspicious Content**: Detection of spam patterns and excessive formatting
- **Risk Scoring**: Automated content risk assessment (0-100 scale)
- **Auto-Moderation**: High-risk content automatically flagged for review

## 🚦 Rate Limiting

### Enhanced Rate Limiting System
- **Sliding Window**: Time-based request tracking with cleanup
- **Multiple Tiers**: Different limits for different endpoint types
- **Progressive Penalties**: Stricter limits for suspicious behavior
- **Memory Efficient**: Automatic cleanup of expired entries

### Rate Limit Configuration
```typescript
API_GENERAL: 100 requests per 15 minutes
RATING_SUBMIT: 10 requests per 24 hours
AUTH_ATTEMPTS: 5 requests per 15 minutes
ADMIN_ACTIONS: 50 requests per hour
```

## 🔒 Security Headers

### Content Security Policy (CSP)
- **Script Sources**: Limited to self and Mapbox API
- **Style Sources**: Self and Mapbox with unsafe-inline for dynamic styles
- **Image Sources**: Self, data URLs, HTTPS, and blob for map tiles
- **Connect Sources**: Self and Mapbox APIs with WebSocket support

### Additional Security Headers
- **X-Content-Type-Options**: `nosniff` prevents MIME type sniffing
- **X-Frame-Options**: `DENY` prevents clickjacking attacks
- **X-XSS-Protection**: Browser XSS filtering enabled
- **Referrer-Policy**: `strict-origin-when-cross-origin` for privacy
- **Permissions-Policy**: Restricts camera, microphone, geolocation access

## 🌐 CORS Configuration

### Cross-Origin Resource Sharing
- **Allowed Origins**: Restricted to application domain
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization
- **Preflight Caching**: 24-hour cache for OPTIONS requests

## 🗄️ Database Security

### MongoDB Protection
- **Connection Security**: Encrypted connections with authentication
- **Query Sanitization**: Prevention of NoSQL injection attacks
- **Input Validation**: All database inputs validated before queries
- **Error Handling**: Generic error messages prevent information leakage

### Data Privacy
- **Location Quantization**: Coordinates rounded for privacy protection
- **Jitter Addition**: Random noise added to prevent exact location tracking
- **User Data Protection**: Sensitive information properly hashed/encrypted

## 📝 Logging & Monitoring

### Security Logging
- **Error Logging**: Minimal error information to prevent data leakage
- **Authentication Events**: Failed login attempts logged for monitoring
- **Rate Limit Violations**: Suspicious activity tracking
- **Admin Actions**: Administrative operations logged for audit

### Production Considerations
- **Verbose Logging Disabled**: Detailed logs removed from production code
- **Error Messages**: Generic messages prevent information disclosure
- **Stack Traces**: Suppressed in production environment

## 🔧 Environment Security

### Environment Variable Validation
- **Required Variables**: Automatic validation of critical configuration
- **Secret Strength**: Minimum length requirements for secrets
- **Production Checks**: Additional validation for production deployments
- **Weak Secret Detection**: Automatic detection of common weak passwords

### Configuration Security
- **Secret Management**: Environment variables for sensitive data
- **Development vs Production**: Different security levels per environment
- **API Key Protection**: Public keys properly scoped and validated

## 🚨 Incident Response

### Security Monitoring
- **Rate Limit Alerts**: Monitoring for abuse patterns
- **Failed Authentication**: Tracking of brute force attempts
- **Content Moderation**: Automated flagging of suspicious content
- **Error Rate Monitoring**: Detection of potential attacks

### Response Procedures
1. **Immediate**: Block suspicious IP addresses/users
2. **Investigation**: Review logs and assess impact
3. **Mitigation**: Apply patches and security updates
4. **Communication**: Notify users if data breach occurs

## 📋 Security Checklist

### Pre-Deployment
- [ ] Environment variables validated
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] Admin credentials secured
- [ ] Database connections encrypted
- [ ] Content moderation active

### Regular Maintenance
- [ ] Security dependencies updated
- [ ] Rate limit effectiveness reviewed
- [ ] Failed authentication attempts monitored
- [ ] Content moderation rules updated
- [ ] Security logs analyzed
- [ ] Penetration testing performed

## 🔄 Security Updates

### Dependency Management
- **Regular Updates**: Security patches applied promptly
- **Vulnerability Scanning**: Automated dependency checking
- **Version Pinning**: Controlled dependency updates

### Security Patches
- **Critical Issues**: Immediate deployment required
- **Medium Issues**: Scheduled maintenance window
- **Low Issues**: Next regular release cycle

## 📞 Security Contacts

### Reporting Security Issues
- **Email**: security@amanmap.com
- **Response Time**: 24 hours for critical issues
- **Disclosure Policy**: Coordinated disclosure preferred

### Security Team
- **Security Lead**: [Contact Information]
- **Development Lead**: [Contact Information]
- **Infrastructure Lead**: [Contact Information]

---

**Last Updated**: 2025-01-14
**Version**: 1.0
**Review Schedule**: Quarterly
