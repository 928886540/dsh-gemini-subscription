import { describe, expect, it } from 'vitest'
import {
  mapGenerateOptionsToGeminiPayload,
  parseGeminiStream,
} from '../src/host/gemini-mapper.ts'
import {
  CallId,
  createAssistantMessage,
  createUserMessage,
  type GenerateOptions,
} from '@deepseek-ai/dsh-llm'
import { PROVIDER_ID } from '../src/compat.ts'

describe('Gemini Mapper', () => {
  it('maps text messages, system prompt, and tools to Gemini payload', async () => {
    const userMsg = createUserMessage({
      content: [{ type: 'text', text: 'What is the capital of France?' }],
      source: { kind: 'user' },
    })

    const assistantMsg = createAssistantMessage({
      content: [
        { type: 'reasoning', text: 'Let me think.' },
        { type: 'text', text: 'Thinking...' },
      ],
      source: { provider: PROVIDER_ID, model: 'gemini-3.7-flash-high' },
    })

    const options: GenerateOptions = {
      provider: PROVIDER_ID,
      model: 'gemini-3.7-flash-high',
      system: 'You are an AI assistant.',
      messages: [userMsg, assistantMsg],
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather info',
          parameters: { type: 'object', properties: { city: { type: 'string' } } },
        },
      ],
      temperature: 0.7,
      maxTokens: 4096,
    }

    const payload = await mapGenerateOptionsToGeminiPayload(options, 'test-project')
    expect(payload.model).toBe('gemini-3.6-flash-high')
    expect(payload.project).toBe('test-project')
    expect(payload.request.generationConfig?.thinkingConfig?.thinkingBudget).toBe(16384)
    expect(payload.request.systemInstruction?.parts[0].text).toBe('You are an AI assistant.')
    expect(payload.request.contents.length).toBe(2)
    expect(payload.request.contents[0].role).toBe('user')
    expect(payload.request.contents[1].role).toBe('model')
    expect(payload.request.contents[1].parts[0].thought).toBe(true)
    expect(payload.request.tools?.[0].functionDeclarations?.[0].name).toBe('get_weather')
  })

  it('parses SSE stream chunks with text, reasoning, tool calls, and usage', async () => {
    const sseLines = [
      'data: {"response": {"candidates": [{"content": {"parts": [{"thought": true, "text": "Deep thinking step"}]}}]}}\n\n',
      'data: {"response": {"candidates": [{"content": {"parts": [{"text": "Hello world!"}]}}]}}\n\n',
      'data: {"response": {"candidates": [{"content": {"parts": [{"functionCall": {"name": "search", "args": {"q": "paris"}}}]}}]}}\n\n',
      'data: {"response": {"candidates": [{"finishReason": "STOP"}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20, "thoughtsTokenCount": 5}}}\n\n',
      'data: [DONE]\n\n',
    ]

    async function* makeStream() {
      for (const line of sseLines) {
        yield new TextEncoder().encode(line)
      }
    }

    const chunks = []
    for await (const chunk of parseGeminiStream(makeStream())) {
      chunks.push(chunk)
    }

    expect(chunks.some((c) => c.type === 'reasoning-delta' && c.text === 'Deep thinking step')).toBe(true)
    expect(chunks.some((c) => c.type === 'text-delta' && c.text === 'Hello world!')).toBe(true)
    expect(chunks.some((c) => c.type === 'tool-call-delta' && c.name === 'search')).toBe(true)
    expect(chunks.some((c) => c.type === 'usage' && c.usage.inputTokens === 10 && c.usage.reasoningTokens === 5)).toBe(true)
    expect(chunks.some((c) => c.type === 'finish' && c.reason.kind === 'stop')).toBe(true)
  })

  it('parses Claude 4.6 SSE stream cleanly without undefined fields in usage chunk', async () => {
    const claudeSseLines = [
      'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"thought": true,"thoughtSignature": "SIG123","text": ""}]}}],"usageMetadata": {"promptTokenCount": 37,"candidatesTokenCount": 3,"totalTokenCount": 40}}}\n\n',
      'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"thought": true,"text": "Claude thinking"}]}}],"usageMetadata": {"promptTokenCount": 37,"candidatesTokenCount": 3,"totalTokenCount": 40}}}\n\n',
      'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"text": "Hello from Claude"}]},"finishReason": "STOP"}],"usageMetadata": {"promptTokenCount": 37,"candidatesTokenCount": 47,"totalTokenCount": 84}}}\n\n',
    ]

    async function* makeStream() {
      for (const line of claudeSseLines) {
        yield new TextEncoder().encode(line)
      }
    }

    const chunks = []
    for await (const chunk of parseGeminiStream(makeStream())) {
      chunks.push(chunk)
      // Verify strict JSON serializability (no undefined keys)
      for (const [k, v] of Object.entries(chunk)) {
        expect(v).not.toBeUndefined()
        if (typeof v === 'object' && v !== null) {
          for (const [subK, subV] of Object.entries(v)) {
            expect(subV).not.toBeUndefined()
          }
        }
      }
    }

    const usageChunk = chunks.find((c) => c.type === 'usage')
    expect(usageChunk).toBeDefined()
    if (usageChunk && usageChunk.type === 'usage') {
      expect(usageChunk.usage.inputTokens).toBe(37)
      expect(usageChunk.usage.outputTokens).toBe(3)
      expect(Object.prototype.hasOwnProperty.call(usageChunk.usage, 'reasoningTokens')).toBe(false)
    }
  })
})
