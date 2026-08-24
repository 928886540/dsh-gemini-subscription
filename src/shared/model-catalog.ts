import type { LlmModelInfo, LlmResolvedModelInfo, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import {
  ANTIGRAVITY_ENDPOINTS,
  ANTIGRAVITY_USER_AGENT,
  PROVIDER_ID,
} from '../compat.ts'
import type { GeminiContextWindowOverridesDto } from './contracts.ts'

export interface ModelQuotaInfo {
  remainingFraction: number
  resetTime?: string
}

export interface GeminiModelCatalogEntry {
  id: string
  name: string
  description: string
  contextWindow: number
  maxContextWindow: number
  maxOutputTokens: number
  reasoning: boolean
  vision: boolean
  tools: boolean
  defaultThinkingBudget?: number
  upstreamModel: string
  quotaInfo?: ModelQuotaInfo
}

export const GEMINI_MODEL_CATALOG: readonly GeminiModelCatalogEntry[] = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning, coding, and complex multimodal tasks (up to 2M context).',
    contextWindow: 1_048_576,
    maxContextWindow: 2_097_152,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-2.5-pro',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Ultra-fast, lightweight multimodal model with high throughput and low latency.',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 2048,
    upstreamModel: 'gemini-2.5-flash',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Extremely fast and cost-effective model optimized for high-volume quick tasks.',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 1024,
    upstreamModel: 'gemini-2.5-flash-lite',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    description: 'Next-gen hybrid reasoning model balancing speed and depth.',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 4096,
    upstreamModel: 'gemini-3.7-flash',
  },
  {
    id: 'gemini-3.7-flash-thinking',
    name: 'Gemini 3.7 Flash (Thinking)',
    description: 'Gemini 3.7 Flash configured for deep, extended reasoning steps.',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.7-flash-high',
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro (Preview)',
    description: 'Preview edition of Gemini 3.1 Pro architecture.',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-3.1-pro',
  },
] as const

export const DEFAULT_GEMINI_MODEL_ID = 'gemini-2.5-pro'

let dynamicModelCatalog: GeminiModelCatalogEntry[] | null = null

export function setDynamicModelCatalog(models: GeminiModelCatalogEntry[] | null): void {
  dynamicModelCatalog = models
}

export function getEffectiveModelCatalog(): readonly GeminiModelCatalogEntry[] {
  return dynamicModelCatalog && dynamicModelCatalog.length > 0
    ? dynamicModelCatalog
    : GEMINI_MODEL_CATALOG
}

export function listGeminiModels(): readonly LlmModelInfo[] {
  const catalog = getEffectiveModelCatalog()
  return catalog.map((entry) => ({
    provider: PROVIDER_ID,
    id: entry.id,
    name: entry.name,
    description: entry.description,
    inputModalities: entry.vision ? ['text', 'image'] as const : ['text'] as const,
  }))
}

export function resolveGeminiCatalogEntry(modelId: string): GeminiModelCatalogEntry {
  const catalog = getEffectiveModelCatalog()
  const matched = catalog.find((entry) => entry.id === modelId || entry.upstreamModel === modelId)
  if (matched !== undefined) return matched

  // Fallback dynamic entry for unlisted Gemini model identifiers
  return {
    id: modelId,
    name: modelId,
    description: `Gemini model ${modelId}`,
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 4096,
    upstreamModel: modelId,
  }
}

export function resolveGeminiModel(
  modelId: string,
  overrides?: Partial<GeminiContextWindowOverridesDto>,
): LlmResolvedModelInfo {
  const entry = resolveGeminiCatalogEntry(modelId)
  const overrideKey = entry.id as keyof GeminiContextWindowOverridesDto
  const customWindow = overrides?.[overrideKey]
  const contextWindow = typeof customWindow === 'number' && customWindow > 0 ? customWindow : entry.contextWindow

  return {
    provider: PROVIDER_ID,
    id: entry.id,
    name: entry.name,
    description: entry.description,
    inputModalities: entry.vision ? ['text', 'image'] as const : ['text'] as const,
    context: { contextWindow },
    defaultMaxTokens: entry.maxOutputTokens,
    reasoning: entry.reasoning ? {
      efforts: [
        { id: 'low' as ReasoningEffortId, name: 'Low' },
        { id: 'medium' as ReasoningEffortId, name: 'Medium' },
        { id: 'high' as ReasoningEffortId, name: 'High' },
      ],
      defaultEffort: 'medium' as ReasoningEffortId,
    } : undefined,
  }
}

export interface RawAvailableModelInfo {
  displayName?: string
  maxTokens?: number
  maxOutputTokens?: number
  remainingFraction?: number
  resetTime?: string
  quotaInfo?: {
    remainingFraction?: number
    resetTime?: string
  }
}

export async function fetchDynamicAntigravityModels(
  accessToken: string,
  projectId?: string,
  fetchFn: typeof fetch = fetch,
): Promise<GeminiModelCatalogEntry[]> {
  const payload = projectId ? { project: projectId } : {}

  for (const base of ANTIGRAVITY_ENDPOINTS) {
    try {
      const res = await fetchFn(`${base}/v1internal:fetchAvailableModels`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
          'user-agent': ANTIGRAVITY_USER_AGENT,
          'x-goog-api-client': 'gl-node/22.21.1',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) continue
      const data = await res.json() as { models?: Record<string, RawAvailableModelInfo> }
      if (!data || typeof data.models !== 'object') continue

      const models: GeminiModelCatalogEntry[] = []
      for (const [rawId, info] of Object.entries(data.models)) {
        const id = rawId.trim()
        if (!id) continue
        // Filter out internal and preview tab completion models (matches CPA)
        if (['chat_20706', 'chat_23310', 'tab_flash_lite_preview', 'tab_jump_flash_lite_preview'].includes(id)) {
          continue
        }

        const known = GEMINI_MODEL_CATALOG.find(k => k.id === id || k.upstreamModel === id)
        const displayName = info.displayName || known?.name || id
        const maxContext = info.maxTokens || known?.maxContextWindow || 1_048_576
        const maxOut = info.maxOutputTokens || known?.maxOutputTokens || 65_536

        // Extract remainingFraction and resetTime from quotaInfo or direct properties
        let quotaInfo: ModelQuotaInfo | undefined
        const rawRemaining = typeof info.quotaInfo?.remainingFraction === 'number'
          ? info.quotaInfo.remainingFraction
          : typeof info.remainingFraction === 'number'
            ? info.remainingFraction
            : undefined

        const rawResetTime = info.quotaInfo?.resetTime || info.resetTime

        if (typeof rawRemaining === 'number' && Number.isFinite(rawRemaining)) {
          quotaInfo = {
            remainingFraction: Math.max(0, Math.min(1, rawRemaining)),
            resetTime: rawResetTime,
          }
        }

        models.push({
          id,
          name: displayName,
          description: known?.description || `${displayName} from Google Antigravity`,
          contextWindow: known?.contextWindow || Math.min(maxContext, 1_048_576),
          maxContextWindow: maxContext,
          maxOutputTokens: maxOut,
          reasoning: known ? known.reasoning : true,
          vision: known ? known.vision : true,
          tools: known ? known.tools : true,
          defaultThinkingBudget: known?.defaultThinkingBudget ?? 4096,
          upstreamModel: id,
          quotaInfo,
        })
      }

      if (models.length > 0) {
        setDynamicModelCatalog(models)
        return models
      }
    } catch {
      // try next endpoint
    }
  }

  return [...GEMINI_MODEL_CATALOG]
}
