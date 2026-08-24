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

/**
 * Prioritized, curated model catalog for Antigravity (AGY) subscription.
 * Ordered strictly by developer priority:
 * 1. Gemini 3.7 Flash (High / Thinking)
 * 2. Gemini 3.7 Flash
 * 3. Claude Sonnet 3.7 / 4.6 (Thinking)
 * 4. Claude Opus 4.6 (Thinking)
 * 5. Gemini 3.1 Pro (High)
 * 6. Gemini 3.1 Pro
 * 7. Gemini 2.5 Pro
 * 8. Gemini 2.5 Flash
 * 9. Gemini 2.5 Flash-Lite
 * 10. Gemini 3.1 Flash Lite
 * 11. Gemini 3.6 Flash (High)
 */
export const GEMINI_MODEL_CATALOG: readonly GeminiModelCatalogEntry[] = [
  {
    id: 'gemini-3.7-flash-high',
    name: 'Gemini 3.7 Flash (High / Thinking)',
    description: 'Google 最强深度思考与编码旗舰模型 (1M 上下文，支持超长思维链与高强度推演)',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.6-flash-high',
  },
  {
    id: 'gemini-3.7-flash-thinking',
    name: 'Gemini 3.7 Flash (Thinking)',
    description: 'Gemini 3.7 Flash 深度思考扩展版',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.6-flash-high',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    description: '新一代混合推理旗舰，兼顾极速响应与高智力 (1M 上下文)',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 4096,
    upstreamModel: 'gemini-3.6-flash-high',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 3.7 / 4.6 (Thinking)',
    description: 'Antigravity 专属 Claude Sonnet，具备深度思考与顶级代码能力',
    contextWindow: 200_000,
    maxContextWindow: 200_000,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'claude-sonnet-4-6',
  },
  {
    id: 'claude-opus-4-6-thinking',
    name: 'Claude Opus 4.6 (Thinking)',
    description: 'Antigravity 专属 Claude Opus 深度思考模型',
    contextWindow: 200_000,
    maxContextWindow: 200_000,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'claude-opus-4-6-thinking',
  },
  {
    id: 'gemini-3.1-pro-high',
    name: 'Gemini 3.1 Pro (High)',
    description: 'Gemini 3.1 架构旗舰版，百万上下文与深度推演',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-3.1-pro-low',
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    description: 'Gemini 3.1 Pro 旗舰版 (百万上下文)',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-3.1-pro-low',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: '200万超大上下文旗舰，擅长全代码库分析与复杂多模态',
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
    description: '百万上下文极速多模态模型，高并发低延迟',
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
    description: '极速轻量模型，适用于高频快速问答与辅助任务',
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
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Gemini 3.1 架构极速轻量模型',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 1024,
    upstreamModel: 'gemini-3.1-flash-lite',
  },
  {
    id: 'gemini-3.6-flash-high',
    name: 'Gemini 3.6 Flash (High)',
    description: 'Gemini 3.6 高思维强度推理模型',
    contextWindow: 1_048_576,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 4096,
    upstreamModel: 'gemini-3.6-flash-high',
  },
] as const

export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.7-flash-high'

const PRIORITY_ORDER: readonly string[] = [
  'gemini-3.7-flash-high',
  'gemini-3.7-flash-thinking',
  'gemini-3.7-flash',
  'claude-sonnet-4-6',
  'claude-3-7-sonnet',
  'claude-opus-4-6-thinking',
  'gemini-3.1-pro-high',
  'gemini-3.1-pro',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash-high',
]

function getPriorityIndex(id: string): number {
  const idx = PRIORITY_ORDER.indexOf(id)
  return idx !== -1 ? idx : 999
}

function isIgnoredModel(id: string): boolean {
  if (['chat_20706', 'chat_23310', 'tab_flash_lite_preview', 'tab_jump_flash_lite_preview'].includes(id)) return true
  if (id.startsWith('chat_') || id.startsWith('tab_')) return true
  if (id.endsWith('-tiered') || id.endsWith('-extra-low') || id.endsWith('-agent')) return true
  return false
}

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
  const normalized = modelId.trim().toLowerCase()

  // 1. Direct or upstream match
  const matched = catalog.find((entry) =>
    entry.id.toLowerCase() === normalized ||
    entry.upstreamModel.toLowerCase() === normalized
  )
  if (matched !== undefined) return matched

  // 2. Friendly alias normalization
  if (normalized === '3.7-flash-high' || normalized === 'gemini-3.7-flash-high' || normalized === '3.7-flash-thinking') {
    return resolveGeminiCatalogEntry('gemini-3.7-flash-high')
  }
  if (normalized === '3.7-flash' || normalized === 'gemini-3.7-flash') {
    return resolveGeminiCatalogEntry('gemini-3.7-flash')
  }
  if (normalized === 'claude-3-7-sonnet' || normalized === 'claude-3.7-sonnet' || normalized === 'claude-sonnet') {
    return resolveGeminiCatalogEntry('claude-sonnet-4-6')
  }
  if (normalized === 'claude-opus' || normalized === 'claude-opus-4-6') {
    return resolveGeminiCatalogEntry('claude-opus-4-6-thinking')
  }
  if (normalized === '3.1-pro' || normalized === 'gemini-3.1-pro') {
    return resolveGeminiCatalogEntry('gemini-3.1-pro-high')
  }

  // Fallback dynamic entry
  return {
    id: modelId,
    name: modelId,
    description: `Antigravity model ${modelId}`,
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
        if (!id || isIgnoredModel(id)) continue

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

        const known = GEMINI_MODEL_CATALOG.find(k => k.id === id || k.upstreamModel === id)
        const displayName = info.displayName || known?.name || id
        const maxContext = info.maxTokens || known?.maxContextWindow || 1_048_576
        const maxOut = info.maxOutputTokens || known?.maxOutputTokens || 65_536

        models.push({
          id,
          name: displayName,
          description: known?.description || `${displayName} from Google Antigravity`,
          contextWindow: known?.contextWindow || Math.min(maxContext, 1_048_576),
          maxContextWindow: maxContext,
          maxOutputTokens: maxOut,
          reasoning: true,
          vision: true,
          tools: true,
          defaultThinkingBudget: known?.defaultThinkingBudget ?? 4096,
          upstreamModel: id,
          quotaInfo,
        })
      }

      const sortedModels = models.sort(
        (a, b) => getPriorityIndex(a.id) - getPriorityIndex(b.id)
      )

      if (sortedModels.length > 0) {
        setDynamicModelCatalog(sortedModels)
        return sortedModels
      }
    } catch {
      // try next endpoint
    }
  }

  return [...GEMINI_MODEL_CATALOG]
}
