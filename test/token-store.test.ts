import { describe, expect, it } from 'vitest'
import { MemoryTokenStore, parseStoredCredentials } from '../src/host/token-store.ts'
import { FileTokenStore } from '../src/host/token-store-file.ts'
import { PlatformTokenStore } from '../src/host/platform-token-store.ts'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink } from 'node:fs/promises'

describe('Token Stores', () => {
  it('saves and loads in MemoryTokenStore', async () => {
    const store = new MemoryTokenStore()
    expect(await store.load()).toBeNull()

    const creds = {
      accessToken: 'test-acc',
      refreshToken: 'test-ref',
      expiresAt: 123456789,
      email: 'test@example.com',
    }
    await store.save(creds)
    expect(await store.load()).toEqual(creds)
    await store.clear()
    expect(await store.load()).toBeNull()
  })

  it('validates stored credentials schema', () => {
    expect(() => parseStoredCredentials({})).toThrow()
    expect(() => parseStoredCredentials({ accessToken: '', refreshToken: 'r', expiresAt: 100 })).toThrow()
    const valid = parseStoredCredentials({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 1000,
      email: 'a@b.com',
      projectId: 'proj-1',
    })
    expect(valid.email).toBe('a@b.com')
    expect(valid.projectId).toBe('proj-1')
  })

  it('saves and loads with FileTokenStore', async () => {
    const tmpPath = join(tmpdir(), `gemini-test-token-${Date.now()}.json`)
    const fileStore = new FileTokenStore(tmpPath)
    try {
      expect(await fileStore.load()).toBeNull()
      const sample = {
        accessToken: 'f-acc',
        refreshToken: 'f-ref',
        expiresAt: 99999999,
        name: 'Tester',
      }
      await fileStore.save(sample)
      const loaded = await fileStore.load()
      expect(loaded?.accessToken).toBe('f-acc')
      expect(loaded?.name).toBe('Tester')
      await fileStore.clear()
      expect(await fileStore.load()).toBeNull()
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }
  })

  it('PlatformTokenStore mirrors to file store on save and clear', async () => {
    const mem = new MemoryTokenStore()
    const tmpPath = join(tmpdir(), `gemini-mirror-test-${Date.now()}.json`)
    const mirror = new FileTokenStore(tmpPath)
    const platformStore = new PlatformTokenStore(mem, mirror)

    try {
      const sample = {
        accessToken: 'p-acc',
        refreshToken: 'p-ref',
        expiresAt: 888888,
      }
      await platformStore.save(sample)
      expect(await platformStore.load()).toEqual(sample)
      expect(await mirror.load()).toEqual(sample)

      await platformStore.clear()
      expect(await platformStore.load()).toBeNull()
      expect(await mirror.load()).toBeNull()
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }
  })
})
