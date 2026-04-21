// Keychain prefetch has been removed along with the auth module. These
// exports remain as no-ops so main.tsx / auth.ts import sites keep compiling.

export function startKeychainPrefetch(): void {}

export async function ensureKeychainPrefetchCompleted(): Promise<void> {}

export function getLegacyApiKeyPrefetchResult(): {
  stdout: string | null
} | null {
  return null
}

export function clearLegacyApiKeyPrefetch(): void {}
