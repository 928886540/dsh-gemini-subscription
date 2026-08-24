import { describe, expect, it } from 'vitest'
import pkg from '../package.json' with { type: 'json' }

describe('Package Integrity', () => {
  it('defines required metadata and dual exports', () => {
    expect(pkg.name).toBe('dsh-gemini-subscription')
    expect(pkg.main).toBe('lib/index.js')
    expect(pkg.exports['.']).toBeDefined()
    expect(pkg.exports['./client']).toBeDefined()
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh.client.platform).toBe('web')
  })
})
