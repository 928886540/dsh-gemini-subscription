import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import {
  ANTIGRAVITY_ENDPOINTS,
} from '../compat.ts'
import {
  mapGenerateOptionsToGeminiPayload,
  parseGeminiStream,
  type ImageResolver,
} from './gemini-mapper.ts'
import type { OAuthService } from './oauth-service.ts'
import { geminiHeaders, stableSessionId } from './wire-auth.ts'

type FetchLike = typeof fetch

export interface GeminiClientOptions {
  fetchFn?: FetchLike
  onGenerationFinished?: () => void
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  defaultThinkingBudget?: number
}

export class GeminiClient implements ImageResolver {
  private readonly fetchFn: FetchLike
  private readonly onGenerationFinished?: () => void
  private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>
  private readonly defaultThinkingBudget: number

  constructor(
    private readonly oauth: OAuthService,
    private readonly attachments?: Pick<AttachmentStore, 'readImage'>,
    options: GeminiClientOptions = {},
  ) {
    this.fetchFn = options.fetchFn ?? fetch
    this.onGenerationFinished = options.onGenerationFinished
    this.logger = options.logger ?? console
    this.defaultThinkingBudget = options.defaultThinkingBudget ?? 8192
  }

  async resolveImage(attachment: ImageAttachmentRef): Promise<{ mimeType: string; base64: string } | null> {
    if (!this.attachments) return null
    try {
      const stored = await this.attachments.readImage(attachment)
      if (!stored || !stored.data) return null
      const base64 = Buffer.from(stored.data).toString('base64')
      return {
        mimeType: attachment.mediaType || 'image/png',
        base64,
      }
    } catch (err) {
      this.logger.warn?.(`[dsh-gemini-subscription] Failed to resolve image attachment: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    let credentials = await this.oauth.credentials()
    const projectId = credentials.projectId || 'default-cli-project'
    const payload = await mapGenerateOptionsToGeminiPayload(
      options,
      projectId,
      this,
      this.defaultThinkingBudget,
    )

    const sessionId = stableSessionId(options.sessionId)
    let retriedAuth = false

    const sendRequest = async (tokenCreds: typeof credentials, endpointBase: string): Promise<Response> => {
      const url = `${endpointBase}/v1internal:streamGenerateContent?alt=sse`
      return await this.fetchFn(url, {
        method: 'POST',
        headers: {
          ...geminiHeaders(tokenCreds, sessionId),
          accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: options.signal,
      })
    }

    let response: Response | null = null
    const endpoints = ANTIGRAVITY_ENDPOINTS

    for (const ep of endpoints) {
      try {
        response = await sendRequest(credentials, ep)
        if (response.status === 401 && !retriedAuth) {
          this.logger.info?.('[dsh-gemini-subscription] Received 401, refreshing OAuth token...')
          retriedAuth = true
          credentials = await this.oauth.credentials(true)
          response = await sendRequest(credentials, ep)
        }
        if (response.ok) {
          break
        }
      } catch (err) {
        if (ep === endpoints[endpoints.length - 1]) {
          throw err
        }
      }
    }

    if (!response || !response.ok) {
      const errText = await response?.text().catch(() => '')
      throw new Error(`Gemini Code Assist streaming request failed (${response?.status}): ${errText}`)
    }

    if (!response.body) {
      throw new Error('Gemini Code Assist response body is null')
    }

    try {
      yield* parseGeminiStream(response.body as unknown as AsyncIterable<Uint8Array>)
    } finally {
      this.onGenerationFinished?.()
    }
  }
}
