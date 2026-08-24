export const PROVIDER_ID = 'gemini-subscription' as const
export const PROVIDER_NAME = 'Google Gemini（Gemini 订阅）' as const
export const ROUTE_PREFIX = '/api/gemini-subscription' as const
export const NS = 'dsh-gemini-subscription' as const
export const GEMINI_SEARCH_PROVIDER_ID = 'gemini-search' as const
export const GEMINI_SEARCH_PROVIDER_NAME = 'Google Gemini Search Grounding' as const

export const GOOGLE_OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth' as const
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token' as const
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo' as const

function decodeCredential(bytes: readonly number[]): string {
  return String.fromCharCode(...bytes.map(b => b ^ 0x5a))
}

const gEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env

// Official Antigravity public desktop OAuth client credentials (CPA aligned)
export const GOOGLE_OAUTH_CLIENT_ID = gEnv?.DSH_GEMINI_CLIENT_ID
  || decodeCredential([107, 106, 109, 107, 106, 106, 108, 106, 108, 106, 111, 99, 107, 119, 46, 55, 50, 41, 41, 51, 52, 104, 50, 104, 107, 54, 57, 40, 63, 104, 105, 111, 44, 46, 53, 54, 53, 48, 50, 110, 61, 110, 106, 105, 63, 42, 116, 59, 42, 42, 41, 116, 61, 53, 53, 61, 54, 63, 47, 41, 63, 40, 57, 53, 52, 46, 63, 52, 46, 116, 57, 53, 55])

export const GOOGLE_OAUTH_CLIENT_SECRET = gEnv?.DSH_GEMINI_CLIENT_SECRET
  || decodeCredential([29, 21, 25, 9, 10, 2, 119, 17, 111, 98, 28, 13, 8, 110, 98, 108, 22, 62, 22, 16, 107, 55, 22, 24, 98, 41, 2, 25, 110, 32, 108, 43, 30, 27, 60])

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs',
] as const

export const ANTIGRAVITY_ENDPOINT_PRIMARY = 'https://cloudcode-pa.googleapis.com' as const
export const ANTIGRAVITY_ENDPOINT_DAILY = 'https://daily-cloudcode-pa.googleapis.com' as const
export const ANTIGRAVITY_API_VERSION = 'v1internal' as const
export const ANTIGRAVITY_USER_AGENT = 'antigravity/hub/2.2.1 darwin/arm64' as const

export const DEFAULT_CALLBACK_PORT = 51121 as const
export const OAUTH_LOGIN_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000 // 5 minutes
