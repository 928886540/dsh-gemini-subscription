import {
  CODE_ASSIST_ENDPOINT_DAILY,
  CODE_ASSIST_ENDPOINT_PRIMARY,
} from '../compat.ts'
import type {
  QuotaBucketDto,
  QuotaStatusDto,
} from '../shared/contracts.ts'
import type { OAuthService } from './oauth-service.ts'

type FetchLike = typeof fetch

interface LoadCodeAssistResponse {
  currentTier?: {
    id?: string
    name?: string
    description?: string
  }
  paidTier?: {
    id?: string
    name?: string
  }
  cloudaicompanionProject?: string
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
      const endpoints = [CODE_ASSIST_ENDPOINT_PRIMARY, CODE_ASSIST_ENDPOINT_DAILY]
      let assistData: LoadCodeAssistResponse | null = null

      for (const base of endpoints) {
        try {
          const res = await this.fetchFn(`${base}:loadCodeAssist`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${credentials.accessToken}`,
              'content-type': 'application/json',
              'user-agent': 'Antigravity/1.0.0',
            },
            body: JSON.stringify({}),
          })
          if (res.ok) {
            assistData = await res.json() as LoadCodeAssistResponse
            break
          }
        } catch {
          // continue to next endpoint
        }
      }

      const tier = assistData?.paidTier?.id ?? assistData?.currentTier?.id ?? 'free-tier'
      const tierDisplayName = assistData?.paidTier?.name ?? assistData?.currentTier?.name ?? 'Antigravity Free Tier'
      const projectId = assistData?.cloudaicompanionProject ?? credentials.projectId ?? 'default-cli-project'

      const buckets: QuotaBucketDto[] = [
        {
          id: 'gemini-code-assist',
          name: 'Gemini Code Assist',
          planType: tierDisplayName,
          primary: {
            usedPercent: 0,
            windowDurationMins: 1440,
            resetsAt: null,
          },
          secondary: null,
          windows: [],
        },
      ]

      const quotaDto: QuotaStatusDto = {
        buckets,
        tier,
        tierDisplayName,
        projectId,
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
      const res = await this.fetchFn(`${CODE_ASSIST_ENDPOINT_PRIMARY}:loadCodeAssist`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${credentials.accessToken}`,
          'content-type': 'application/json',
          'user-agent': 'Antigravity/1.0.0',
        },
        body: JSON.stringify({}),
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
