import { describe, expect, it, vi } from 'vitest'
import {
  UsageService,
  parseQuotaBuckets,
  parseWindowFromFraction,
} from '../src/host/usage-service.ts'
import { OAuthService } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'

describe('Usage Service', () => {
  it('converts remainingFraction 0.72 to 72% remaining and 28% used', () => {
    const window = parseWindowFromFraction(0.72, '2026-08-24T18:00:00Z', 300)
    expect(window).not.toBeNull()
    expect(window?.remainingFraction).toBe(0.72)
    expect(window?.remainingPercent).toBe(72)
    expect(window?.usedPercent).toBe(28)
    expect(window?.windowDurationMins).toBe(300)
    expect(window?.resetsAt).toBe(Date.parse('2026-08-24T18:00:00Z'))
  })

  it('handles clamped boundary remainingFraction (0, 1, and negative/overflow)', () => {
    const zero = parseWindowFromFraction(0)
    expect(zero?.remainingPercent).toBe(0)
    expect(zero?.usedPercent).toBe(100)

    const full = parseWindowFromFraction(1)
    expect(full?.remainingPercent).toBe(100)
    expect(full?.usedPercent).toBe(0)

    const overflow = parseWindowFromFraction(1.5)
    expect(overflow?.remainingPercent).toBe(100)
    expect(overflow?.usedPercent).toBe(0)
  })

  it('parses multi-bucket model quotas and credits from loadCodeAssist payload', () => {
    const rawData = {
      paidTier: {
        id: 'google-ai-pro',
        name: 'Google AI Pro',
        availableCredits: [
          {
            creditType: 'GOOGLE_ONE_AI',
            creditAmount: '1000',
            minimumCreditAmountForUsage: '1',
          },
        ],
      },
      quota: {
        buckets: [
          {
            modelId: 'gemini-2.5-pro',
            modelName: 'Gemini 2.5 Pro',
            remainingFraction: 0.8,
            resetTime: '2026-08-24T20:00:00Z',
          },
          {
            modelId: 'gemini-3.7-flash',
            modelName: 'Gemini 3.7 Flash',
            remainingFraction: 0.55,
            resetTime: '2026-08-24T22:00:00Z',
          },
        ],
      },
    }

    const buckets = parseQuotaBuckets(rawData, 'Google AI Pro')
    expect(buckets.length).toBe(3)

    // Check model buckets
    const pro = buckets.find(b => b.id === 'gemini-2.5-pro')
    expect(pro).toBeDefined()
    expect(pro?.primary?.remainingPercent).toBe(80)
    expect(pro?.primary?.usedPercent).toBe(20)
    expect(pro?.primary?.resetsAt).toBe(Date.parse('2026-08-24T20:00:00Z'))

    const flash = buckets.find(b => b.id === 'gemini-3.7-flash')
    expect(flash).toBeDefined()
    expect(flash?.primary?.remainingPercent).toBe(55)
    expect(flash?.primary?.usedPercent).toBe(45)

    // Check credit bucket: stores absolute raw quantity 1000, primary is null
    const credit = buckets.find(b => b.id === 'credit-google_one_ai')
    expect(credit).toBeDefined()
    expect(credit?.name).toBe('Google One AI Credits')
    expect(credit?.creditAmount).toBe(1000)
    expect(credit?.primary).toBeNull()
  })

  it('parses model quotas directly from dynamic fetchAvailableModels models catalog', () => {
    const dynamicModels = [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Flash model',
        contextWindow: 1048576,
        maxContextWindow: 1048576,
        maxOutputTokens: 65536,
        reasoning: true,
        vision: true,
        tools: true,
        upstreamModel: 'gemini-2.5-flash',
        quotaInfo: {
          remainingFraction: 0.72,
          resetTime: '2026-08-24T18:00:00Z',
        },
      },
      {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        description: 'Hybrid reasoning',
        contextWindow: 1048576,
        maxContextWindow: 1048576,
        maxOutputTokens: 65536,
        reasoning: true,
        vision: true,
        tools: true,
        upstreamModel: 'gemini-3.7-flash',
        quotaInfo: {
          remainingFraction: 1.0,
          resetTime: '2026-08-24T21:00:00Z',
        },
      },
    ]

    const buckets = parseQuotaBuckets(null, 'Google AI Pro', dynamicModels)
    expect(buckets.length).toBe(2)

    const flash = buckets.find(b => b.id === 'gemini-2.5-flash')
    expect(flash).toBeDefined()
    expect(flash?.name).toBe('Gemini 2.5 Flash')
    expect(flash?.primary?.remainingPercent).toBe(72)
    expect(flash?.primary?.usedPercent).toBe(28)
    expect(flash?.primary?.resetsAt).toBe(Date.parse('2026-08-24T18:00:00Z'))

    const flash37 = buckets.find(b => b.id === 'gemini-3.7-flash')
    expect(flash37).toBeDefined()
    expect(flash37?.primary?.remainingPercent).toBe(100)
    expect(flash37?.primary?.usedPercent).toBe(0)
  })

  it('falls back from daily endpoint to prod endpoint when daily fails (Daily-first order)', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
      expiresAt: Date.now() + 3600 * 1000,
    })

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('daily-cloudcode-pa.googleapis.com')) {
        return Promise.reject(new Error('Daily endpoint network error'))
      }
      if (url.includes('cloudcode-pa.googleapis.com')) {
        if (url.includes('loadCodeAssist')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              currentTier: { id: 'pro-tier', name: 'Antigravity Pro' },
              cloudaicompanionProject: 'prod-proj',
            }),
          })
        }
        if (url.includes('fetchAvailableModels')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              models: {
                'gemini-2.5-pro': {
                  displayName: 'Gemini 2.5 Pro',
                  quotaInfo: {
                    remainingFraction: 0.65,
                    resetTime: '2026-08-24T19:00:00Z',
                  },
                },
              },
            }),
          })
        }
      }
      return Promise.reject(new Error('Unknown url: ' + url))
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    const usage = new UsageService(oauth, { fetchFn: fetchMock as unknown as typeof fetch })
    const quota = await usage.getQuota(true)

    expect(quota.tier).toBe('pro-tier')
    expect(quota.projectId).toBe('prod-proj')
    expect(quota.buckets.length).toBe(1)
    expect(quota.buckets[0].primary?.remainingPercent).toBe(65)
    expect(quota.buckets[0].primary?.usedPercent).toBe(35)
  })

  it('measures connection latency', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
      expiresAt: Date.now() + 3600 * 1000,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    const usage = new UsageService(oauth, { fetchFn: fetchMock as unknown as typeof fetch })
    const res = await usage.testConnection()

    expect(res.ok).toBe(true)
    expect(res.latencyMs).toBeGreaterThanOrEqual(0)
  })
})
