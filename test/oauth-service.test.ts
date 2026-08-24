import { describe, expect, it, vi } from 'vitest'
import { OAuthService, buildAuthorizationUrl } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'
import { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_SCOPES } from '../src/compat.ts'

describe('OAuth Service', () => {
  it('builds valid Antigravity PKCE authorization URL with all required scopes and parameters', () => {
    const redirectUri = 'http://127.0.0.1:51121/callback'
    const url = buildAuthorizationUrl('verifier-12345678901234567890', 'state-123', redirectUri)
    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(parsed.searchParams.get('client_id')).toBe(GOOGLE_OAUTH_CLIENT_ID)
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
    expect(parsed.searchParams.get('state')).toBe('state-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    expect(parsed.searchParams.get('prompt')).toBe('consent')

    // Verify all 5 Antigravity scopes
    const scopeParam = parsed.searchParams.get('scope') ?? ''
    expect(scopeParam).toContain('https://www.googleapis.com/auth/cloud-platform')
    expect(scopeParam).toContain('https://www.googleapis.com/auth/userinfo.email')
    expect(scopeParam).toContain('https://www.googleapis.com/auth/userinfo.profile')
    expect(scopeParam).toContain('https://www.googleapis.com/auth/cclog')
    expect(scopeParam).toContain('https://www.googleapis.com/auth/experimentsandconfigs')
    expect(GOOGLE_OAUTH_SCOPES.length).toBe(5)
  })

  it('reports initial unauthenticated status', async () => {
    const store = new MemoryTokenStore()
    const oauth = new OAuthService(store)
    const status = await oauth.status()
    expect(status.authenticated).toBe(false)
    expect(status.account).toBeNull()
    expect(status.login.active).toBe(false)
  })

  it('handles token refresh silently when Google response omits refresh_token', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'old-access',
      refreshToken: 'my-stored-refresh-token',
      expiresAt: Date.now() - 1000,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        expires_in: 3600,
      }),
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    const creds = await oauth.credentials()
    expect(creds.accessToken).toBe('new-access-token')
    expect(creds.refreshToken).toBe('my-stored-refresh-token')
  })

  it('handles token refresh silently and updates storage', async () => {
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

  it('clears credentials and handles 400/401 expired refresh tokens', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'old-access',
      refreshToken: 'revoked-refresh',
      expiresAt: Date.now() - 1000,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'invalid_grant',
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    await expect(oauth.credentials()).rejects.toThrow()
    const current = await store.load()
    expect(current).toBeNull()
  })
})
