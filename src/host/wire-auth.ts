import { createHash, randomUUID } from 'node:crypto'
import type { StoredOAuthCredentials } from './token-store.ts'

import { ANTIGRAVITY_USER_AGENT } from '../compat.ts'

export function geminiHeaders(credentials: StoredOAuthCredentials, sessionId?: string): Record<string, string> {
  return {
    authorization: `Bearer ${credentials.accessToken}`,
    'content-type': 'application/json',
    'user-agent': ANTIGRAVITY_USER_AGENT,
    'x-goog-api-client': 'gl-node/22.21.1',
    ...(sessionId ? { 'x-session-id': sessionId } : {}),
  }
}

export function stableSessionId(value: string | undefined): string {
  const source = value === undefined || value === '' ? randomUUID() : value
  return `dsh-${createHash('sha256').update(source).digest('hex').slice(0, 32)}`
}
