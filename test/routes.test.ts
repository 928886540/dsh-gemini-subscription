import { describe, expect, it } from 'vitest'
import { registerRoutes } from '../src/host/routes.ts'
import { OAuthService } from '../src/host/oauth-service.ts'
import { UsageService } from '../src/host/usage-service.ts'
import { MemoryTokenStore } from '../src/host/token-store.ts'
import { ROUTE_PREFIX } from '../src/compat.ts'
import { DEFAULT_SUBSCRIPTION_PREFERENCES } from '../src/shared/preferences.ts'

describe('Routes', () => {
  it('registers middleware and responds to status GET', async () => {
    const registeredRoutes: any[] = []
    const ctx = {
      webServer: {
        register: (def: any) => {
          registeredRoutes.push(def)
          return () => {}
        },
      },
    }

    const store = new MemoryTokenStore()
    const oauth = new OAuthService(store)
    const usage = new UsageService(oauth)
    const preferencesStore = {
      status: () => DEFAULT_SUBSCRIPTION_PREFERENCES,
      update: async (patch: any) => ({ ...DEFAULT_SUBSCRIPTION_PREFERENCES, ...patch }),
      watch: () => () => {},
    }

    registerRoutes(ctx as any, oauth, usage, preferencesStore as any)
    expect(registeredRoutes.length).toBe(2)

    const prefixHandler = registeredRoutes.find((r) => r.kind === 'prefix')?.handler
    expect(prefixHandler).toBeDefined()

    const req = {
      method: 'GET',
      url: `${ROUTE_PREFIX}/status`,
      headers: {},
    }
    let resData = ''
    let resStatus = 0
    const res = {
      writeHead: (status: number) => { resStatus = status },
      end: (data: string) => { resData = data },
    }

    await prefixHandler(req, res)
    expect(resStatus).toBe(200)
    const parsed = JSON.parse(resData)
    expect(parsed.ok).toBe(true)
    expect(parsed.value.authenticated).toBe(false)
  })
})
