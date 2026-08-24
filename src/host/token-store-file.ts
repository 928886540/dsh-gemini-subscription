import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { TokenStore, StoredOAuthCredentials } from './token-store.ts'
import { parseStoredCredentials } from './token-store.ts'

export function defaultTokenFilePath(): string {
  const dshHome = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(dshHome, 'gemini-subscription-token.json')
}

export class FileTokenStore implements TokenStore {
  readonly storage = { kind: 'linux-file', encrypted: false } as const

  constructor(private readonly path = defaultTokenFilePath()) {}

  async load(): Promise<StoredOAuthCredentials | null> {
    try {
      const data = await readFile(this.path, 'utf8')
      return parseStoredCredentials(JSON.parse(data))
    } catch (error) {
      if (isMissing(error)) return null
      throw new Error(`File token store read failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async save(value: StoredOAuthCredentials): Promise<void> {
    const dir = dirname(this.path)
    await mkdir(dir, { recursive: true })
    const tmp = `${this.path}.tmp-${randomUUID()}`
    try {
      await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
      await rename(tmp, this.path)
    } catch (error) {
      await unlink(tmp).catch(() => undefined)
      throw new Error(`File token store write failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.path)
    } catch (error) {
      if (isMissing(error)) return
      throw new Error(`File token store clear failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
