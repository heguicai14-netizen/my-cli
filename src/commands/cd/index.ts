/**
 * /cd — move this session to a different working directory without restarting.
 * The conversation history and prompt cache are preserved; only the session
 * cwd changes (the REPL re-reads getCwd() each turn, and the Bash tool prepends
 * `cd <cwd>` so shell commands follow). Implementation lazy-loaded.
 */
import type { Command } from '../../commands.js'

const cd = {
  type: 'local',
  name: 'cd',
  description:
    'Move this session to a different working directory (keeps conversation + prompt cache)',
  supportsNonInteractive: false,
  load: () => import('./cd.js'),
} satisfies Command

export default cd
