import { clearCommandsCache } from '../../commands.js'
import { getSkillDirCommands } from '../../skills/loadSkillsDir.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getCwd } from '../../utils/cwd.js'
import { plural } from '../../utils/stringUtils.js'

export const call: LocalCommandCall = async (_args, _context) => {
  // Drop every memoized command/skill listing (clearCommandsCache internally
  // calls clearSkillCaches) so the next access re-reads disk, then eagerly
  // re-scan the current directory's skill dirs to (a) surface the new count
  // immediately and (b) make the updated skills available this turn.
  clearCommandsCache()
  const skills = await getSkillDirCommands(getCwd())
  const count = skills.length

  return {
    type: 'text',
    value: `Reloaded ${count} ${plural(count, 'skill')} from skill directories.`,
  }
}
