import { describe, expect, it, vi } from 'vitest'
import { UsageService } from '../src/host/usage-service.ts'
import { OAuthService } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'

describe('Usage Service', () => {
  it('fetches quota and extracts tier info', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
      expiresAt: Date.now() + 100000,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        currentTier: { id: 'free-tier', name: 'Antigravity Free Tier' },
        cloudaicompanionProject: 'test-proj',
      }),
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    const usage = new UsageService(oauth, { fetchFn: fetchMock as unknown as typeof fetch })
    const quota = await usage.getQuota()

    expect(quota.tier).toBe('free-tier')
    expect(quota.projectId).toBe('test-proj')
  })

  it('measures connection latency', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
      expiresAt: Date.now() + 100000,
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
