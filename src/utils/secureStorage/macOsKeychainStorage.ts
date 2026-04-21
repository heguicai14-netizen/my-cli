// macOS keychain backend has been removed. Stub returns null/false for all
// reads; credentials flow through settings.json only.

import type { SecureStorageData } from './types.js'

export const macOsKeychainStorage = {
  name: 'keychain',
  read(): SecureStorageData | null {
    return null
  },
  async readAsync(): Promise<SecureStorageData | null> {
    return null
  },
  update(_data: SecureStorageData): { success: boolean; warning?: string } {
    return { success: false }
  },
  delete(): boolean {
    return true
  },
}

export function isMacOsKeychainLocked(): boolean {
  return false
}
