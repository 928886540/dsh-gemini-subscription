import type { TokenStore, StoredOAuthCredentials } from './token-store.ts'
import { MacKeychainTokenStore } from './token-store-macos.ts'
import { LinuxFileTokenStore } from './token-store-linux.ts'
import { WindowsDpapiTokenStore } from './token-store-windows.ts'
import { FileTokenStore } from './token-store-file.ts'

/**
 * Dual token store:
 * 1. Primary secure store (Windows DPAPI, Mac Keychain, Linux 0600 file).
 * 2. Mirrors to ~/.dsh/gemini-subscription-token.json for CLI/interop convenience.
 */
export class PlatformTokenStore implements TokenStore {
  readonly storage: TokenStore['storage']
  private readonly primaryStore: TokenStore
  private readonly fileMirror: FileTokenStore

  constructor(primaryStore: TokenStore, fileMirror = new FileTokenStore()) {
    this.primaryStore = primaryStore
    this.fileMirror = fileMirror
    this.storage = primaryStore.storage
  }

  async load(): Promise<StoredOAuthCredentials | null> {
    try {
      const creds = await this.primaryStore.load()
      if (creds !== null) return creds
    } catch {
      // Primary store failed, attempt reading file mirror
    }
    return await this.fileMirror.load()
  }

  async save(value: StoredOAuthCredentials): Promise<void> {
    await Promise.allSettled([
      this.primaryStore.save(value),
      this.fileMirror.save(value),
    ])
  }

  async clear(): Promise<void> {
    await Promise.allSettled([
      this.primaryStore.clear(),
      this.fileMirror.clear(),
    ])
  }
}

export function createPlatformTokenStore(platform: NodeJS.Platform = process.platform): TokenStore {
  let primary: TokenStore
  if (platform === 'win32') primary = new WindowsDpapiTokenStore()
  else if (platform === 'darwin') primary = new MacKeychainTokenStore()
  else if (platform === 'linux') primary = new LinuxFileTokenStore()
  else primary = new FileTokenStore()

  return new PlatformTokenStore(primary, new FileTokenStore())
}
