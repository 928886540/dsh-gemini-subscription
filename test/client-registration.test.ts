import { describe, expect, it } from 'vitest'
import { apply } from '../src/client/index.tsx'

describe('Client Registration', () => {
  it('registers locale, styles, and ui slots', () => {
    const registeredLocales: any[] = []
    const registeredSlots: any[] = []

    const ctx = {
      effect: (fn: Function) => fn(),
      locale: {
        register: (ns: string, dicts: any) => {
          registeredLocales.push({ ns, dicts })
        },
        bind: () => (k: string) => k,
      },
      slots: {
        inject: (_name: string, fn: Function) => fn(),
        register: (def: any, component: any) => {
          registeredSlots.push({ def, component })
        },
      },
      modelDirectories: {
        directoryFor: () => ({ store: {}, load: async () => {} }),
      },
      conversation: {},
    }

    apply(ctx as any)
    expect(registeredLocales.length).toBe(1)
    expect(registeredSlots.length).toBe(2)
    expect(registeredSlots.some((s) => s.def.id === 'gemini-subscription')).toBe(true)
    expect(registeredSlots.some((s) => s.def.id === 'gemini-subscription-quota')).toBe(true)
  })
})
