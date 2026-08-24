import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { GeminiSubscriptionApi } from './api.ts'
import { GeminiComposerQuota } from './GeminiComposerQuota.tsx'
import { GeminiSubscriptionSection } from './GeminiSubscriptionSection.tsx'
import { dictionaries, NS, type LocaleKey } from './locales.ts'
import { installStyles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'dsh-gemini-subscription': LocaleKey
  }
}

export const inject = ['slots', 'locale', 'modelDirectories', 'conversation']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-gemini-subscription: dictionaries')
  ctx.effect(() => installStyles(), 'dsh-gemini-subscription: styles')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'gemini-subscription',
    order: 46,
    label: () => t('title'),
    locale: NS,
  }, GeminiSubscriptionSection))

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'gemini-subscription-quota',
    order: 36,
    locale: NS,
    inject: (sessionId) => {
      const directory = ctx.modelDirectories.directoryFor(sessionId)
      return {
        api: new GeminiSubscriptionApi(),
        directory: directory.store,
        loadModelDirectory: () => {
          void directory.load().catch(() => undefined)
        },
      }
    },
  }, GeminiComposerQuota))
}
