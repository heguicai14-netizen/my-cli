// Auth module removed. Retained exports are no-op stubs so that importers
// (secureStorage consumers, auth.ts, services/mcp/*) keep compiling.

import type { SecureStorageData } from './types.js'

export const CREDENTIALS_SERVICE_SUFFIX = '-credentials'

export function getMacOsKeychainStorageServiceName(
  _serviceSuffix: string = '',
): string {
  return ''
}

export function getUsername(): string {
  return ''
}

export const KEYCHAIN_CACHE_TTL_MS = 30_000

export const keychainCacheState: {
  cache: { cachedAt: number; data: SecureStorageData | null }
} = {
  cache: { cachedAt: 0, data: null },
}

export function clearKeychainCache(): void {}

export function primeKeychainCacheFromPrefetch(_stdout: string | null): void {}
