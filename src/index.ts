import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-attachment'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-web'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import {
  DEFAULT_CALLBACK_PORT,
  PROVIDER_ID,
} from './compat.ts'
import { GeminiSubscriptionAdapter } from './host/adapter.ts'
import { GeminiClient } from './host/gemini-client.ts'
import { OAuthService } from './host/oauth-service.ts'
import { createPlatformTokenStore } from './host/platform-token-store.ts'
import { registerPreferenceStore } from './host/preferences.ts'
import { registerRoutes } from './host/routes.ts'
import { UsageService } from './host/usage-service.ts'

export const inject = ['webServer', 'llm', 'attachments', 'tools', 'web', 'settings', 'loader', 'agents']

export function apply(ctx: Context): void {
  const store = createPlatformTokenStore()
  const oauth = new OAuthService(store, { logger: ctx.logger, preferredPort: DEFAULT_CALLBACK_PORT })
  const usage = new UsageService(oauth)
  const preferences = registerPreferenceStore(ctx.settings)
  const client = new GeminiClient(oauth, ctx.attachments, {
    logger: ctx.logger,
    onGenerationFinished: () => usage.invalidate(),
  })
  const adapter = new GeminiSubscriptionAdapter(client, preferences, oauth)

  ctx.effect(() => {
    const disposeRoutes = registerRoutes(ctx, oauth, usage, preferences)
    const disposeAdapter = ctx.llm.registerAdapter([PROVIDER_ID], adapter)

    return () => {
      disposeAdapter()
      disposeRoutes()
      oauth.dispose()
    }
  }, 'dsh-gemini-subscription: adapter, routes, and lifecycle')
}

export { OAuthService } from './host/oauth-service.ts'
export { GeminiSubscriptionAdapter } from './host/adapter.ts'
export { GeminiClient } from './host/gemini-client.ts'
export { UsageService } from './host/usage-service.ts'
export { createPlatformTokenStore } from './host/platform-token-store.ts'
export {
  PROVIDER_ID,
  PROVIDER_NAME,
  ROUTE_PREFIX,
} from './compat.ts'
