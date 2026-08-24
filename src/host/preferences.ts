import { settingsNamespace, type SettingsProvider, type SettingsScope } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { NS, PROVIDER_ID } from '../compat.ts'
import { DEFAULT_GEMINI_MODEL_ID } from '../shared/model-catalog.ts'
import {
  DEFAULT_CONTEXT_WINDOW_OVERRIDES,
  DEFAULT_SUBSCRIPTION_PREFERENCES,
} from '../shared/preferences.ts'
import type {
  SubscriptionPreferencesDto,
  SubscriptionPreferencesUpdateDto,
} from '../shared/contracts.ts'

export interface SubscriptionPreferenceStore {
  status(): SubscriptionPreferencesDto
  update(patch: SubscriptionPreferencesUpdateDto): Promise<SubscriptionPreferencesDto>
  watch(callback: (next: SubscriptionPreferencesDto, prev: SubscriptionPreferencesDto) => void | Promise<void>): () => void
}

type PreferenceSettings = Omit<SubscriptionPreferencesDto, 'writable'>

export function registerPreferenceStore(settings: SettingsProvider): SubscriptionPreferenceStore {
  const scope = settings.register(settingsNamespace(NS), z.object({
    quickQuotaVisible: z.boolean().default(DEFAULT_SUBSCRIPTION_PREFERENCES.quickQuotaVisible),
    searchProvider: z.union([z.string(), z.const(undefined)]).default(DEFAULT_SUBSCRIPTION_PREFERENCES.searchProvider),
    subagentEnabled: z.boolean().default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentEnabled),
    subagentProvider: z.string().default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentProvider),
    subagentModel: z.string().default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentModel),
    subagentReasoningEffort: z.union([z.string(), z.const(null)]).default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentReasoningEffort),
    subagentContextWindow: z.number().step(1).min(1).default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentContextWindow),
    subagentMaxDepth: z.number().step(1).min(1).default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentMaxDepth),
    subagentMaxAgents: z.number().step(1).min(1).default(DEFAULT_SUBSCRIPTION_PREFERENCES.subagentMaxAgents),
    defaultThinkingBudget: z.number().step(1).min(0).default(DEFAULT_SUBSCRIPTION_PREFERENCES.defaultThinkingBudget),
    contextWindowOverrides: z.object({
      'gemini-2.5-pro': z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES['gemini-2.5-pro']),
      'gemini-2.5-flash': z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES['gemini-2.5-flash']),
      'gemini-2.5-flash-lite': z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES['gemini-2.5-flash-lite']),
      'gemini-3.7-flash': z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES['gemini-3.7-flash']),
      'gemini-3.7-flash-thinking': z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES['gemini-3.7-flash-thinking']),
      'gemini-3.1-pro': z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES['gemini-3.1-pro']),
    }).default(DEFAULT_CONTEXT_WINDOW_OVERRIDES),
  }))
  return new SettingsPreferenceStore(scope)
}

class SettingsPreferenceStore implements SubscriptionPreferenceStore {
  constructor(private readonly scope: SettingsScope<PreferenceSettings>) {}

  status(): SubscriptionPreferencesDto {
    return withWritable(this.scope.get())
  }

  async update(patch: SubscriptionPreferencesUpdateDto): Promise<SubscriptionPreferencesDto> {
    const current = this.scope.get()
    const normalized: SubscriptionPreferencesUpdateDto = {}
    if (patch.quickQuotaVisible !== undefined) normalized.quickQuotaVisible = patch.quickQuotaVisible
    if (patch.searchProvider !== undefined) normalized.searchProvider = patch.searchProvider
    if (patch.subagentEnabled !== undefined) normalized.subagentEnabled = patch.subagentEnabled
    if (patch.subagentProvider !== undefined) normalized.subagentProvider = patch.subagentProvider
    if (patch.subagentModel !== undefined) normalized.subagentModel = patch.subagentModel
    if (patch.subagentReasoningEffort !== undefined) normalized.subagentReasoningEffort = patch.subagentReasoningEffort
    if (patch.subagentContextWindow !== undefined) normalized.subagentContextWindow = patch.subagentContextWindow
    if (patch.subagentMaxDepth !== undefined) normalized.subagentMaxDepth = patch.subagentMaxDepth
    if (patch.subagentMaxAgents !== undefined) normalized.subagentMaxAgents = patch.subagentMaxAgents
    if (patch.defaultThinkingBudget !== undefined) normalized.defaultThinkingBudget = patch.defaultThinkingBudget
    if (patch.contextWindowOverrides !== undefined) {
      normalized.contextWindowOverrides = {
        ...current.contextWindowOverrides,
        ...patch.contextWindowOverrides,
      }
    }
    await this.scope.update(normalized)
    return this.status()
  }

  watch(callback: (next: SubscriptionPreferencesDto, prev: SubscriptionPreferencesDto) => void | Promise<void>): () => void {
    return this.scope.watch((next, prev) => callback(withWritable(next), withWritable(prev)))
  }
}

export class PreferenceError extends Error {
  constructor(message: string) {
    super(message)
  }
}

function withWritable(value: PreferenceSettings): SubscriptionPreferencesDto {
  return { ...value, writable: true }
}
