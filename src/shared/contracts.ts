export interface SanitizedAccountDto {
  email: string | null
  name: string | null
  picture: string | null
  planType: string | null
  projectId: string | null
  tokenExpiresAt: number
}

export type CredentialStorageKind =
  | 'windows-dpapi'
  | 'macos-keychain'
  | 'linux-file'
  | 'memory'

export interface CredentialStorageDto {
  kind: CredentialStorageKind
  encrypted: boolean
  available: boolean
}


export interface QuotaBucketDto {
  bucketId: string
  displayName: string
  window?: string | null
  remainingFraction: number
  remainingPercent: number
  usedPercent: number
  resetTime?: string | null
  resetsAt?: number | null
  disabled?: boolean
}

export interface QuotaGroupDto {
  displayName: string
  description?: string | null
  buckets: QuotaBucketDto[]
}

export interface QuotaStatusDto {
  quotaGroups: QuotaGroupDto[]
  tier: string | null
  tierDisplayName: string | null
  projectId: string | null
  fetchedAt: number | null
}

export interface PublicErrorDto {
  code:
    | 'bad-request'
    | 'csrf-rejected'
    | 'not-authenticated'
    | 'oauth-failed'
    | 'token-refresh-failed'
    | 'network-error'
    | 'storage-failed'
    | 'service-error'
  message: string
}

export interface GeminiContextWindowOverridesDto {
  'gemini-3.7-flash-high': number
  'gemini-3.7-flash-medium': number
  'gemini-3.7-flash-low': number
  'gemini-3.6-flash-high': number
  'gemini-3.1-pro-high': number
  'gpt-oss-120b-medium': number
}

export interface SubscriptionPreferencesDto {
  quickQuotaVisible: boolean
  searchProvider?: string
  subagentEnabled: boolean
  subagentProvider: string
  subagentModel: string
  subagentReasoningEffort: string | null
  subagentContextWindow: number
  subagentMaxDepth: number
  subagentMaxAgents: number
  contextWindowOverrides: GeminiContextWindowOverridesDto
  defaultThinkingBudget: number
  writable: boolean
}

export interface SubscriptionPreferencesUpdateDto {
  quickQuotaVisible?: boolean
  searchProvider?: string
  subagentEnabled?: boolean
  subagentProvider?: string
  subagentModel?: string
  subagentReasoningEffort?: string | null
  subagentContextWindow?: number
  subagentMaxDepth?: number
  subagentMaxAgents?: number
  contextWindowOverrides?: Partial<GeminiContextWindowOverridesDto>
  defaultThinkingBudget?: number
}

export interface PluginStatusDto {
  authenticated: boolean
  account: SanitizedAccountDto | null
  storage: CredentialStorageDto
  login: {
    active: boolean
    loginId: string | null
    expiresAt: number | null
  }
  quota: QuotaStatusDto
  preferences: SubscriptionPreferencesDto
  error?: PublicErrorDto
}

export type OAuthStatusDto = Omit<PluginStatusDto, 'quota' | 'preferences'>

export interface LoginStartDto {
  loginId: string
  authUrl: string
  expiresAt: number
}

export type LoginEventDto =
  | { type: 'started'; loginId: string; expiresAt: number }
  | { type: 'completed'; account: SanitizedAccountDto }
  | { type: 'failed'; error: PublicErrorDto }
  | { type: 'cancelled' }

export type ApiEnvelope<T> =
  | { ok: true; value: T }
  | { ok: false; error: PublicErrorDto }
