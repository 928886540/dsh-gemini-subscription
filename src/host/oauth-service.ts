import { createHash, randomBytes } from 'node:crypto'
import {
  CODE_ASSIST_ENDPOINT_DAILY,
  CODE_ASSIST_ENDPOINT_PRIMARY,
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  OAUTH_LOGIN_TIMEOUT_MS,
  TOKEN_REFRESH_MARGIN_MS,
} from '../compat.ts'
import type {
  LoginEventDto,
  LoginStartDto,
  OAuthStatusDto,
  PublicErrorDto,
  SanitizedAccountDto,
} from '../shared/contracts.ts'
import { OAuthCallbackServer } from './callback-server.ts'
import type { StoredOAuthCredentials, TokenStore } from './token-store.ts'

type FetchLike = typeof fetch
type LoginListener = (event: LoginEventDto) => void

interface GoogleTokenResponse {
  access_token?: unknown
  refresh_token?: unknown
  id_token?: unknown
  expires_in?: unknown
  token_type?: unknown
}

interface GoogleUserInfo {
  sub?: unknown
  email?: unknown
  name?: unknown
  picture?: unknown
}

interface CodeAssistLoadResponse {
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

interface ActiveLogin {
  id: string
  expiresAt: number
  server: OAuthCallbackServer
  timeout: NodeJS.Timeout
}

export class OAuthServiceError extends Error {
  constructor(readonly code: PublicErrorDto['code'], message: string) {
    super(message)
    this.name = 'OAuthServiceError'
  }
}

export interface OAuthServiceOptions {
  fetchFn?: FetchLike
  now?: () => number
  random?: (size: number) => Buffer
  logger?: Pick<Console, 'info' | 'warn'>
  loginTimeoutMs?: number
  preferredPort?: number
}

export class OAuthService {
  private readonly fetchFn: FetchLike
  private readonly now: () => number
  private readonly random: (size: number) => Buffer
  private readonly logger: Pick<Console, 'info' | 'warn'>
  private readonly loginTimeoutMs: number
  private readonly preferredPort?: number
  private readonly loginEvents = new Map<string, LoginEventDto>()
  private readonly listeners = new Map<string, Set<LoginListener>>()
  private activeLogin: ActiveLogin | null = null
  private refreshPromise: Promise<StoredOAuthCredentials> | null = null
  private lastLoginError: PublicErrorDto | undefined
  private disposed = false

  constructor(private readonly store: TokenStore, options: OAuthServiceOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch
    this.now = options.now ?? Date.now
    this.random = options.random ?? randomBytes
    this.logger = options.logger ?? console
    this.loginTimeoutMs = options.loginTimeoutMs ?? OAUTH_LOGIN_TIMEOUT_MS
    this.preferredPort = options.preferredPort
  }

  async status(): Promise<OAuthStatusDto> {
    try {
      const credentials = await this.store.load()
      return this.statusFromCredentials(credentials)
    } catch {
      return {
        ...this.statusFromCredentials(null, false),
        error: publicError(new OAuthServiceError('storage-failed', 'Secure credential storage could not be read.')),
      }
    }
  }

  async startLogin(): Promise<LoginStartDto> {
    this.assertAvailable()
    await this.store.load().catch(() => {
      throw new OAuthServiceError('storage-failed', 'Secure credential storage is unavailable.')
    })
    if (this.activeLogin !== null) {
      throw new OAuthServiceError('bad-request', 'A Google Gemini sign-in is already in progress.')
    }
    this.lastLoginError = undefined
    const loginId = this.random(24).toString('base64url')
    const verifier = this.random(48).toString('base64url')
    const state = this.random(32).toString('base64url')
    const expiresAt = this.now() + this.loginTimeoutMs

    const server = new OAuthCallbackServer({
      expectedState: state,
      preferredPort: this.preferredPort,
      exchange: async (code, redirectUri, signal) => this.exchangeCode(code, verifier, redirectUri, signal),
    })

    let assignedPort: number
    try {
      assignedPort = await server.listen()
    } catch {
      void server.completion.catch(() => undefined)
      server.dispose()
      throw new OAuthServiceError('service-error', 'The local OAuth callback server could not start.')
    }

    const redirectUri = `http://127.0.0.1:${assignedPort}/callback`
    const authUrl = buildAuthorizationUrl(verifier, state, redirectUri)

    const timeout = setTimeout(() => {
      this.cancelActive(new OAuthServiceError('oauth-failed', 'Google sign-in timed out.'), 'failed')
    }, this.loginTimeoutMs)
    timeout.unref?.()

    this.activeLogin = { id: loginId, expiresAt, server, timeout }
    this.publish({ type: 'started', loginId, expiresAt })

    void server.completion.then(() => {
      this.completeLogin(loginId)
    }).catch((error: unknown) => {
      this.failLogin(loginId, error)
    })

    this.logger.info('[dsh-gemini-subscription] Google OAuth login started')
    return { loginId, authUrl, expiresAt }
  }

  cancelLogin(loginId: string): void {
    if (this.activeLogin === null || this.activeLogin.id !== loginId) {
      throw new OAuthServiceError('bad-request', 'The requested sign-in is not active.')
    }
    this.cancelActive(new OAuthServiceError('oauth-failed', 'Google sign-in was cancelled.'), 'cancelled')
  }

  subscribe(loginId: string, listener: LoginListener): (() => void) | null {
    const current = this.loginEvents.get(loginId)
    if (current === undefined) return null
    let set = this.listeners.get(loginId)
    if (set === undefined) {
      set = new Set()
      this.listeners.set(loginId, set)
    }
    set.add(listener)
    listener(current)
    return () => {
      set?.delete(listener)
      if (set?.size === 0) this.listeners.delete(loginId)
    }
  }

  async refresh(): Promise<OAuthStatusDto> {
    this.assertAvailable()
    const stored = await this.loadAuthenticated()
    await this.refreshCredentials(stored)
    return this.status()
  }

  async logout(): Promise<void> {
    if (this.activeLogin !== null) {
      this.cancelActive(new OAuthServiceError('oauth-failed', 'Google sign-in was cancelled.'), 'cancelled')
    }
    await this.store.clear().catch(() => {
      throw new OAuthServiceError('storage-failed', 'Secure credentials could not be deleted.')
    })
    this.lastLoginError = undefined
    this.logger.info('[dsh-gemini-subscription] OAuth credentials cleared')
  }

  async credentials(forceRefresh = false): Promise<StoredOAuthCredentials> {
    const stored = await this.loadAuthenticated()
    if (forceRefresh || stored.expiresAt - this.now() <= TOKEN_REFRESH_MARGIN_MS) {
      return this.refreshCredentials(stored)
    }
    return stored
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.activeLogin !== null) {
      this.cancelActive(new OAuthServiceError('oauth-failed', 'Google sign-in was cancelled.'), 'cancelled')
    }
    this.listeners.clear()
    this.loginEvents.clear()
  }

  private async exchangeCode(code: string, verifier: string, redirectUri: string, signal: AbortSignal): Promise<void> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      code_verifier: verifier,
    })

    const response = await this.fetchFn(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal,
    }).catch(() => {
      throw new OAuthServiceError('oauth-failed', 'Google token exchange endpoint could not be reached.')
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new OAuthServiceError('oauth-failed', `Google token exchange failed (${response.status}): ${errText}`)
    }

    const tokens = await response.json() as GoogleTokenResponse
    const rawCredentials = credentialsFromTokenResponse(tokens, this.now())

    // Fetch user profile and Code Assist project info
    const profile = await this.fetchUserProfile(rawCredentials.accessToken).catch(() => null)
    const codeAssist = await this.fetchCodeAssistInfo(rawCredentials.accessToken).catch(() => null)

    const finalCredentials: StoredOAuthCredentials = {
      ...rawCredentials,
      email: profile?.email ?? rawCredentials.email,
      name: profile?.name ?? rawCredentials.name,
      picture: profile?.picture ?? rawCredentials.picture,
      planType: codeAssist?.paidTier?.name ?? codeAssist?.currentTier?.name ?? 'Free Tier',
      projectId: codeAssist?.cloudaicompanionProject ?? rawCredentials.projectId ?? 'default-cli-project',
    }

    await this.store.save(finalCredentials).catch(() => {
      throw new OAuthServiceError('storage-failed', 'Google credentials could not be saved securely.')
    })
  }

  private refreshCredentials(stored: StoredOAuthCredentials): Promise<StoredOAuthCredentials> {
    if (this.refreshPromise !== null) return this.refreshPromise
    this.refreshPromise = this.performRefresh(stored).finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private async performRefresh(stored: StoredOAuthCredentials): Promise<StoredOAuthCredentials> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    })

    const response = await this.fetchFn(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }).catch(() => {
      throw new OAuthServiceError('token-refresh-failed', 'Google token refresh endpoint could not be reached.')
    })

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        await this.store.clear().catch(() => {
          throw new OAuthServiceError('storage-failed', 'Expired Google credentials could not be deleted securely.')
        })
      }
      throw new OAuthServiceError('token-refresh-failed', `Google token refresh failed (${response.status}).`)
    }

    const tokens = await response.json() as GoogleTokenResponse
    const updated: StoredOAuthCredentials = {
      ...stored,
      accessToken: typeof tokens.access_token === 'string' ? tokens.access_token : stored.accessToken,
      refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : stored.refreshToken,
      idToken: typeof tokens.id_token === 'string' ? tokens.id_token : stored.idToken,
      expiresAt: typeof tokens.expires_in === 'number' ? this.now() + tokens.expires_in * 1000 : stored.expiresAt,
    }

    await this.store.save(updated).catch(() => {
      throw new OAuthServiceError('storage-failed', 'Refreshed Google credentials could not be saved securely.')
    })

    this.logger.info('[dsh-gemini-subscription] OAuth credentials refreshed')
    return updated
  }

  private async fetchUserProfile(accessToken: string): Promise<{ email?: string; name?: string; picture?: string } | null> {
    const res = await this.fetchFn(GOOGLE_USERINFO_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const info = await res.json() as GoogleUserInfo
    return {
      email: typeof info.email === 'string' ? info.email : undefined,
      name: typeof info.name === 'string' ? info.name : undefined,
      picture: typeof info.picture === 'string' ? info.picture : undefined,
    }
  }

  private async fetchCodeAssistInfo(accessToken: string): Promise<CodeAssistLoadResponse | null> {
    const endpoints = [CODE_ASSIST_ENDPOINT_PRIMARY, CODE_ASSIST_ENDPOINT_DAILY]
    for (const base of endpoints) {
      try {
        const res = await this.fetchFn(`${base}:loadCodeAssist`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            'user-agent': 'Antigravity/1.0.0',
          },
          body: JSON.stringify({}),
        })
        if (res.ok) {
          return await res.json() as CodeAssistLoadResponse
        }
      } catch {
        // try next endpoint
      }
    }
    return null
  }

  private async loadAuthenticated(): Promise<StoredOAuthCredentials> {
    const stored = await this.store.load().catch(() => {
      throw new OAuthServiceError('storage-failed', 'Secure credentials could not be read.')
    })
    if (stored === null) {
      throw new OAuthServiceError('not-authenticated', 'No active Google Gemini sign-in exists.')
    }
    return stored
  }

  private statusFromCredentials(credentials: StoredOAuthCredentials | null, available = true): OAuthStatusDto {
    const active = this.activeLogin
    const error = this.lastLoginError
    return {
      authenticated: credentials !== null,
      account: credentials === null ? null : sanitizeAccount(credentials),
      storage: {
        ...this.store.storage,
        available,
      },
      login: {
        active: active !== null,
        loginId: active?.id ?? null,
        expiresAt: active?.expiresAt ?? null,
      },
      ...(error !== undefined ? { error } : {}),
    }
  }

  private completeLogin(loginId: string): void {
    if (this.activeLogin?.id !== loginId) return
    clearTimeout(this.activeLogin.timeout)
    this.activeLogin = null
    void this.store.load().then((creds) => {
      if (creds !== null) {
        this.publish({ type: 'completed', account: sanitizeAccount(creds) })
      }
    })
  }

  private failLogin(loginId: string, error: unknown): void {
    if (this.activeLogin?.id !== loginId) return
    clearTimeout(this.activeLogin.timeout)
    this.activeLogin = null
    const pubErr = publicError(error)
    this.lastLoginError = pubErr
    this.publish({ type: 'failed', error: pubErr })
  }

  private cancelActive(error: OAuthServiceError, eventType: 'cancelled' | 'failed'): void {
    if (this.activeLogin === null) return
    const { id, server, timeout } = this.activeLogin
    clearTimeout(timeout)
    this.activeLogin = null
    server.cancel(error)
    server.dispose()
    const pubErr = publicError(error)
    this.lastLoginError = pubErr
    if (eventType === 'cancelled') this.publish({ type: 'cancelled' })
    else this.publish({ type: 'failed', error: pubErr })
  }

  private publish(event: LoginEventDto): void {
    const loginId = this.activeLogin?.id
    if (loginId !== undefined) this.loginEvents.set(loginId, event)
    if (loginId === undefined) return
    const set = this.listeners.get(loginId)
    if (set !== undefined) {
      for (const listener of set) {
        try {
          listener(event)
        } catch {
          // Keep other listeners intact
        }
      }
    }
  }

  private assertAvailable(): void {
    if (this.disposed) {
      throw new OAuthServiceError('service-error', 'OAuth service is disposed.')
    }
  }
}

export function buildAuthorizationUrl(verifier: string, state: string, redirectUri: string): string {
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`
}

function credentialsFromTokenResponse(tokens: GoogleTokenResponse, now: number): StoredOAuthCredentials {
  if (typeof tokens.access_token !== 'string' || tokens.access_token === '') {
    throw new OAuthServiceError('oauth-failed', 'Google token response omitted access_token.')
  }
  if (typeof tokens.refresh_token !== 'string' || tokens.refresh_token === '') {
    throw new OAuthServiceError('oauth-failed', 'Google token response omitted refresh_token.')
  }
  const expiresInSeconds = typeof tokens.expires_in === 'number' && Number.isFinite(tokens.expires_in)
    ? tokens.expires_in
    : 3600
  const expiresAt = now + expiresInSeconds * 1000
  const idToken = typeof tokens.id_token === 'string' ? tokens.id_token : undefined

  let email: string | undefined
  let name: string | undefined
  let picture: string | undefined

  if (idToken) {
    try {
      const parts = idToken.split('.')
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
        if (typeof payload.email === 'string') email = payload.email
        if (typeof payload.name === 'string') name = payload.name
        if (typeof payload.picture === 'string') picture = payload.picture
      }
    } catch {
      // ignore jwt decode failure
    }
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken,
    expiresAt,
    email,
    name,
    picture,
  }
}

export function sanitizeAccount(credentials: StoredOAuthCredentials): SanitizedAccountDto {
  return {
    email: credentials.email ?? null,
    name: credentials.name ?? null,
    picture: credentials.picture ?? null,
    planType: credentials.planType ?? null,
    projectId: credentials.projectId ?? null,
    tokenExpiresAt: credentials.expiresAt,
  }
}

export function publicError(error: unknown): PublicErrorDto {
  if (error instanceof OAuthServiceError) {
    return { code: error.code, message: error.message }
  }
  return {
    code: 'service-error',
    message: error instanceof Error ? error.message : String(error),
  }
}
