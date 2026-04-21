// OAuth client has been removed. Functions remain as no-op stubs so existing
// importers keep compiling; real auth happens via settings.json apiKey.

import type { AccountInfo } from '../../utils/config.js'
import type {
  OAuthProfileResponse,
  OAuthTokenExchangeResponse,
  OAuthTokens,
  SubscriptionType,
} from './types.js'

export function shouldUseClaudeAIAuth(_scopes: string[] | undefined): boolean {
  return false
}

export function parseScopes(_scopeString?: string): string[] {
  return []
}

export function buildAuthUrl(_opts: Record<string, unknown>): string {
  return ''
}

export async function exchangeCodeForTokens(
  _code: string,
  _codeVerifier: string,
  _redirectUri: string,
  _loginMethod?: string,
): Promise<OAuthTokenExchangeResponse> {
  throw new Error(
    'OAuth is disabled. Configure `apiKey` in ~/.mycli/settings.json instead.',
  )
}

export async function refreshOAuthToken(
  _refreshToken: string,
): Promise<OAuthTokens | null> {
  return null
}

export async function fetchAndStoreUserRoles(): Promise<void> {}

export async function createAndStoreApiKey(
  _accessToken: string,
): Promise<string | null> {
  return null
}

export function isOAuthTokenExpired(_expiresAt: number | null): boolean {
  return true
}

export async function fetchProfileInfo(_accessToken: string): Promise<{
  subscriptionType: SubscriptionType | null
  account: AccountInfo | null
  [key: string]: unknown
}> {
  return { subscriptionType: null, account: null }
}

export async function getOrganizationUUID(): Promise<string | null> {
  return null
}

export async function populateOAuthAccountInfoIfNeeded(): Promise<boolean> {
  return false
}

export function storeOAuthAccountInfo(
  _account: Record<string, unknown>,
): void {}
