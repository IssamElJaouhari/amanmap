/**
 * Secure cookie utility functions
 * Implements best practices for cookie security
 * @module cookieUtils
 */

type SameSiteType = 'Strict' | 'Lax' | 'None';

interface CookieOptions {
  /**
   * Cookie expiration in days (0 for session cookie)
   * @default 90
   */
  days?: number;
  /**
   * Cookie path
   * @default '/'
   */
  path?: string;
  /**
   * Restrict cookie to HTTPS
   * @default true
   */
  secure?: boolean;
  /**
   * HttpOnly flag to prevent XSS
   * @default true
   */
  httpOnly?: boolean;
  /**
   * SameSite attribute
   * @default 'Lax'
   */
  sameSite?: SameSiteType;
  /**
   * Domain for the cookie
   */
  domain?: string;
}

interface InternalCookieOptions extends Omit<CookieOptions, 'domain'> {
  domain: string | undefined;
}

/**
 * Default cookie options with secure defaults
 */
const defaultOptions = {
  days: 90,
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'Lax' as const,  // Default to Lax for better CSRF protection
  domain: undefined as string | undefined,  // No default domain
};

/**
 * Detects if the current context is secure (HTTPS or localhost)
 * @returns boolean indicating if the context is secure
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost')
  );
}

/**
 * Tests if cookies are enabled in the current browser
 * @returns Promise<boolean> indicating if cookies are enabled
 */
export function areCookiesEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Test cookie support
  try {
    const testKey = 'test-cookie-' + Date.now();
    document.cookie = `${testKey}=1; SameSite=None; Secure`;
    const enabled = document.cookie.indexOf(testKey) !== -1;
    deleteCookie(testKey);
    return enabled;
  } catch (e) {
    return false;
  }
}

/**
 * Builds a cookie string with proper attributes
 * @private
 */
function buildCookieString(
  name: string,
  value: string,
  options: InternalCookieOptions,
  isDeleting = false
): string {
  const parts: string[] = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${options.path}`
  ];

  // Set expiration (or past date for deletion)
  const expiration = new Date();
  const days = options.days ?? 0;
  
  if (isDeleting) {
    expiration.setTime(0);
  } else if (days > 0) {
    expiration.setTime(expiration.getTime() + (days * 24 * 60 * 60 * 1000));
  }
  parts.push(`expires=${expiration.toUTCString()}`);

  // Add domain if specified
  if (options.domain) {
    parts.push(`domain=${options.domain}`);
  }

  // Add secure flag only in secure contexts
  if (options.secure && isSecureContext()) {
    parts.push('Secure');
  }

  // Add HttpOnly flag if specified
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  // Add SameSite attribute
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

/**
 * Sets a secure cookie with configurable options
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof document === 'undefined') return;

  const mergedOptions: InternalCookieOptions = {
    ...defaultOptions,
    ...options,
    days: options.days ?? defaultOptions.days,
    domain: options.domain,
    // Force SameSite=None to be Secure
    secure: options.sameSite === 'None' ? true : (options.secure ?? defaultOptions.secure)
  };

  document.cookie = buildCookieString(name, value, mergedOptions);
}

/**
 * Sets a session cookie that expires when the browser closes
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (without expiration)
 */
export function setSessionCookie(
  name: string,
  value: string,
  options: Omit<CookieOptions, 'days'> = {}
): void {
  setSecureCookie(name, value, { ...options, days: 0 });
}

/**
 * Gets a cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(
    new RegExp(`(^|;\\s*)(${name})=([^;]*)`)
  );
  
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Gets all cookies as an object
 * @returns Object with cookie names as keys and values
 */
export function getAllCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  
  return document.cookie.split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    if (name) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value || '');
    }
    return cookies;
  }, {});
}

/**
 * Deletes a cookie by name
 * @param name - Cookie name to delete
 * @param path - Path of the cookie to delete
 * @param domain - Domain of the cookie to delete
 */
export function deleteCookie(
  name: string,
  path: string = '/',
  domain?: string
): void {
  if (typeof document === 'undefined') return;
  
  const options: InternalCookieOptions = {
    ...defaultOptions,
    path,
    domain: domain,
    days: -1, // Set to past date
  };
  
  document.cookie = buildCookieString(name, '', options, true);
}

/**
 * Clears all cookies (use with caution)
 * @param path - Optional path to clear cookies from
 * @param domain - Optional domain to clear cookies from
 */
export function clearAllCookies(path: string = '/', domain?: string): void {
  if (typeof document === 'undefined') return;
  
  if (process.env.NODE_ENV !== 'production') {
    console.warn('clearAllCookies: This will remove all cookies. Use with caution.');
  }
  
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
    if (name) {
      deleteCookie(decodeURIComponent(name), path, domain);
    }
  }
}

export default {
  setSecureCookie,
  setSessionCookie,
  getCookie,
  getAllCookies,
  deleteCookie,
  clearAllCookies,
  isSecureContext,
  areCookiesEnabled
};
