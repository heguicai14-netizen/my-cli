// Credentials are read exclusively from ~/.mycli/settings.json (`apiKey` /
// `baseUrl` fields). OAuth, macOS keychain, env-var discovery, apiKeyHelper,
// and Claude.ai subscription flows are removed — all identity / subscription
// functions below return safe defaults so callers keep compiling.

import type { AccountInfo } from './config.js'
import { getSettings_DEPRECATED } from './settings/settings.js'

// ——— Types (previously re-exported from services/oauth/types.ts) ———

export type OAuthTokens = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  [key: string]: unknown
}
export type SubscriptionType = string

export type ApiKeySource = 'settings' | 'none'

export type UserAccountInfo = {
  subscription?: string
  tokenSource?: string
  apiKeySource?: ApiKeySource
  organization?: string
  email?: string
}

export type OrgValidationResult =
  | { valid: true }
  | { valid: false; message: string }

// ——— API key: sole source is settings.apiKey ———

export function getAnthropicApiKey(): string | null {
  return getSettings_DEPRECATED()?.apiKey ?? null
}

export function getAnthropicApiKeyWithSource(_opts?: {
  skipRetrievingKeyFromApiKeyHelper?: boolean
}): { key: string | null; source: ApiKeySource } {
  const key = getAnthropicApiKey()
  return key ? { key, source: 'settings' } : { key: null, source: 'none' }
}

export function hasAnthropicApiKeyAuth(): boolean {
  return !!getAnthropicApiKey()
}

export function isAnthropicAuthEnabled(): boolean {
  return hasAnthropicApiKeyAuth()
}

export function getAuthTokenSource(): {
  source: ApiKeySource
  hasToken: boolean
} {
  // Auth token source is a separate concept from API key source only when
  // OAuth was the token mechanism. In settings-only mode there is no
  // distinct token source — always report 'none' so callers (status notices,
  // billing) don't mis-report settings.apiKey as two conflicting auth
  // methods.
  return { source: 'none', hasToken: false }
}

// ——— OAuth identity: decoupled, all disabled ———

export function isClaudeAISubscriber(): boolean {
  return false
}

export function getClaudeAIOAuthTokens(): OAuthTokens | null {
  return null
}

export async function getClaudeAIOAuthTokensAsync(): Promise<OAuthTokens | null> {
  return null
}

export function clearOAuthTokenCache(): void {}

export function saveOAuthTokensIfNeeded(_tokens: OAuthTokens): {
  saved: boolean
} {
  return { saved: false }
}

export async function checkAndRefreshOAuthTokenIfNeeded(): Promise<void> {}

export function handleOAuth401Error(): void {}

export function hasProfileScope(): boolean {
  return false
}

export function is1PApiCustomer(): boolean {
  return hasAnthropicApiKeyAuth()
}

export function getOauthAccountInfo(): AccountInfo | undefined {
  return undefined
}

export function isOverageProvisioningAllowed(): boolean {
  return false
}

export function hasOpusAccess(): boolean {
  // No subscription gating — user has whatever access their API key allows.
  return true
}

export function getSubscriptionType(): SubscriptionType | null {
  return null
}

export function isMaxSubscriber(): boolean {
  return false
}

export function isTeamSubscriber(): boolean {
  return false
}

export function isTeamPremiumSubscriber(): boolean {
  return false
}

export function isEnterpriseSubscriber(): boolean {
  return false
}

export function isProSubscriber(): boolean {
  return false
}

export function isConsumerSubscriber(): boolean {
  return false
}

export function getRateLimitTier(): string | null {
  return null
}

export function getSubscriptionName(): string {
  return 'none'
}

export function getAccountInformation(): UserAccountInfo {
  return {
    apiKeySource: getAnthropicApiKey() ? 'settings' : 'none',
  }
}

export async function validateForceLoginOrg(): Promise<OrgValidationResult> {
  return { valid: true }
}

export function isUsing3PServices(): boolean {
  return false
}

// ——— apiKeyHelper (removed) ———

export function getConfiguredApiKeyHelper(): string | undefined {
  return undefined
}

export function calculateApiKeyHelperTTL(): number {
  return 0
}

export function getApiKeyHelperElapsedMs(): number {
  return 0
}

export async function getApiKeyFromApiKeyHelper(
  _isNonInteractiveSession?: boolean,
): Promise<string | null> {
  return null
}

export function getApiKeyFromApiKeyHelperCached(): string | null {
  return null
}

export function clearApiKeyHelperCache(): void {}

export function prefetchApiKeyFromApiKeyHelperIfSafe(
  _isNonInteractiveSession?: boolean,
): void {}

// ——— macOS keychain storage (removed) ———

export const getApiKeyFromConfigOrMacOSKeychain = (): string | null => null

export async function saveApiKey(_apiKey: string): Promise<void> {}

export function isCustomApiKeyApproved(_apiKey: string): boolean {
  return true
}

export async function removeApiKey(): Promise<void> {}

// ——— OTEL header helper (removed) ———

export function isOtelHeadersHelperFromProjectOrLocalSettings(): boolean {
  return false
}

export function getOtelHeadersFromHelper(): Record<string, string> {
  return {}
}

// ——— AWS / GCP auth refresh (no-op; Bedrock/Vertex use SDK-native creds) ———

export function isAwsAuthRefreshFromProjectSettings(): boolean {
  return false
}

export function isAwsCredentialExportFromProjectSettings(): boolean {
  return false
}

export async function refreshAwsAuth(_cmd: string): Promise<boolean> {
  return false
}

export const refreshAndGetAwsCredentials: () => Promise<null> = async () =>
  null

export function clearAwsCredentialsCache(): void {}

export function prefetchAwsCredentialsAndBedRockInfoIfSafe(): void {}

export function isGcpAuthRefreshFromProjectSettings(): boolean {
  return false
}

export async function checkGcpCredentialsValid(): Promise<boolean> {
  return false
}

export async function refreshGcpAuth(_cmd: string): Promise<boolean> {
  return false
}

export const refreshGcpCredentialsIfNeeded: () => Promise<boolean> = async () =>
  true

export function clearGcpCredentialsCache(): void {}

export function prefetchGcpCredentialsIfSafe(): void {}
