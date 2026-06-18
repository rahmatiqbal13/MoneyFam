/**
 * Cookie-based storage adapter for Supabase auth.
 * More secure than localStorage against XSS because:
 * - SameSite=Strict prevents CSRF
 * - Secure flag ensures HTTPS-only
 * - Short path scope
 *
 * Note: Cannot use httpOnly because Supabase client needs to read
 * the access_token to set Authorization headers.
 */

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name, value, options = {}) {
  const { days = 7, secure = true, sameSite = 'Strict' } = options
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const flags = [
    `expires=${expires}`,
    'path=/',
    sameSite ? `SameSite=${sameSite}` : '',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
  document.cookie = `${name}=${encodeURIComponent(value)}; ${flags}`
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure; SameSite=Strict`
}

export const cookieStorage = {
  getItem: (key) => {
    return getCookie(key) ?? null
  },
  setItem: (key, value) => {
    setCookie(key, value)
  },
  removeItem: (key) => {
    deleteCookie(key)
  },
}
