import { homedir } from 'os'
import { join } from 'path'
import type { LocalCommandCall } from '../../types/command.js'
import { getCwd } from '../../utils/cwd.js'
import { setCwd } from '../../utils/Shell.js'

export const call: LocalCommandCall = async (args, _context) => {
  const target = args.trim()
  if (!target) {
    return {
      type: 'text',
      value: `Current directory: ${getCwd()}\nUsage: /cd <path>`,
    }
  }

  // Expand a leading ~ to the home directory (the shell isn't involved here).
  const expanded =
    target === '~' || target.startsWith('~/')
      ? join(homedir(), target.slice(1))
      : target

  try {
    // setCwd resolves a relative path against the current session cwd, follows
    // symlinks, and throws a friendly error if the target doesn't exist. It
    // updates the session cwd state only — the conversation/messages are
    // untouched, so the prompt cache is preserved. The change persists across
    // turns because the REPL re-reads getCwd() on each turn.
    setCwd(expanded, getCwd())
  } catch (e) {
    return {
      type: 'text',
      value: `cd failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  return { type: 'text', value: `Working directory changed to: ${getCwd()}` }
}
