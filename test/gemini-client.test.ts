import { describe, expect, it, vi } from 'vitest'
import { GeminiClient } from '../src/host/gemini-client.ts'
import { OAuthService } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { PROVIDER_ID } from '../src/compat.ts'

describe('Gemini Client', () => {
  it('streams responses and retries once on 401', async () => {
    const store = new MemoryTokenStore()
    await store.save({
      accessToken: 'stale-token',
      refreshToken: 'good-refresh',
      expiresAt: Date.now() + 100000,
      projectId: 'proj-1',
    })

    let callCount = 0
    const sseResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"response": {"candidates": [{"content": {"parts": [{"text": "Hello!"}]}}]}}\n\n'))
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('oauth2.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            access_token: 'fresh-token',
            refresh_token: 'good-refresh',
            expires_in: 3600,
          }),
        })
      }
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        body: sseResponse,
      })
    })

    const oauth = new OAuthService(store, { fetchFn: fetchMock as unknown as typeof fetch })
    const client = new GeminiClient(oauth, undefined, { fetchFn: fetchMock as unknown as typeof fetch })

    const userMsg = createUserMessage({
      content: [{ type: 'text', text: 'Hi' }],
      source: { kind: 'user' },
    })

    const chunks = []
    for await (const chunk of client.stream({
      provider: PROVIDER_ID,
      model: 'gemini-2.5-flash',
      messages: [userMsg],
    })) {
      chunks.push(chunk)
    }

    expect(chunks.some((c) => c.type === 'text-delta' && c.text === 'Hello!')).toBe(true)
    expect(fetchMock).toHaveBeenCalled()
  })
})
