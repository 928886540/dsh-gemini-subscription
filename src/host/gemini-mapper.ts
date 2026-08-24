import {
  CallId,
  type ContentBlock,
  type FinishReason,
  type GenerateOptions,
  type Message,
  type StreamChunk,
  type TokenUsage,
  type ToolSchema,
} from '@deepseek-ai/dsh-llm'
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { resolveGeminiCatalogEntry } from '../shared/model-catalog.ts'

export interface GeminiPart {
  text?: string
  thought?: boolean | string
  inlineData?: {
    mimeType: string
    data: string
  }
  functionCall?: {
    name: string
    args: Record<string, unknown>
    id?: string
  }
  functionResponse?: {
    name: string
    response: Record<string, unknown>
    id?: string
  }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiGenerationConfig {
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  stopSequences?: string[]
  thinkingConfig?: {
    includeThoughts?: boolean
    thinkingBudget?: number
  }
}

export interface GeminiFunctionDeclaration {
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

export interface GeminiTool {
  functionDeclarations?: GeminiFunctionDeclaration[]
}

export interface GeminiCodeAssistPayload {
  model: string
  project: string
  user_prompt_id?: string
  request: {
    contents: GeminiContent[]
    systemInstruction?: {
      role?: string
      parts: GeminiPart[]
    }
    generationConfig?: GeminiGenerationConfig
    tools?: GeminiTool[]
  }
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  totalTokenCount?: number
  cachedContentTokenCount?: number
}

export interface GeminiResponseCandidate {
  content?: {
    role?: string
    parts?: GeminiPart[]
  }
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER' | 'BLOCKLIST' | 'PROHIBITED_CONTENT' | 'SPII'
}

export interface GeminiSseResponsePayload {
  traceId?: string
  response?: {
    candidates?: GeminiResponseCandidate[]
    usageMetadata?: GeminiUsageMetadata
    modelVersion?: string
  }
  candidates?: GeminiResponseCandidate[]
  usageMetadata?: GeminiUsageMetadata
}

export interface ImageResolver {
  resolveImage(attachment: ImageAttachmentRef): Promise<{ mimeType: string; base64: string } | null>
}

// Global in-memory cache for tool call thought signatures
const thoughtSignatureCache = new Map<string, string>()
let lastRecordedThoughtSignature: string | null = null

export function recordThoughtSignature(key: string, sig: string): void {
  if (!sig) return
  if (thoughtSignatureCache.size > 10_000) {
    const firstKey = thoughtSignatureCache.keys().next().value
    if (firstKey) thoughtSignatureCache.delete(firstKey)
  }
  thoughtSignatureCache.set(key, sig)
  lastRecordedThoughtSignature = sig
}

export function getRecordedThoughtSignature(key: string): string | undefined {
  return thoughtSignatureCache.get(key)
}

export async function mapGenerateOptionsToGeminiPayload(
  options: GenerateOptions,
  projectId: string,
  imageResolver?: ImageResolver,
  defaultThinkingBudget = 8192,
): Promise<GeminiCodeAssistPayload> {
  const catalogEntry = resolveGeminiCatalogEntry(options.model)
  const upstreamModel = catalogEntry.upstreamModel

  let systemText = options.system || ''
  const contents: GeminiContent[] = []

  const toolCallNameMap = new Map<string, string>()
  for (const message of options.messages) {
    if (message.role === 'assistant') {
      for (const block of message.content) {
        if (block.type === 'tool-call') {
          toolCallNameMap.set(String(block.id), block.name)
        }
      }
    }
  }

  for (const message of options.messages) {
    if (message.role === 'system') {
      for (const block of message.content) {
        if (block.type === 'text' && block.text) {
          systemText = systemText ? `${systemText}\n\n${block.text}` : block.text
        }
      }
      continue
    }

    if (message.role === 'user') {
      const parts: GeminiPart[] = []
      for (const block of message.content) {
        if (block.type === 'text' && block.text) {
          parts.push({ text: block.text })
        } else if (block.type === 'image' && block.attachment && imageResolver) {
          const resolved = await imageResolver.resolveImage(block.attachment)
          if (resolved) {
            parts.push({
              inlineData: {
                mimeType: resolved.mimeType,
                data: resolved.base64,
              },
            })
          }
        } else if (block.type === 'tool-result') {
          let textResult = ''
          for (const sub of block.content) {
            if (sub.type === 'text') textResult += sub.text
          }
          let parsed: Record<string, unknown>
          try {
            const temp = JSON.parse(textResult)
            if (temp !== null && typeof temp === 'object' && !Array.isArray(temp)) {
              parsed = temp as Record<string, unknown>
            } else {
              parsed = { output: temp }
            }
          } catch {
            parsed = { output: textResult }
          }
          const toolName = ('toolName' in block && typeof block.toolName === 'string' && block.toolName)
            ? block.toolName
            : toolCallNameMap.get(String(block.toolCallId)) || 'tool'

          parts.push({
            functionResponse: {
              name: toolName,
              response: parsed,
            },
          })
        }
      }
      if (parts.length > 0) {
        contents.push({ role: 'user', parts })
      }
      continue
    }

    if (message.role === 'assistant') {
      const parts: GeminiPart[] = []
      for (const block of message.content) {
        if (block.type === 'reasoning' && block.text) {
          parts.push({ text: block.text, thought: true })
        } else if (block.type === 'text' && block.text) {
          parts.push({ text: block.text })
        } else if (block.type === 'tool-call') {
          let parsedArgs: Record<string, unknown> = {}
          try {
            parsedArgs = JSON.parse(block.arguments)
          } catch {
            parsedArgs = {}
          }
          const callIdStr = String(block.id)
          const sig = (block as { thoughtSignature?: string; signature?: string }).thoughtSignature
            || (block as { thoughtSignature?: string; signature?: string }).signature
            || getRecordedThoughtSignature(callIdStr)
            || getRecordedThoughtSignature(`${block.name}:${callIdStr}`)
            || lastRecordedThoughtSignature
            || undefined

          const functionCallPart: GeminiPart = {
            functionCall: {
              id: callIdStr,
              name: block.name,
              args: parsedArgs,
            },
          }
          if (sig) {
            (functionCallPart as Record<string, unknown>).thoughtSignature = sig
          }
          parts.push(functionCallPart)
        }
      }
      if (parts.length > 0) {
        contents.push({ role: 'model', parts })
      }
    }
  }

  // Build tools
  let tools: GeminiTool[] | undefined
  if (options.tools && options.tools.length > 0) {
    const declarations: GeminiFunctionDeclaration[] = options.tools.map((t: ToolSchema) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
    tools = [{ functionDeclarations: declarations }]
  }

  // Build thinking configuration
  // 模型自带预算就用模型预算；没有就用 catalog 里这个模型自己的 defaultThinkingBudget
  const budget = catalogEntry.defaultThinkingBudget ?? defaultThinkingBudget
  const thinkingConfig: GeminiGenerationConfig['thinkingConfig'] = catalogEntry.reasoning ? {
    includeThoughts: true,
    thinkingBudget: budget,
  } : undefined

  const isClaude = catalogEntry.id.includes('claude') || upstreamModel.includes('claude')
  const hardMax = isClaude ? 64_000 : 65_536
  const requestedMaxTokens = Math.min(options.maxTokens ?? catalogEntry.maxOutputTokens ?? hardMax, hardMax)
  const thinkingBudgetVal = thinkingConfig?.thinkingBudget ?? 0

  // Claude and Gemini extended thinking strictly require maxOutputTokens > thinkingBudget
  const maxOutputTokens = Math.min(
    hardMax,
    Math.max(requestedMaxTokens, thinkingBudgetVal > 0 ? Math.min(thinkingBudgetVal + 4096, hardMax) : 4096),
  )

  if (thinkingConfig && typeof thinkingConfig.thinkingBudget === 'number') {
    if (thinkingConfig.thinkingBudget >= maxOutputTokens) {
      thinkingConfig.thinkingBudget = Math.max(1024, maxOutputTokens - 4096)
    }
  }

  const generationConfig: GeminiGenerationConfig = {
    temperature: options.temperature,
    maxOutputTokens,
    ...(options.stop ? { stopSequences: options.stop } : {}),
    ...(thinkingConfig !== undefined ? { thinkingConfig } : {}),
  }

  return {
    model: upstreamModel,
    project: projectId,
    request: {
      contents,
      ...(systemText ? { systemInstruction: { role: 'user', parts: [{ text: systemText }] } } : {}),
      generationConfig,
      ...(tools !== undefined ? { tools } : {}),
    },
  }
}

/** Parse Server-Sent Events from Gemini / Antigravity streaming endpoints. */
export async function* parseGeminiStream(
  stream: AsyncIterable<Uint8Array | string>,
): AsyncIterable<StreamChunk> {
  const decoder = new TextDecoder()
  let buffer = ''
  let nextIndex = 0
  let textIndex: number | null = null
  let reasoningIndex: number | null = null
  let activeToolIndex: number | null = null
  let callIdCounter = 0

  for await (const chunk of stream) {
    const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
    buffer += text
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith(':')) continue
      if (!trimmed.startsWith('data:')) continue

      const rawJson = trimmed.slice(5).trim()
      if (rawJson === '[DONE]') {
        yield { type: 'finish', reason: { kind: 'stop' } }
        return
      }

      let payload: GeminiSseResponsePayload
      try {
        payload = JSON.parse(rawJson)
      } catch {
        continue
      }

      const responseObj = payload.response ?? payload
      const candidates = responseObj.candidates ?? []

      for (const candidate of candidates) {
        const parts = candidate.content?.parts ?? []
        let currentCandidateSig: string | null = null
        for (const part of parts) {
          const sig = (part as { thoughtSignature?: string }).thoughtSignature
          if (sig) {
            currentCandidateSig = sig
            recordThoughtSignature('last', sig)
          }
        }

        for (const part of parts) {
          if (part.thought === true || (typeof part.thought === 'string' && part.thought.length > 0)) {
            const thoughtText = typeof part.thought === 'string' ? part.thought : (part.text ?? '')
            if (thoughtText) {
              if (reasoningIndex === null) {
                reasoningIndex = nextIndex++
                yield cleanChunk({ type: 'block-start', index: reasoningIndex, blockType: 'reasoning' })
              }
              yield cleanChunk({ type: 'reasoning-delta', index: reasoningIndex, text: thoughtText })
            }
          } else if (part.text) {
            if (textIndex === null) {
              textIndex = nextIndex++
              yield cleanChunk({ type: 'block-start', index: textIndex, blockType: 'text' })
            }
            yield cleanChunk({ type: 'text-delta', index: textIndex, text: part.text })
          }

          if (part.functionCall) {
            const callId = CallId(part.functionCall.id || `call_${Date.now()}_${++callIdCounter}`)
            const argsStr = typeof part.functionCall.args === 'string'
              ? part.functionCall.args
              : JSON.stringify(part.functionCall.args ?? {})
            activeToolIndex = nextIndex++
            yield cleanChunk({ type: 'block-start', index: activeToolIndex, blockType: 'tool-call' })
            const chunk: StreamChunk = {
              type: 'tool-call-delta',
              index: activeToolIndex,
              id: callId,
              argumentsDelta: argsStr,
            }
            if (part.functionCall.name) {
              chunk.name = part.functionCall.name
            }
            const sig = (part as { thoughtSignature?: string }).thoughtSignature || currentCandidateSig
            if (sig) {
              (chunk as Record<string, unknown>).thoughtSignature = sig
              const callIdStr = String(callId)
              recordThoughtSignature(callIdStr, sig)
              if (part.functionCall.name) {
                recordThoughtSignature(`${part.functionCall.name}:${callIdStr}`, sig)
                recordThoughtSignature(part.functionCall.name, sig)
              }
            }
            yield cleanChunk(chunk)
          }
        }

        if (candidate.finishReason) {
          const kind = candidate.finishReason === 'STOP'
            ? 'stop'
            : candidate.finishReason === 'MAX_TOKENS'
              ? 'max-tokens'
              : 'stop'
          yield cleanChunk({ type: 'finish', reason: { kind } })
        }
      }

      if (responseObj.usageMetadata) {
        const u = responseObj.usageMetadata
        const inputTokens = u.promptTokenCount ?? 0
        const outputTokens = u.candidatesTokenCount ?? 0
        const usageObj: TokenUsage = {
          inputTokens,
          outputTokens,
        }
        if (typeof u.thoughtsTokenCount === 'number' && Number.isFinite(u.thoughtsTokenCount)) {
          usageObj.reasoningTokens = u.thoughtsTokenCount
        }
        yield cleanChunk({
          type: 'usage',
          usage: usageObj,
        })
      }
    }
  }
}

function cleanChunk<T extends StreamChunk>(chunk: T): T {
  return JSON.parse(JSON.stringify(chunk)) as T
}
