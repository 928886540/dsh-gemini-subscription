import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CONTEXT_WINDOW,
  GEMINI_MODEL_CATALOG,
  fetchDynamicAntigravityModels,
  listGeminiModels,
  normalizeContextWindow,
  resolveGeminiCatalogEntry,
  resolveGeminiModel,
  setDynamicModelCatalog,
} from '../src/shared/model-catalog.ts'
import { PROVIDER_ID } from '../src/compat.ts'

describe('Gemini Model Catalog', () => {
  it('lists all models with input modalities', () => {
    const models = listGeminiModels()
    expect(models.length).toBeGreaterThanOrEqual(14)
    const flash37 = models.find((m) => m.id === 'gemini-3.7-flash-high')
    expect(flash37).toBeDefined()
    expect(flash37?.provider).toBe(PROVIDER_ID)
    expect(flash37?.inputModalities).toContain('text')
    expect(flash37?.inputModalities).toContain('image')
  })

  it('maps gemini-3.7-flash-high and gemini-3.1-pro-high to official agy.exe upstream models', () => {
    const entry37High = resolveGeminiCatalogEntry('gemini-3.7-flash-high')
    expect(entry37High.upstreamModel).toBe('gemini-3.6-flash-high')
    expect(entry37High.contextWindow).toBe(DEFAULT_CONTEXT_WINDOW)

    const entry31High = resolveGeminiCatalogEntry('gemini-3.1-pro-high')
    expect(entry31High.upstreamModel).toBe('gemini-3.1-pro-low')
  })

  it('resolves exact model ID for all catalog models without colliding with upstream mapping', () => {
    for (const entry of GEMINI_MODEL_CATALOG) {
      const resolved = resolveGeminiModel(entry.id)
      expect(resolved.id).toBe(entry.id)
    }
    expect(resolveGeminiModel('gemini-3.1-pro-low').id).toBe('gemini-3.1-pro-low')
    expect(resolveGeminiModel('gemini-3.1-pro-high').id).toBe('gemini-3.1-pro-high')
    expect(resolveGeminiModel('gemini-3.6-flash-high').id).toBe('gemini-3.6-flash-high')
    expect(resolveGeminiModel('gemini-3.7-flash-high').id).toBe('gemini-3.7-flash-high')
  })

  it('resolves model without reasoning efforts dropdown (baked in model ID)', () => {
    const model = resolveGeminiModel('gemini-3.7-flash-high')
    expect(model.id).toBe('gemini-3.7-flash-high')
    expect(model.provider).toBe(PROVIDER_ID)
    expect(model.context?.contextWindow).toBe(DEFAULT_CONTEXT_WINDOW)
    expect(model.reasoning).toBeUndefined()
  })

  it('clamps context window override (clamps 2M down to 1M)', () => {
    expect(normalizeContextWindow(2_000_000)).toBe(1_048_576)
    expect(normalizeContextWindow(512_000)).toBe(512_000)
    expect(normalizeContextWindow(272_000)).toBe(272_000)

    const model = resolveGeminiModel('gemini-3.7-flash-high', { 'gemini-3.7-flash-high': 2_000_000 } as any)
    expect(model.context?.contextWindow).toBe(1_048_576)
  })

  it('falls back to default entry for unknown model id', () => {
    const entry = resolveGeminiCatalogEntry('custom-experimental-model')
    expect(entry.id).toBe('custom-experimental-model')
    expect(entry.upstreamModel).toBe('custom-experimental-model')
    expect(entry.contextWindow).toBe(DEFAULT_CONTEXT_WINDOW)
  })

  it('merges dynamic models without replacing or dropping static 3.7 models', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: {
          'gemini-3.7-flash-high': {
            displayName: 'Gemini 3.7 Flash High (Upstream)',
            quotaInfo: {
              remainingFraction: 0.78,
              resetTime: '2026-08-27T16:52:00Z',
            },
          },
          'chat_20706': {
            displayName: 'Internal Chat',
          },
        },
      }),
    })

    const dynamicModels = await fetchDynamicAntigravityModels('test-token', 'test-proj', fetchMock as unknown as typeof fetch)
    expect(dynamicModels.length).toBe(GEMINI_MODEL_CATALOG.length)
    expect(dynamicModels.find(m => m.id === 'chat_20706')).toBeUndefined()
    
    const high37 = dynamicModels.find(m => m.id === 'gemini-3.7-flash-high')
    expect(high37).toBeDefined()
    expect(high37?.quotaInfo?.remainingFraction).toBe(0.78)

    // Cleanup dynamic catalog cache
    setDynamicModelCatalog(null)
  })
})

