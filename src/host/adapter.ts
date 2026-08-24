import {
  LlmAdapter,
  resolveRetryPolicy,
  type GenerateOptions,
  type LlmModelInfo,
  type LlmProviderInfo,
  type LlmResolvedModelInfo,
  type PreparedAdapterCall,
  type ResolvedRetryPolicy,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { PROVIDER_ID, PROVIDER_NAME } from '../compat.ts'
import { listGeminiModels, resolveGeminiModel } from '../shared/model-catalog.ts'
import type { GeminiClient } from './gemini-client.ts'
import type { SubscriptionPreferenceStore } from './preferences.ts'

const RETRY_POLICY = resolveRetryPolicy({
  mode: 'normal',
  maxRetries: 2,
  retryableCodes: ['RATE_LIMIT', 'SERVER_ERROR', 'NETWORK'],
  backoff: { initialDelayMs: 1_000, maxDelayMs: 10_000, jitterRatio: 0.15 },
}, 'dsh-gemini-subscription.retry')

export class GeminiSubscriptionAdapter extends LlmAdapter {
  constructor(
    private readonly client: GeminiClient,
    private readonly preferences?: SubscriptionPreferenceStore,
  ) {
    super()
  }

  providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: PROVIDER_NAME }
  }

  providerRetryPolicy(): ResolvedRetryPolicy {
    return RETRY_POLICY
  }

  async listModels(): Promise<readonly LlmModelInfo[]> {
    return listGeminiModels()
  }

  async resolveModel(_provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo> {
    const currentPreferences = this.preferences?.status()
    return resolveGeminiModel(model, currentPreferences?.contextWindowOverrides)
  }

  async prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall> {
    return {
      model: await this.resolveModel(provider, model, signal),
      stream: (options) => this.stream(options),
    }
  }

  stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    return this.client.stream(options)
  }
}

export { PROVIDER_ID }
