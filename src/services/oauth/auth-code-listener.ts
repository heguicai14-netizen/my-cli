// OAuth callback listener has been removed.

export class AuthCodeListener {
  constructor(_callbackPath: string = '/callback') {}

  async listen(): Promise<{ code: string; port: number }> {
    throw new Error('OAuth callback listener is disabled.')
  }

  close(): void {}

  getPort(): number | null {
    return null
  }
}
