import {
  ANTIGRAVITY_ENDPOINTS,
  ANTIGRAVITY_USER_AGENT,
} from '../compat.ts'
import type {
  QuotaBucketDto,
  QuotaGroupDto,
  QuotaStatusDto,
} from '../shared/contracts.ts'
import {
  fetchDynamicAntigravityModels,
} from '../shared/model-catalog.ts'
import type { OAuthService } from './oauth-service.ts'

type FetchLike = typeof fetch

export interface RawQuotaBucket {
  bucketId?: string
  displayName?: string
  window?: string
  remainingFraction?: number
  remainingAmount?: string | number
  resetTime?: string
  disabled?: boolean
}

export interface RawQuotaGroup {
  displayName?: string
  description?: string
  buckets?: RawQuotaBucket[]
}

export interface RetrieveUserQuotaSummaryResponse {
  groups?: RawQuotaGroup[]
  cloudaicompanionProject?: string | { id?: string }
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
  }
  userTier?: {
    id?: string
    name?: string
  }
  cloudaicompanionProject?: string | { id?: string }
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
      let quotaSummaryData: RetrieveUserQuotaSummaryResponse | null = null
      let assistData: LoadCodeAssistResponse | null = null

      const requestPayload = credentials.projectId ? { project: credentials.projectId } : {}

      // 1. Fetch real quota groups via retrieveUserQuotaSummary
      for (const base of ANTIGRAVITY_ENDPOINTS) {
        try {
          const res = await this.fetchFn(`${base}/v1internal:retrieveUserQuotaSummary`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${credentials.accessToken}`,
              'content-type': 'application/json',
              'user-agent': ANTIGRAVITY_USER_AGENT,
              'x-goog-api-client': 'gl-node/22.21.1',
            },
            body: JSON.stringify(requestPayload),
          })
          if (res.ok) {
            quotaSummaryData = await res.json() as RetrieveUserQuotaSummaryResponse
            break
          }
        } catch {
          // continue to next endpoint
        }
      }

      // 2. Fetch tier metadata via loadCodeAssist (optional / supplementary)
      for (const base of ANTIGRAVITY_ENDPOINTS) {
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

      const tier = assistData?.paidTier?.id ?? assistData?.currentTier?.id ?? assistData?.userTier?.id ?? null
      const tierDisplayName = assistData?.paidTier?.name ?? assistData?.currentTier?.name ?? assistData?.userTier?.name ?? null

      let projectId = credentials.projectId
      const rawProject = quotaSummaryData?.cloudaicompanionProject ?? assistData?.cloudaicompanionProject
      if (typeof rawProject === 'string' && rawProject.trim().length > 0) {
        projectId = rawProject.trim()
      } else if (typeof rawProject === 'object' && rawProject?.id) {
        projectId = rawProject.id.trim()
      }

      // Also refresh dynamic model catalog in background
      try {
        await fetchDynamicAntigravityModels(credentials.accessToken, projectId, this.fetchFn)
      } catch {
        // ignore
      }

      const quotaGroups = parseQuotaGroups(quotaSummaryData)

      const quotaDto: QuotaStatusDto = {
        quotaGroups,
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
        quotaGroups: [],
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
      let lastErr = ''
      for (const base of ANTIGRAVITY_ENDPOINTS) {
        try {
          const res = await this.fetchFn(`${base}/v1internal:retrieveUserQuotaSummary`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${credentials.accessToken}`,
              'content-type': 'application/json',
              'user-agent': ANTIGRAVITY_USER_AGENT,
              'x-goog-api-client': 'gl-node/22.21.1',
            },
            body: JSON.stringify(credentials.projectId ? { project: credentials.projectId } : {}),
          })

          const latencyMs = this.now() - start
          if (res.ok) {
            return { ok: true, latencyMs }
          }
          lastErr = `HTTP ${res.status}: ${await res.text().catch(() => '')}`
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e)
        }
      }

      return {
        ok: false,
        latencyMs: this.now() - start,
        error: lastErr || 'Connection failed',
      }
    } catch (err) {
      return {
        ok: false,
        latencyMs: this.now() - start,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

export function parseQuotaGroups(data: RetrieveUserQuotaSummaryResponse | null): QuotaGroupDto[] {
  if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
    return []
  }

  const groups: QuotaGroupDto[] = []
  for (const rawGroup of data.groups) {
    const displayName = rawGroup.displayName || 'Model Quota'
    const rawBuckets = Array.isArray(rawGroup.buckets) ? rawGroup.buckets : []
    const buckets: QuotaBucketDto[] = []

    for (const b of rawBuckets) {
      if (typeof b.remainingFraction !== 'number' || Number.isNaN(b.remainingFraction)) {
        continue
      }
      const fraction = Math.max(0, Math.min(1, b.remainingFraction))
      const remainingPercent = Math.round(fraction * 10000) / 100
      const usedPercent = Math.round((1 - fraction) * 10000) / 100

      let resetsAt: number | null = null
      if (typeof b.resetTime === 'string' && b.resetTime.trim().length > 0) {
        const parsed = Date.parse(b.resetTime)
        if (!Number.isNaN(parsed)) {
          resetsAt = parsed
        }
      }

      buckets.push({
        bucketId: b.bucketId || displayName,
        displayName: b.displayName || b.bucketId || 'Quota',
        window: b.window || null,
        remainingFraction: fraction,
        remainingPercent,
        usedPercent,
        resetTime: b.resetTime || null,
        resetsAt,
        disabled: b.disabled === true,
      })
    }

    if (buckets.length > 0) {
      groups.push({
        displayName,
        description: rawGroup.description || null,
        buckets,
      })
    }
  }

  return groups
}


