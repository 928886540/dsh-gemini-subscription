import { describe, expect, it, vi } from 'vitest'
import {
  GEMINI_MODEL_CATALOG,
  fetchDynamicAntigravityModels,
  listGeminiModels,
  resolveGeminiCatalogEntry,
  resolveGeminiModel,
  setDynamicModelCatalog,
} from '../src/shared/model-catalog.ts'
import { PROVIDER_ID } from '../src/compat.ts'

describe('Gemini Model Catalog', () => {
  it('lists all models with input modalities', () => {
    const models = listGeminiModels()
    expect(models.length).toBeGreaterThanOrEqual(4)
    const pro = models.find((m) => m.id === 'gemini-2.5-pro')
    expect(pro).toBeDefined()
    expect(pro?.provider).toBe(PROVIDER_ID)
    expect(pro?.inputModalities).toContain('text')
    expect(pro?.inputModalities).toContain('image')
  })

  it('resolves model with custom context window overrides', () => {
    const model = resolveGeminiModel('gemini-2.5-pro', { 'gemini-2.5-pro': 2_000_000 } as any)
    expect(model.id).toBe('gemini-2.5-pro')
    expect(model.provider).toBe(PROVIDER_ID)
    expect(model.context?.contextWindow).toBe(2_000_000)
    expect(model.reasoning?.efforts.length).toBeGreaterThan(0)
  })

  it('falls back to default entry for unknown model id', () => {
    const entry = resolveGeminiCatalogEntry('custom-experimental-model')
    expect(entry.id).toBe('custom-experimental-model')
    expect(entry.upstreamModel).toBe('custom-experimental-model')
  })

  it('fetches dynamic models from fetchAvailableModels and filters internal preview models', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: {
          'gemini-2.5-pro': {
            displayName: 'Gemini 2.5 Pro (Custom)',
            maxTokens: 2097152,
            maxOutputTokens: 65536,
          },
          'gemini-3.7-flash': {
            displayName: 'Gemini 3.7 Flash',
            maxTokens: 1048576,
            maxOutputTokens: 65536,
          },
          'chat_20706': {
            displayName: 'Internal Chat',
          },
          'tab_flash_lite_preview': {
            displayName: 'Tab Lite',
          },
        },
      }),
    })

    const dynamicModels = await fetchDynamicAntigravityModels('test-token', 'test-proj', fetchMock as unknown as typeof fetch)
    expect(dynamicModels.length).toBe(2)
    expect(dynamicModels.find(m => m.id === 'chat_20706')).toBeUndefined()
    expect(dynamicModels.find(m => m.id === 'tab_flash_lite_preview')).toBeUndefined()
    expect(dynamicModels.find(m => m.id === 'gemini-2.5-pro')?.name).toBe('Gemini 2.5 Pro (Custom)')

    // Cleanup dynamic catalog cache
    setDynamicModelCatalog(null)
  })
})
