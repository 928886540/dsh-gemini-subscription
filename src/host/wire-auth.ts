import { createHash, randomUUID } from 'node:crypto'
import type { StoredOAuthCredentials } from './token-store.ts'

export function geminiHeaders(credentials: StoredOAuthCredentials, sessionId?: string): Record<string, string> {
  return {
    authorization: `Bearer ${credentials.accessToken}`,
    'content-type': 'application/json',
    'user-agent': 'Antigravity/1.0.0 (DSH-Gemini-Subscription)',
    ...(sessionId ? { 'x-session-id': sessionId } : {}),
  }
}

export function stableSessionId(value: string | undefined): string {
  const source = value === undefined || value === '' ? randomUUID() : value
  return `dsh-${createHash('sha256').update(source).digest('hex').slice(0, 32)}`
}
