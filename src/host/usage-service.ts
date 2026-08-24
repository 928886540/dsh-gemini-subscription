import {
  ANTIGRAVITY_ENDPOINT_DAILY,
  ANTIGRAVITY_ENDPOINT_PRIMARY,
  ANTIGRAVITY_USER_AGENT,
} from '../compat.ts'
import type {
  QuotaBucketDto,
  QuotaStatusDto,
  QuotaWindowDto,
} from '../shared/contracts.ts'
import type { OAuthService } from './oauth-service.ts'

type FetchLike = typeof fetch

export interface AvailableCreditItem {
  creditType?: string
  creditAmount?: string | number
  minimumCreditAmountForUsage?: string | number
}

export interface RawModelQuotaItem {
  modelId?: string
  modelName?: string
  name?: string
  remainingFraction?: number
  resetTime?: string
  windowDurationMins?: number
}

export interface LoadCodeAssistResponse {
  currentTier?: {
    id?: string
    name?: string
    description?: string
  }
  paidTier?: {
    id?: string
    name?: string
    availableCredits?: AvailableCreditItem[]
  }
  userTier?: {
    id?: string
    name?: string
  }
  allowedTiers?: Array<{
    id?: string
    name?: string
    isDefault?: boolean
  }>
  cloudaicompanionProject?: string | { id?: string }
  quota?: {
    remainingFraction?: number
    resetTime?: string
    windowDurationMins?: number
    buckets?: RawModelQuotaItem[]
    modelQuotas?: RawModelQuotaItem[]
    models?: Record<string, { remainingFraction?: number; resetTime?: string; windowDurationMins?: number }>
  }
  quotaInfo?: {
    remainingFraction?: number
    resetTime?: string
  }
  modelQuotas?: RawModelQuotaItem[]
}

export interface UsageServiceOptions {
  fetchFn?: FetchLike
  now?: () => number
  cacheTtlMs?: number
}

export class UsageService {
  private readonly fetchFn: FetchLike
  private readonly now: () => number
  private readonly cacheTtlMs: number
  private cachedQuota: QuotaStatusDto | null = null
  private lastFetchedAt = 0

  constructor(
    private readonly oauth: OAuthService,
    options: UsageServiceOptions = {},
  ) {
    this.fetchFn = options.fetchFn ?? fetch
    this.now = options.now ?? Date.now
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000
  }

  invalidate(): void {
    this.cachedQuota = null
    this.lastFetchedAt = 0
  }

  async getQuota(force = false): Promise<QuotaStatusDto> {
    if (!force && this.cachedQuota && this.now() - this.lastFetchedAt < this.cacheTtlMs) {
      return this.cachedQuota
    }

    try {
      const credentials = await this.oauth.credentials()
      const endpoints = [ANTIGRAVITY_ENDPOINT_PRIMARY, ANTIGRAVITY_ENDPOINT_DAILY]
      let assistData: LoadCodeAssistResponse | null = null

      for (const base of endpoints) {
        try {
          const res = await this.fetchFn(`${base}/v1internal:loadCodeAssist`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${credentials.accessToken}`,
              'content-type': 'application/json',
              'user-agent': ANTIGRAVITY_USER_AGENT,
              'x-goog-api-client': 'gl-node/22.21.1',
            },
            body: JSON.stringify({
              metadata: {
                ideType: 'ANTIGRAVITY',
              },
            }),
          })
          if (res.ok) {
            assistData = await res.json() as LoadCodeAssistResponse
            break
          }
        } catch {
          // continue to next endpoint
        }
      }

      const tier = assistData?.paidTier?.id ?? assistData?.currentTier?.id ?? assistData?.userTier?.id ?? 'free-tier'
      const tierDisplayName = assistData?.paidTier?.name ?? assistData?.currentTier?.name ?? assistData?.userTier?.name ?? 'Antigravity Free Tier'
      
      let projectId = credentials.projectId
      if (typeof assistData?.cloudaicompanionProject === 'string' && assistData.cloudaicompanionProject.trim().length > 0) {
        projectId = assistData.cloudaicompanionProject.trim()
      } else if (typeof assistData?.cloudaicompanionProject === 'object' && assistData.cloudaicompanionProject?.id) {
        projectId = assistData.cloudaicompanionProject.id.trim()
      }

      const buckets = parseQuotaBuckets(assistData, tierDisplayName)

      const quotaDto: QuotaStatusDto = {
        buckets,
        tier,
        tierDisplayName,
        projectId: projectId ?? null,
        fetchedAt: this.now(),
      }

      this.cachedQuota = quotaDto
      this.lastFetchedAt = this.now()
      return quotaDto
    } catch {
      return {
        buckets: [],
        tier: null,
        tierDisplayName: null,
        projectId: null,
        fetchedAt: this.cachedQuota?.fetchedAt ?? null,
      }
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = this.now()
    try {
      const credentials = await this.oauth.credentials()
      const res = await this.fetchFn(`${ANTIGRAVITY_ENDPOINT_PRIMARY}/v1internal:loadCodeAssist`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${credentials.accessToken}`,
          'content-type': 'application/json',
          'user-agent': ANTIGRAVITY_USER_AGENT,
          'x-goog-api-client': 'gl-node/22.21.1',
        },
        body: JSON.stringify({
          metadata: {
            ideType: 'ANTIGRAVITY',
          },
        }),
      })

      const latencyMs = this.now() - start
      if (res.ok) {
        return { ok: true, latencyMs }
      }
      const errText = await res.text().catch(() => '')
      return { ok: false, latencyMs, error: `HTTP ${res.status}: ${errText}` }
    } catch (err) {
      return {
        ok: false,
        latencyMs: this.now() - start,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

export function parseQuotaBuckets(data: LoadCodeAssistResponse | null, planType: string): QuotaBucketDto[] {
  if (!data) return []
  const buckets: QuotaBucketDto[] = []

  // 1. Check model-level quota arrays
  const rawModelList = data.quota?.buckets ?? data.quota?.modelQuotas ?? data.modelQuotas
  if (Array.isArray(rawModelList) && rawModelList.length > 0) {
    for (const item of rawModelList) {
      const id = item.modelId ?? item.name ?? 'model-quota'
      const name = item.modelName ?? item.name ?? item.modelId ?? 'Model Quota'
      const window = parseWindowFromFraction(item.remainingFraction, item.resetTime, item.windowDurationMins)
      if (window) {
        buckets.push({
          id,
          name,
          planType,
          primary: window,
          secondary: null,
          windows: [window],
        })
      }
    }
  }

  // 2. Check model dictionary in quota.models
  if (data.quota?.models && typeof data.quota.models === 'object') {
    for (const [modelId, modelInfo] of Object.entries(data.quota.models)) {
      const window = parseWindowFromFraction(modelInfo.remainingFraction, modelInfo.resetTime, modelInfo.windowDurationMins)
      if (window) {
        buckets.push({
          id: modelId,
          name: formatModelName(modelId),
          planType,
          primary: window,
          secondary: null,
          windows: [window],
        })
      }
    }
  }

  // 3. Check global quota remainingFraction
  const globalRemaining = data.quota?.remainingFraction ?? data.quotaInfo?.remainingFraction
  const globalResetTime = data.quota?.resetTime ?? data.quotaInfo?.resetTime
  const globalDuration = data.quota?.windowDurationMins
  if (typeof globalRemaining === 'number' && Number.isFinite(globalRemaining) && buckets.length === 0) {
    const window = parseWindowFromFraction(globalRemaining, globalResetTime, globalDuration)
    if (window) {
      buckets.push({
        id: 'antigravity-global-quota',
        name: 'Antigravity Quota',
        planType,
        primary: window,
        secondary: null,
        windows: [window],
      })
    }
  }

  // 4. Check available credits in paidTier
  if (Array.isArray(data.paidTier?.availableCredits)) {
    for (const credit of data.paidTier.availableCredits) {
      const type = credit.creditType ?? 'AI_CREDITS'
      const amount = typeof credit.creditAmount === 'number'
        ? credit.creditAmount
        : typeof credit.creditAmount === 'string'
          ? parseFloat(credit.creditAmount)
          : NaN
      const minAmount = typeof credit.minimumCreditAmountForUsage === 'number'
        ? credit.minimumCreditAmountForUsage
        : typeof credit.minimumCreditAmountForUsage === 'string'
          ? parseFloat(credit.minimumCreditAmountForUsage)
          : 0

      if (!Number.isNaN(amount)) {
        const remainingPercent = Math.max(0, Math.min(100, Math.round(amount)))
        const usedPercent = 100 - remainingPercent
        buckets.push({
          id: `credit-${type.toLowerCase()}`,
          name: type === 'GOOGLE_ONE_AI' ? 'Google One AI Credits' : type,
          planType,
          primary: {
            usedPercent,
            remainingPercent,
            remainingFraction: amount / 100,
            windowDurationMins: null,
            resetsAt: null,
          },
          secondary: null,
          windows: [],
        })
      }
    }
  }

  return buckets
}

export function parseWindowFromFraction(
  remainingFraction: number | undefined,
  resetTimeStr?: string,
  durationMins?: number,
): QuotaWindowDto | null {
  if (typeof remainingFraction !== 'number' || Number.isNaN(remainingFraction)) {
    return null
  }
  const clampedFraction = Math.max(0, Math.min(1, remainingFraction))
  const remainingPercent = Math.round(clampedFraction * 100)
  const usedPercent = Math.max(0, Math.min(100, 100 - remainingPercent))

  let resetsAt: number | null = null
  if (typeof resetTimeStr === 'string' && resetTimeStr.trim().length > 0) {
    const parsed = Date.parse(resetTimeStr)
    if (!Number.isNaN(parsed)) {
      resetsAt = parsed
    }
  }

  return {
    usedPercent,
    remainingPercent,
    remainingFraction: clampedFraction,
    windowDurationMins: typeof durationMins === 'number' && Number.isFinite(durationMins) ? durationMins : null,
    resetsAt,
  }
}

function formatModelName(modelId: string): string {
  const parts = modelId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1))
  return parts.join(' ')
}
