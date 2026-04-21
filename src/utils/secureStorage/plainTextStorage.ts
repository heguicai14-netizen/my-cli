// Secure-storage stack has been removed. Kept as an empty no-op stub for
// ABI compatibility; credentials are now read from settings.json only.

import type { SecureStorageData } from './types.js'

export const plainTextStorage = {
  name: 'plaintext',
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
