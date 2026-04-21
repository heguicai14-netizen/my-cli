/**
 * Tokens command — shows session-wide token totals and current context
 * window usage (used vs remaining) for the active model.
 * Implementation is lazy-loaded from tokens.ts to keep startup lean.
 */
import type { Command } from '../../commands.js'

const tokens = {
  type: 'local',
  name: 'tokens',
  description: 'Show tokens used this session and remaining context window',
  supportsNonInteractive: true,
  load: () => import('./tokens.js'),
} satisfies Command

export default tokens
