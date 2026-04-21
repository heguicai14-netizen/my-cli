import { stat, symlink } from 'fs/promises'
import { join } from 'path'
import { logForDebugging } from '../debug.js'
import { getErrnoCode } from '../errors.js'

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT' || code === 'ENOTDIR') return false
    throw e
  }
}

/**
 * Upstream Claude Code plugins/marketplaces ship with a `.claude-plugin/`
 * directory. This fork hardcodes `.mycli-plugin/` everywhere. If a freshly
 * cloned repo only has the upstream name, expose it under the fork name via
 * a relative symlink so the rest of the code keeps working unchanged.
 *
 * Idempotent and silent when both or neither directory is present.
 */
export async function normalizeClaudePluginDir(rootDir: string): Promise<void> {
  const mycliDir = join(rootDir, '.mycli-plugin')
  const claudeDir = join(rootDir, '.claude-plugin')

  if (await dirExists(mycliDir)) return
  if (!(await dirExists(claudeDir))) return

  try {
    await symlink('.claude-plugin', mycliDir, 'dir')
    logForDebugging(
      `Linked ${mycliDir} → .claude-plugin for upstream Claude Code plugin compatibility`,
    )
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'EEXIST') return
    throw e
  }
}
