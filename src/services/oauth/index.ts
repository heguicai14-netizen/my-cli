// OAuth flows have been removed. This stub keeps the `OAuthService` export so
// existing importers (login command, remote bridge, print handler) compile —
// all methods throw at call time, matching the reality that OAuth is disabled.

class OAuthDisabledError extends Error {
  constructor() {
    super(
      'OAuth is disabled. Configure `apiKey` in ~/.mycli/settings.json instead.',
    )
    this.name = 'OAuthDisabledError'
  }
}

export class OAuthService {
  constructor() {}

  async startOAuthFlow(
    _authURLHandler: (url: string, automaticUrl?: string) => Promise<void>,
    _options?: Record<string, unknown>,
  ): Promise<never> {
    throw new OAuthDisabledError()
  }

  async startSetupToken(
    _authURLHandler: (url: string, automaticUrl?: string) => Promise<void>,
    _options?: Record<string, unknown>,
  ): Promise<never> {
    throw new OAuthDisabledError()
  }

  provideManualAuthCode(_code: string): void {}

  cancel(): void {}

  getCallbackPort(): number | null {
    return null
  }
}
