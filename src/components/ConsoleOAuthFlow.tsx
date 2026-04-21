// OAuth flow UI has been removed. This stub is retained so existing
// importers (Onboarding, TeleportError) compile; it renders a static
// message telling the user to configure credentials in settings.json.

import React from 'react'
import { Box, Text } from '../ink.js'

type Props = {
  onDone(): void
  startingMessage?: string
  mode?: 'login' | 'setup-token'
  forceLoginMethod?: 'claudeai' | 'console'
}

export function ConsoleOAuthFlow({ onDone: _onDone }: Props): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Text color="warning">Authentication via OAuth is disabled.</Text>
      <Text dimColor={true}>
        Add an `apiKey` field to ~/.mycli/settings.json and restart.
      </Text>
    </Box>
  )
}
