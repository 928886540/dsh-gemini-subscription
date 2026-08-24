import { describe, expect, it } from 'vitest'
import { GeminiSubscriptionAdapter } from '../src/host/adapter.ts'
import { GeminiClient } from '../src/host/gemini-client.ts'
import { OAuthService } from '../src/host/oauth-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'
import { PROVIDER_ID, PROVIDER_NAME } from '../src/compat.ts'

describe('GeminiSubscriptionAdapter', () => {
  it('provides correct provider info and model listing', async () => {
    const store = new MemoryTokenStore()
    const oauth = new OAuthService(store)
    const client = new GeminiClient(oauth)
    const adapter = new GeminiSubscriptionAdapter(client)

    expect(adapter.providerInfo(PROVIDER_ID)).toEqual({ id: PROVIDER_ID, name: PROVIDER_NAME })
    const models = await adapter.listModels()
    expect(models.length).toBeGreaterThanOrEqual(4)
    const resolved = await adapter.resolveModel(PROVIDER_ID, 'gemini-2.5-pro')
    expect(resolved.id).toBe('gemini-2.5-pro')
  })
})
