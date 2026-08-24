import type { LlmModelInfo, LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
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

export const ALLOWED_CONTEXT_WINDOWS = [272_000, 512_000, 1_048_576] as const
export const DEFAULT_CONTEXT_WINDOW = 272_000

export function normalizeContextWindow(val: number): number {
  if (val >= 1_000_000) return 1_048_576
  if (val >= 512_000) return 512_000
  return 272_000
}

/**
 * Official AGY CLI model catalog.
 * IDs are real model tier names; High/Medium/Low/Thinking are baked into the ID.
 */
export const GEMINI_MODEL_CATALOG: readonly GeminiModelCatalogEntry[] = [
  {
    id: 'gemini-3.7-flash-high',
    name: '✨ Gemini 3.7 Flash (High)',
    description: '旗舰深度思考与编码 (High)',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.6-flash-high',
  },
  {
    id: 'gemini-3.7-flash-medium',
    name: 'Gemini 3.7 Flash (Medium)',
    description: '混合推理平衡模型 (Med)',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-3.6-flash-medium',
  },
  {
    id: 'gemini-3.7-flash-low',
    name: 'Gemini 3.7 Flash (Low)',
    description: '极速响应推理模型 (Low)',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 2048,
    upstreamModel: 'gemini-3.6-flash-low',
  },
  {
    id: 'gemini-3.6-flash-high',
    name: 'Gemini 3.6 Flash (High)',
    description: '3.6 高思维强度推理',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.6-flash-high',
  },
  {
    id: 'gemini-3.6-flash-medium',
    name: 'Gemini 3.6 Flash (Medium)',
    description: '3.6 中思维强度',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-3.6-flash-medium',
  },
  {
    id: 'gemini-3.6-flash-low',
    name: 'Gemini 3.6 Flash (Low)',
    description: '3.6 低思维极速',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 2048,
    upstreamModel: 'gemini-3.6-flash-low',
  },
  {
    id: 'gemini-3.5-flash-high',
    name: 'Gemini 3.5 Flash (High)',
    description: '3.5 高思维强度',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.6-flash-high',
  },
  {
    id: 'gemini-3.5-flash-medium',
    name: 'Gemini 3.5 Flash (Medium)',
    description: '3.5 中思维强度',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gemini-3.6-flash-medium',
  },
  {
    id: 'gemini-3.5-flash-low',
    name: 'Gemini 3.5 Flash (Low)',
    description: '3.5 低思维极速',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 2048,
    upstreamModel: 'gemini-3.5-flash-low',
  },
  {
    id: 'gemini-3.1-pro-high',
    name: 'Gemini 3.1 Pro (High)',
    description: '3.1 Pro 旗舰推演',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'gemini-3.1-pro-low',
  },
  {
    id: 'gemini-3.1-pro-low',
    name: 'Gemini 3.1 Pro (Low)',
    description: '3.1 Pro 轻量架构',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 2048,
    upstreamModel: 'gemini-3.1-pro-low',
  },
  {
    id: 'claude-sonnet-4-6',
    name: '🔥 Claude Sonnet 4.6 (Thinking)',
    description: 'Claude 4.6 顶级代码与思考',
    contextWindow: 200_000,
    maxContextWindow: 200_000,
    maxOutputTokens: 64_000,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'claude-sonnet-4-6',
  },
  {
    id: 'claude-opus-4-6-thinking',
    name: '🔥 Claude Opus 4.6 (Thinking)',
    description: 'Claude 4.6 深度推演旗舰',
    contextWindow: 200_000,
    maxContextWindow: 200_000,
    maxOutputTokens: 64_000,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 16384,
    upstreamModel: 'claude-opus-4-6-thinking',
  },
  {
    id: 'gpt-oss-120b-medium',
    name: 'GPT-OSS 120B (Medium)',
    description: '开源 120B 旗舰',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
    upstreamModel: 'gpt-oss-120b-medium',
  },
] as const

export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.7-flash-high'

const PRIORITY_ORDER: readonly string[] = [
  'gemini-3.7-flash-high',
  'gemini-3.7-flash-medium',
  'gemini-3.7-flash-low',
  'claude-sonnet-4-6',
  'claude-opus-4-6-thinking',
  'gemini-3.1-pro-high',
  'gemini-3.1-pro-low',
  'gpt-oss-120b-medium',
  'gemini-3.6-flash-high',
  'gemini-3.6-flash-medium',
  'gemini-3.6-flash-low',
  'gemini-3.5-flash-high',
  'gemini-3.5-flash-medium',
  'gemini-3.5-flash-low',
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

  // 1. Direct exact ID match (Must be first so resolved.id === requested modelId!)
  const exact = catalog.find((entry) => entry.id.toLowerCase() === normalized)
  if (exact !== undefined) return exact

  // 2. Upstream model match
  const upstreamMatch = catalog.find((entry) => entry.upstreamModel.toLowerCase() === normalized)
  if (upstreamMatch !== undefined) return upstreamMatch

  // 2. Friendly alias normalization
  if (normalized.includes('3.7') && normalized.includes('flash')) {
    if (normalized.includes('low')) return resolveGeminiCatalogEntry('gemini-3.7-flash-low')
    if (normalized.includes('medium')) return resolveGeminiCatalogEntry('gemini-3.7-flash-medium')
    return resolveGeminiCatalogEntry('gemini-3.7-flash-high')
  }
  if (normalized.includes('3.6') && normalized.includes('flash')) {
    if (normalized.includes('low')) return resolveGeminiCatalogEntry('gemini-3.6-flash-low')
    if (normalized.includes('medium')) return resolveGeminiCatalogEntry('gemini-3.6-flash-medium')
    return resolveGeminiCatalogEntry('gemini-3.6-flash-high')
  }
  if (normalized.includes('3.5') && normalized.includes('flash')) {
    if (normalized.includes('low')) return resolveGeminiCatalogEntry('gemini-3.5-flash-low')
    if (normalized.includes('medium')) return resolveGeminiCatalogEntry('gemini-3.5-flash-medium')
    return resolveGeminiCatalogEntry('gemini-3.5-flash-high')
  }
  if (normalized.includes('3.1') && normalized.includes('pro')) {
    if (normalized.includes('low')) return resolveGeminiCatalogEntry('gemini-3.1-pro-low')
    return resolveGeminiCatalogEntry('gemini-3.1-pro-high')
  }
  if (normalized.includes('sonnet') || (normalized.includes('claude') && !normalized.includes('opus'))) {
    return resolveGeminiCatalogEntry('claude-sonnet-4-6')
  }
  if (normalized.includes('opus')) {
    return resolveGeminiCatalogEntry('claude-opus-4-6-thinking')
  }
  if (normalized.includes('gpt-oss') || normalized.includes('120b')) {
    return resolveGeminiCatalogEntry('gpt-oss-120b-medium')
  }

  // Fallback dynamic entry
  return {
    id: modelId,
    name: modelId,
    description: `Antigravity model ${modelId}`,
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxContextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    reasoning: true,
    vision: true,
    tools: true,
    defaultThinkingBudget: 8192,
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
  const contextWindow = typeof customWindow === 'number' && customWindow > 0
    ? normalizeContextWindow(customWindow)
    : entry.contextWindow

  return {
    provider: PROVIDER_ID,
    id: entry.id,
    name: entry.name,
    description: entry.description,
    inputModalities: entry.vision ? ['text', 'image'] as const : ['text'] as const,
    context: { contextWindow },
    defaultMaxTokens: entry.maxOutputTokens,
    // High/Low/Medium/Thinking 模型本身已在 ID 中确定档位，不额外暴露 effort 切换
    reasoning: undefined,
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

      const upstreamMap = new Map<string, RawAvailableModelInfo>()
      for (const [rawId, info] of Object.entries(data.models)) {
        const id = rawId.trim()
        if (id && !isIgnoredModel(id)) {
          upstreamMap.set(id, info)
        }
      }

      // Merge on top of static base so we never lose gemini-3.7-*
      const mergedList: GeminiModelCatalogEntry[] = GEMINI_MODEL_CATALOG.map((baseEntry) => {
        const upstreamInfo = upstreamMap.get(baseEntry.upstreamModel) || upstreamMap.get(baseEntry.id)
        if (!upstreamInfo) return { ...baseEntry }

        let quotaInfo: ModelQuotaInfo | undefined
        const rawRemaining = typeof upstreamInfo.quotaInfo?.remainingFraction === 'number'
          ? upstreamInfo.quotaInfo.remainingFraction
          : typeof upstreamInfo.remainingFraction === 'number'
            ? upstreamInfo.remainingFraction
            : undefined

        const rawResetTime = upstreamInfo.quotaInfo?.resetTime || upstreamInfo.resetTime

        if (typeof rawRemaining === 'number' && Number.isFinite(rawRemaining)) {
          quotaInfo = {
            remainingFraction: Math.max(0, Math.min(1, rawRemaining)),
            resetTime: rawResetTime,
          }
        }

        return {
          ...baseEntry,
          quotaInfo: quotaInfo ?? baseEntry.quotaInfo,
        }
      })

      const sortedModels = mergedList.sort(
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
