// OAuth profile fetching has been removed.

import type { OAuthProfileResponse } from 'src/services/oauth/types.js'

export async function getOauthProfileFromApiKey(): Promise<
  OAuthProfileResponse | undefined
> {
  return undefined
}

export async function getOauthProfileFromOauthToken(
  _accessToken: string,
): Promise<OAuthProfileResponse | undefined> {
  return undefined
}
