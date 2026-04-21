// API-key verification flow has been removed. The hook remains for callers
// that depended on its shape and always reports `valid` when an apiKey is
// configured in settings.json, `missing` otherwise.

import { getAnthropicApiKey } from '../utils/auth.js'

export type VerificationStatus =
  | 'loading'
  | 'valid'
  | 'invalid'
  | 'missing'
  | 'error'

export type ApiKeyVerificationResult = {
  status: VerificationStatus
  reverify: () => Promise<void>
  error: Error | null
}

export function useApiKeyVerification(): ApiKeyVerificationResult {
  const status: VerificationStatus = getAnthropicApiKey() ? 'valid' : 'missing'
  return {
    status,
    reverify: async () => {},
    error: null,
  }
}
