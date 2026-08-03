/**
 * Cookie-based storage adapter for Supabase auth.
 *
 * Note on security: this does NOT protect the session token from XSS.
 * `document.cookie` is readable by any script running on the page, same as
 * localStorage — true protection would require an httpOnly cookie set by a
 * server, which a client-only SPA can't do (Supabase needs to read the
 * access_token in JS to set the Authorization header). The actual XSS
 * mitigation for this app is input sanitization + avoiding
 * dangerouslySetInnerHTML, not the storage mechanism.
 * `SameSite=Strict` + `Secure` are kept anyway as defense-in-depth against
 * the session cookie being sent on cross-site requests / over plain HTTP.
 *
 * Chunked because a Supabase session (access + refresh token + user object)
 * can exceed the ~4KB limit of a single cookie.
 */

const CHUNK_SIZE = 3500
const isSecureContext = typeof location !== 'undefined' && location.protocol === 'https:'

function readAllCookies() {
  if (typeof document === 'undefined') return {}
  return document.cookie
    .split(';')
    .reduce((acc, pair) => {
      const idx = pair.indexOf('=')
      if (idx === -1) return acc
      const key = pair.slice(0, idx).trim()
      const value = pair.slice(idx + 1)
      if (key) acc[key] = value
      return acc
    }, {})
}

function writeCookie(name, value, options = {}) {
  const { days = 7, sameSite = 'Strict' } = options
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const flags = [
    `expires=${expires}`,
    'path=/',
    sameSite ? `SameSite=${sameSite}` : '',
    isSecureContext ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
  document.cookie = `${name}=${value}; ${flags}`
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${isSecureContext ? '; Secure' : ''}`
}

export const cookieStorage = {
  getItem: (key) => {
    const cookies = readAllCookies()
    const countRaw = cookies[`${key}.n`]

    if (countRaw !== undefined) {
      const count = parseInt(countRaw, 10)
      if (!Number.isFinite(count) || count <= 0) return null
      let value = ''
      for (let i = 0; i < count; i++) {
        const chunk = cookies[`${key}.${i}`]
        if (chunk === undefined) return null // missing/corrupt chunk
        value += chunk
      }
      return decodeURIComponent(value)
    }

    // Legacy single-cookie value (pre-chunking)
    const legacy = cookies[key]
    return legacy !== undefined ? decodeURIComponent(legacy) : null
  },

  setItem: (key, value) => {
    const encoded = encodeURIComponent(value)
    const existingCount = parseInt(readAllCookies()[`${key}.n`] || '0', 10)

    if (encoded.length <= CHUNK_SIZE) {
      // Clean up any stale chunks from a previously larger value
      for (let i = 0; i < existingCount; i++) deleteCookie(`${key}.${i}`)
      deleteCookie(`${key}.n`)
      writeCookie(key, encoded)
      return
    }

    deleteCookie(key)
    const chunks = []
    for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
      chunks.push(encoded.slice(i, i + CHUNK_SIZE))
    }
    chunks.forEach((chunk, i) => writeCookie(`${key}.${i}`, chunk))
    for (let i = chunks.length; i < existingCount; i++) deleteCookie(`${key}.${i}`)
    writeCookie(`${key}.n`, String(chunks.length))
  },

  removeItem: (key) => {
    const cookies = readAllCookies()
    const count = parseInt(cookies[`${key}.n`] || '0', 10)
    for (let i = 0; i < count; i++) deleteCookie(`${key}.${i}`)
    deleteCookie(`${key}.n`)
    deleteCookie(key)
  },
}
