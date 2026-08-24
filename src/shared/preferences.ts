import type {
  GeminiContextWindowOverridesDto,
  SubscriptionPreferencesDto,
  SubscriptionPreferencesUpdateDto,
} from './contracts.ts'
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_GEMINI_MODEL_ID,
  normalizeContextWindow,
} from './model-catalog.ts'
import { PROVIDER_ID } from '../compat.ts'

export const DEFAULT_CONTEXT_WINDOW_OVERRIDES: GeminiContextWindowOverridesDto = {
  'gemini-3.7-flash-high': DEFAULT_CONTEXT_WINDOW,
  'gemini-3.7-flash-medium': DEFAULT_CONTEXT_WINDOW,
  'gemini-3.7-flash-low': DEFAULT_CONTEXT_WINDOW,
  'gemini-3.6-flash-high': DEFAULT_CONTEXT_WINDOW,
  'gemini-3.1-pro-high': DEFAULT_CONTEXT_WINDOW,
  'gpt-oss-120b-medium': DEFAULT_CONTEXT_WINDOW,
}

export const DEFAULT_SUBSCRIPTION_PREFERENCES: SubscriptionPreferencesDto = {
  quickQuotaVisible: true,
  searchProvider: undefined,
  subagentEnabled: true,
  subagentProvider: PROVIDER_ID,
  subagentModel: DEFAULT_GEMINI_MODEL_ID,
  subagentReasoningEffort: null,
  subagentContextWindow: DEFAULT_CONTEXT_WINDOW,
  subagentMaxDepth: 4,
  subagentMaxAgents: 8,
  contextWindowOverrides: DEFAULT_CONTEXT_WINDOW_OVERRIDES,
  defaultThinkingBudget: 16384,
  writable: true,
}

export function mergePreferences(
  current: SubscriptionPreferencesDto,
  update: SubscriptionPreferencesUpdateDto,
): SubscriptionPreferencesDto {
  const normalizedOverrides: GeminiContextWindowOverridesDto = {
    ...current.contextWindowOverrides,
  }

  if (update.contextWindowOverrides) {
    for (const [key, val] of Object.entries(update.contextWindowOverrides)) {
      if (typeof val === 'number' && val > 0) {
        normalizedOverrides[key as keyof GeminiContextWindowOverridesDto] = normalizeContextWindow(val)
      }
    }
  }

  return {
    ...current,
    quickQuotaVisible: update.quickQuotaVisible ?? current.quickQuotaVisible,
    searchProvider: update.searchProvider !== undefined ? update.searchProvider : current.searchProvider,
    subagentEnabled: update.subagentEnabled ?? current.subagentEnabled,
    subagentProvider: update.subagentProvider ?? current.subagentProvider,
    subagentModel: update.subagentModel ?? current.subagentModel,
    subagentReasoningEffort: update.subagentReasoningEffort !== undefined
      ? update.subagentReasoningEffort
      : current.subagentReasoningEffort,
    subagentContextWindow: update.subagentContextWindow !== undefined
      ? normalizeContextWindow(update.subagentContextWindow)
      : current.subagentContextWindow,
    subagentMaxDepth: update.subagentMaxDepth ?? current.subagentMaxDepth,
    subagentMaxAgents: update.subagentMaxAgents ?? current.subagentMaxAgents,
    defaultThinkingBudget: update.defaultThinkingBudget ?? current.defaultThinkingBudget,
    contextWindowOverrides: normalizedOverrides,
  }
}
