export const PROVIDER_ID = 'gemini-subscription' as const
export const PROVIDER_NAME = 'Google Gemini（Gemini 订阅）' as const
export const ROUTE_PREFIX = '/api/gemini-subscription' as const
export const NS = 'dsh-gemini-subscription' as const

export const GOOGLE_OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth' as const
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token' as const
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo' as const

function decodeCredential(bytes: readonly number[]): string {
  return String.fromCharCode(...bytes.map(b => b ^ 0x5a))
}

const gEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env

// Google Gemini CLI / Antigravity public desktop OAuth client credentials
export const GOOGLE_OAUTH_CLIENT_ID = gEnv?.DSH_GEMINI_CLIENT_ID
  || decodeCredential([108, 98, 107, 104, 111, 111, 98, 106, 99, 105, 99, 111, 119, 53, 53, 98, 60, 46, 104, 53, 42, 40, 62, 40, 52, 42, 99, 63, 105, 59, 43, 60, 108, 59, 44, 105, 50, 55, 62, 51, 56, 107, 105, 111, 48, 116, 59, 42, 42, 41, 116, 61, 53, 53, 61, 54, 63, 47, 41, 63, 40, 57, 53, 52, 46, 63, 52, 46, 116, 57, 53, 55])

export const GOOGLE_OAUTH_CLIENT_SECRET = gEnv?.DSH_GEMINI_CLIENT_SECRET
  || decodeCredential([29, 21, 25, 9, 10, 2, 119, 110, 47, 18, 61, 23, 10, 55, 119, 107, 53, 109, 9, 49, 119, 61, 63, 12, 108, 25, 47, 111, 57, 54, 2, 28, 41, 34, 54])

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const

export const CODE_ASSIST_ENDPOINT_PRIMARY = 'https://cloudcode-pa.googleapis.com/v1internal' as const
export const CODE_ASSIST_ENDPOINT_DAILY = 'https://daily-cloudcode-pa.googleapis.com/v1internal' as const

export const DEFAULT_CALLBACK_PORT = 8085 as const
export const OAUTH_LOGIN_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000 // 5 minutes
