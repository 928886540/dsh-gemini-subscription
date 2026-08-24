import { ReasoningEffortId, type LlmModelInfo, type LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import { PROVIDER_ID } from '../compat.ts'
import type { GeminiContextWindowOverridesDto } from './contracts.ts'

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

export function listGeminiModels(): readonly LlmModelInfo[] {
  return GEMINI_MODEL_CATALOG.map((entry) => ({
    provider: PROVIDER_ID,
    id: entry.id,
    name: entry.name,
    description: entry.description,
    inputModalities: entry.vision ? ['text', 'image'] as const : ['text'] as const,
  }))
}

export function resolveGeminiCatalogEntry(modelId: string): GeminiModelCatalogEntry {
  const matched = GEMINI_MODEL_CATALOG.find((entry) => entry.id === modelId || entry.upstreamModel === modelId)
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
        { id: ReasoningEffortId('low'), name: 'Low' },
        { id: ReasoningEffortId('medium'), name: 'Medium' },
        { id: ReasoningEffortId('high'), name: 'High' },
      ],
      defaultEffort: ReasoningEffortId('medium'),
    } : undefined,
  }
}
