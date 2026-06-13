/**
 * /reload-skills — re-scan skill directories and activate skill changes in the
 * current session without restarting. Mirrors /reload-plugins (Layer-3 refresh)
 * but targets user/project/managed skill dirs. Implementation lazy-loaded.
 */
import type { Command } from '../../commands.js'

const reloadSkills = {
  type: 'local',
  name: 'reload-skills',
  description:
    'Re-scan skill directories and activate skill changes in the current session',
  supportsNonInteractive: false,
  load: () => import('./reload-skills.js'),
} satisfies Command

export default reloadSkills
