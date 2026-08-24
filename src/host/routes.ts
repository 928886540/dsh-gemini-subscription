import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { ROUTE_PREFIX } from '../compat.ts'
import type {
  ApiEnvelope,
  LoginEventDto,
  PublicErrorDto,
  SubscriptionPreferencesUpdateDto,
} from '../shared/contracts.ts'
import { OAuthService, publicError } from './oauth-service.ts'
import { PreferenceError, type SubscriptionPreferenceStore } from './preferences.ts'
import { UsageService } from './usage-service.ts'

const MAX_BODY_BYTES = 64 * 1024

export function registerRoutes(
  ctx: Context,
  oauth: OAuthService,
  usage: UsageService,
  preferences: SubscriptionPreferenceStore,
): () => void {
  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? '/', 'http://dsh.local')

    if (request.method === 'GET' && url.pathname === `${ROUTE_PREFIX}/status`) {
      const oauthStatus = await oauth.status()
      const quota = oauthStatus.authenticated ? await usage.getQuota() : { buckets: [], tier: null, tierDisplayName: null, projectId: null, fetchedAt: null }
      json(response, {
        ok: true,
        value: {
          ...oauthStatus,
          quota,
          preferences: preferences.status(),
        },
      })
      return
    }

    if (request.method !== 'POST') {
      jsonError(response, 405, { code: 'bad-request', message: 'Method not allowed.' })
      return
    }

    if (!isSameOriginMutation(request)) {
      jsonError(response, 403, { code: 'csrf-rejected', message: 'Cross-origin request rejected.' })
      return
    }

    const contentType = request.headers['content-type']
    if (typeof contentType !== 'string' || !contentType.toLowerCase().startsWith('application/json')) {
      jsonError(response, 415, { code: 'bad-request', message: 'A JSON request body is required.' })
      return
    }

    const body = await readJson(request)
    if (body === null) {
      jsonError(response, 400, { code: 'bad-request', message: 'Malformed JSON request.' })
      return
    }

    try {
      switch (url.pathname) {
        case `${ROUTE_PREFIX}/login/start`:
          json(response, { ok: true, value: await oauth.startLogin() })
          return
        case `${ROUTE_PREFIX}/login/cancel`: {
          const loginId = field(body, 'loginId')
          if (loginId === null) throw new Error('missing loginId')
          oauth.cancelLogin(loginId)
          json(response, { ok: true, value: { cancelled: true } })
          return
        }
        case `${ROUTE_PREFIX}/logout`:
          await oauth.logout()
          usage.invalidate()
          json(response, { ok: true, value: { authenticated: false } })
          return
        case `${ROUTE_PREFIX}/token/refresh`: {
          const oauthStatus = await oauth.refresh()
          const quota = oauthStatus.authenticated ? await usage.getQuota(true) : { buckets: [], tier: null, tierDisplayName: null, projectId: null, fetchedAt: null }
          json(response, {
            ok: true,
            value: {
              ...oauthStatus,
              quota,
              preferences: preferences.status(),
            },
          })
          return
        }
        case `${ROUTE_PREFIX}/quota/refresh`: {
          const oauthStatus = await oauth.status()
          if (!oauthStatus.authenticated) throw new Error('not authenticated')
          json(response, { ok: true, value: await usage.getQuota(true) })
          return
        }
        case `${ROUTE_PREFIX}/connection/test`:
          json(response, { ok: true, value: await usage.testConnection() })
          return
        case `${ROUTE_PREFIX}/preferences/update`:
          json(response, { ok: true, value: await preferences.update(readPreferencesUpdate(body)) })
          return
        default:
          jsonError(response, 404, { code: 'bad-request', message: 'Route not found.' })
      }
    } catch (error) {
      const mapped = error instanceof PreferenceError
        ? { code: 'bad-request' as const, message: error.message }
        : publicError(error)
      jsonError(response, 400, mapped)
    }
  }

  const events = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? '/', 'http://dsh.local')
    const loginId = url.searchParams.get('loginId')
    if (!loginId) {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ ok: false, error: { code: 'bad-request', message: 'Missing loginId parameter.' } }))
      return
    }

    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-content-type-options': 'nosniff',
    })
    response.write('retry: 1000\n\n')

    let terminal = false
    let heartbeat: NodeJS.Timeout | undefined
    let unsubscribe: (() => void) | null = null

    const cleanup = (): void => {
      if (heartbeat !== undefined) clearInterval(heartbeat)
      unsubscribe?.()
      unsubscribe = null
    }

    const send = (event: LoginEventDto): void => {
      response.write(`data: ${JSON.stringify(event)}\n\n`)
      response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
      if (event.type !== 'started') {
        terminal = true
        queueMicrotask(() => {
          cleanup()
          response.end()
        })
      }
    }

    unsubscribe = oauth.subscribe(loginId, send)
    if (unsubscribe === null) {
      response.end('event: failed\ndata: {"type":"failed","error":{"code":"bad-request","message":"Unknown loginId."}}\n\n')
      return
    }

    if (terminal) {
      unsubscribe()
      response.end()
      return
    }

    heartbeat = setInterval(() => response.write(': ping\n\n'), 15_000)
    request.once('close', cleanup)
  }

  const disposers = [
    ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }),
    ctx.webServer.register({ kind: 'exact', path: `${ROUTE_PREFIX}/events`, handler: events }),
  ]

  return () => {
    for (const dispose of disposers) dispose()
  }
}

function json<T>(response: ServerResponse, envelope: ApiEnvelope<T>): void {
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(envelope))
}

function jsonError(response: ServerResponse, status: number, error: PublicErrorDto): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify({ ok: false, error }))
}

function isSameOriginMutation(request: IncomingMessage): boolean {
  const secFetchSite = request.headers['sec-fetch-site']
  if (typeof secFetchSite === 'string') {
    return secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none'
  }
  const origin = request.headers.origin
  const host = request.headers.host
  if (!origin || !host) return true
  try {
    const originUrl = new URL(origin)
    return originUrl.host === host
  } catch {
    return false
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buf.length
    if (bytes > MAX_BODY_BYTES) return null
    chunks.push(buf)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function field(body: Record<string, unknown>, key: string): string | null {
  const val = body[key]
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null
}

function readPreferencesUpdate(body: Record<string, unknown>): SubscriptionPreferencesUpdateDto {
  const update: SubscriptionPreferencesUpdateDto = {}
  if (typeof body.quickQuotaVisible === 'boolean') update.quickQuotaVisible = body.quickQuotaVisible
  if (typeof body.searchProvider === 'string' || body.searchProvider === undefined) update.searchProvider = body.searchProvider
  if (typeof body.subagentEnabled === 'boolean') update.subagentEnabled = body.subagentEnabled
  if (typeof body.subagentProvider === 'string') update.subagentProvider = body.subagentProvider
  if (typeof body.subagentModel === 'string') update.subagentModel = body.subagentModel
  if (typeof body.subagentReasoningEffort === 'string' || body.subagentReasoningEffort === null) {
    update.subagentReasoningEffort = body.subagentReasoningEffort
  }
  if (typeof body.subagentContextWindow === 'number') update.subagentContextWindow = body.subagentContextWindow
  if (typeof body.subagentMaxDepth === 'number') update.subagentMaxDepth = body.subagentMaxDepth
  if (typeof body.subagentMaxAgents === 'number') update.subagentMaxAgents = body.subagentMaxAgents
  if (typeof body.defaultThinkingBudget === 'number') update.defaultThinkingBudget = body.defaultThinkingBudget
  if (typeof body.contextWindowOverrides === 'object' && body.contextWindowOverrides !== null) {
    update.contextWindowOverrides = body.contextWindowOverrides as SubscriptionPreferencesUpdateDto['contextWindowOverrides']
  }
  return update
}
