import { describe, expect, it, vi } from 'vitest'
import { OAuthService, buildAuthorizationUrl } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'

describe('OAuth Service', () => {
  it('builds valid PKCE authorization URL', () => {
    const url = buildAuthorizationUrl('verifier-12345678901234567890', 'state-123', 'http://127.0.0.1:8085/callback')
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('response_type=code')
    expect(url).toContain('code_challenge_method=S256')
    expect(url).toContain('state=state-123')
  })

  it('reports initial unauthenticated status', async () => {
    const store = new MemoryTokenStore()
    const oauth = new OAuthService(store)
    const status = await oauth.status()
    expect(status.authenticated).toBe(false)
    expect(status.account).toBeNull()
    expect(status.login.active).toBe(false)
  })

  it('handles token refresh silently', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'old-access',
      refreshToken: 'valid-refresh',
      expiresAt: Date.now() - 1000,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'valid-refresh',
        expires_in: 3600,
      }),
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    const creds = await oauth.credentials()
    expect(creds.accessToken).toBe('new-access')
    expect(fetchMock).toHaveBeenCalled()
  })
})
