/**
 * Secure cookie utility functions
 * Implements best practices for cookie security
 */

/**
 * Sets a secure cookie with proper attributes
 * @param name - Cookie name
 * @param value - Cookie value
 * @param days - Expiration in days (default: 90)
 */
export function setSecureCookie(name: string, value: string, days = 90): void {
  if (typeof document === 'undefined') return;
  
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  
  const cookieParts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `expires=${date.toUTCString()}`,
    'path=/',
    'Secure',
    'SameSite=Strict'
  ];
  
  document.cookie = cookieParts.join('; ');
}

/**
 * Gets a cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)(' + name + ')=([^;]*)')
  );
  
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Deletes a cookie by name
 * @param name - Cookie name to delete
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = [
    `${encodeURIComponent(name)}=`,
    'expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'path=/',
    'Secure',
    'SameSite=Strict'
  ].join('; ');
}
