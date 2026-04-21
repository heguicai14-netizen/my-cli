// File-descriptor token passing (used by Homespace / CCR managed sessions)
// is no longer supported. Credentials flow exclusively through settings.json.

const CCR_TOKEN_DIR = '/home/claude/.mycli/remote'
export const CCR_OAUTH_TOKEN_PATH = `${CCR_TOKEN_DIR}/.oauth_token`
export const CCR_API_KEY_PATH = `${CCR_TOKEN_DIR}/.api_key`
export const CCR_SESSION_INGRESS_TOKEN_PATH = `${CCR_TOKEN_DIR}/.session_ingress_token`

export function maybePersistTokenForSubprocesses(
  _token: string,
  _path: string,
): void {}

export function readTokenFromWellKnownFile(_path: string): string | null {
  return null
}

export function getOAuthTokenFromFileDescriptor(): string | null {
  return null
}

export function getApiKeyFromFileDescriptor(): string | null {
  return null
}
