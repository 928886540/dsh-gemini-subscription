import type {
  GeminiContextWindowOverridesDto,
  SubscriptionPreferencesDto,
  SubscriptionPreferencesUpdateDto,
} from './contracts.ts'
import { DEFAULT_GEMINI_MODEL_ID } from './model-catalog.ts'
import { PROVIDER_ID } from '../compat.ts'

export const DEFAULT_CONTEXT_WINDOW_OVERRIDES: GeminiContextWindowOverridesDto = {
  'gemini-2.5-pro': 1_048_576,
  'gemini-2.5-flash': 1_048_576,
  'gemini-2.5-flash-lite': 1_048_576,
  'gemini-3.7-flash': 1_048_576,
  'gemini-3.7-flash-thinking': 1_048_576,
  'gemini-3.1-pro': 1_048_576,
}

export const DEFAULT_SUBSCRIPTION_PREFERENCES: SubscriptionPreferencesDto = {
  quickQuotaVisible: true,
  searchProvider: undefined,
  subagentEnabled: true,
  subagentProvider: PROVIDER_ID,
  subagentModel: DEFAULT_GEMINI_MODEL_ID,
  subagentReasoningEffort: 'medium',
  subagentContextWindow: 1_048_576,
  subagentMaxDepth: 4,
  subagentMaxAgents: 8,
  contextWindowOverrides: DEFAULT_CONTEXT_WINDOW_OVERRIDES,
  defaultThinkingBudget: 8192,
  writable: true,
}

export function mergePreferences(
  current: SubscriptionPreferencesDto,
  update: SubscriptionPreferencesUpdateDto,
): SubscriptionPreferencesDto {
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
    subagentContextWindow: update.subagentContextWindow ?? current.subagentContextWindow,
    subagentMaxDepth: update.subagentMaxDepth ?? current.subagentMaxDepth,
    subagentMaxAgents: update.subagentMaxAgents ?? current.subagentMaxAgents,
    defaultThinkingBudget: update.defaultThinkingBudget ?? current.defaultThinkingBudget,
    contextWindowOverrides: {
      ...current.contextWindowOverrides,
      ...update.contextWindowOverrides,
    },
  }
}
