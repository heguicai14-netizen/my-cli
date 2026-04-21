// Auth module removed. Exports retained as no-ops for ABI compatibility.
// Credentials now flow exclusively through settings.json.

export async function maybeRemoveApiKeyFromMacOSKeychainThrows(): Promise<void> {}

export function normalizeApiKeyForConfig(apiKey: string): string {
  return apiKey.slice(-20)
}
