import { describe, expect, it, vi } from 'vitest'
import {
  UsageService,
  parseQuotaGroups,
} from '../src/host/usage-service.ts'
import { OAuthService } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'

describe('Usage Service', () => {
  it('parses real quota groups and buckets from retrieveUserQuotaSummary payload', () => {
    const rawData = {
      groups: [
        {
          displayName: 'Gemini Models',
          description: 'Gemini models quota',
          buckets: [
            {
              bucketId: 'gemini_weekly',
              displayName: 'Weekly',
              remainingFraction: 0.7847,
              resetTime: '2026-08-27T16:52:00Z',
            },
            {
              bucketId: 'gemini_five_hour',
              displayName: 'Five Hour',
              remainingFraction: 0.0,
              resetTime: '2026-08-24T07:43:00Z',
            },
          ],
        },
        {
          displayName: 'Claude and GPT Models',
          buckets: [
            {
              bucketId: 'claude_gpt_weekly',
              displayName: 'Weekly',
              remainingFraction: 0.8361,
              resetTime: '2026-08-27T21:47:00Z',
            },
            {
              bucketId: 'claude_gpt_five_hour',
              displayName: 'Five Hour',
              remainingFraction: 0.9896,
              resetTime: '2026-08-24T11:38:00Z',
            },
          ],
        },
      ],
    }

    const groups = parseQuotaGroups(rawData)
    expect(groups.length).toBe(2)

    const geminiGroup = groups.find(g => g.displayName === 'Gemini Models')
    expect(geminiGroup).toBeDefined()
    expect(geminiGroup?.buckets.length).toBe(2)

    const weeklyGemini = geminiGroup?.buckets.find(b => b.bucketId === 'gemini_weekly')
    expect(weeklyGemini?.remainingPercent).toBe(78.47)
    expect(weeklyGemini?.usedPercent).toBe(21.53)
    expect(weeklyGemini?.resetsAt).toBe(Date.parse('2026-08-27T16:52:00Z'))

    const fiveHourGemini = geminiGroup?.buckets.find(b => b.bucketId === 'gemini_five_hour')
    expect(fiveHourGemini?.remainingPercent).toBe(0)
    expect(fiveHourGemini?.usedPercent).toBe(100)

    const claudeGroup = groups.find(g => g.displayName === 'Claude and GPT Models')
    expect(claudeGroup).toBeDefined()
    const fiveHourClaude = claudeGroup?.buckets.find(b => b.bucketId === 'claude_gpt_five_hour')
    expect(fiveHourClaude?.remainingPercent).toBe(98.96)
    expect(fiveHourClaude?.usedPercent).toBe(1.04)
  })

  it('returns empty array when upstream provides no groups (no fake placeholders)', () => {
    const emptyGroups = parseQuotaGroups(null)
    expect(emptyGroups).toEqual([])

    const emptyObj = parseQuotaGroups({})
    expect(emptyObj).toEqual([])
  })

  it('fetches quota via retrieveUserQuotaSummary with fallback endpoints', async () => {
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
        if (url.includes('retrieveUserQuotaSummary')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              cloudaicompanionProject: 'test-proj',
              groups: [
                {
                  displayName: 'Gemini Models',
                  buckets: [
                    {
                      bucketId: 'five_hour',
                      displayName: 'Five Hour',
                      remainingFraction: 0.5,
                      resetTime: '2026-08-24T20:00:00Z',
                    },
                  ],
                },
              ],
            }),
          })
        }
        if (url.includes('loadCodeAssist')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              paidTier: { id: 'pro-tier', name: 'Google AI Pro' },
            }),
          })
        }
        if (url.includes('fetchAvailableModels')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              models: {},
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
    expect(quota.projectId).toBe('test-proj')
    expect(quota.quotaGroups.length).toBe(1)
    expect(quota.quotaGroups[0].buckets[0].remainingPercent).toBe(50)
  })

  it('measures connection latency via retrieveUserQuotaSummary', async () => {
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

  it('strictly parses only 7D bucket when upstream returns only weekly (no fake 5H)', () => {
    const rawData = {
      groups: [
        {
          displayName: 'Claude and GPT models',
          buckets: [
            {
              bucketId: '3p-weekly',
              displayName: 'Weekly Limit Remaining',
              window: 'weekly',
              remainingFraction: 0.8441,
              resetTime: '2026-08-27T13:35:49Z',
            },
          ],
        },
      ],
    }

    const groups = parseQuotaGroups(rawData)
    expect(groups.length).toBe(1)
    expect(groups[0].buckets.length).toBe(1)
    expect(groups[0].buckets[0].bucketId).toBe('3p-weekly')
    expect(groups[0].buckets[0].window).toBe('weekly')
    expect(groups[0].buckets[0].remainingPercent).toBe(84.41)
  })

  it('strictly parses only 5H bucket when upstream returns only 5h (no fake weekly)', () => {
    const rawData = {
      groups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            {
              bucketId: 'gemini-5h',
              displayName: 'Five Hour Limit Remaining',
              window: '5h',
              remainingFraction: 0.479,
              resetTime: '2026-08-24T12:30:44Z',
            },
          ],
        },
      ],
    }

    const groups = parseQuotaGroups(rawData)
    expect(groups.length).toBe(1)
    expect(groups[0].buckets.length).toBe(1)
    expect(groups[0].buckets[0].bucketId).toBe('gemini-5h')
    expect(groups[0].buckets[0].window).toBe('5h')
    expect(groups[0].buckets[0].remainingPercent).toBe(47.9)
  })

  it('handles asymmetric bucket counts between Gemini and Claude groups', () => {
    const rawData = {
      groups: [
        {
          displayName: 'Gemini Models',
          buckets: [
            { bucketId: 'gemini-weekly', window: 'weekly', remainingFraction: 0.7 },
            { bucketId: 'gemini-5h', window: '5h', remainingFraction: 0.5 },
          ],
        },
        {
          displayName: 'Claude and GPT models',
          buckets: [
            { bucketId: '3p-weekly', window: 'weekly', remainingFraction: 0.9 },
          ],
        },
      ],
    }

    const groups = parseQuotaGroups(rawData)
    expect(groups.length).toBe(2)
    expect(groups[0].buckets.length).toBe(2)
    expect(groups[1].buckets.length).toBe(1)
  })

  it('skips groups with empty or invalid buckets (no placeholder creation)', () => {
    const rawData = {
      groups: [
        {
          displayName: 'Empty Group',
          buckets: [],
        },
        {
          displayName: 'Invalid Bucket Group',
          buckets: [{ bucketId: 'corrupted' }],
        },
      ],
    }

    const groups = parseQuotaGroups(rawData)
    expect(groups.length).toBe(0)
  })

  it('preserves disabled bucket flags and custom window strings', () => {
    const rawData = {
      groups: [
        {
          displayName: 'Experimental Group',
          buckets: [
            {
              bucketId: 'exp-daily',
              displayName: 'Daily Rate Limit',
              window: 'custom_window_24h',
              remainingFraction: 0.12,
              disabled: true,
            },
          ],
        },
      ],
    }

    const groups = parseQuotaGroups(rawData)
    expect(groups.length).toBe(1)
    expect(groups[0].buckets[0].window).toBe('custom_window_24h')
    expect(groups[0].buckets[0].disabled).toBe(true)
  })
})

