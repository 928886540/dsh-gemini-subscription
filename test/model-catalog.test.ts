import { describe, expect, it } from 'vitest'
import {
  GEMINI_MODEL_CATALOG,
  listGeminiModels,
  resolveGeminiCatalogEntry,
  resolveGeminiModel,
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
    const model = resolveGeminiModel('gemini-2.5-pro', { 'gemini-2.5-pro': 2_000_000 })
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
})
