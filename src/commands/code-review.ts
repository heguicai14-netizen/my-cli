import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.js'
import type { Command } from '../commands.js'

// Both commands review the LOCAL diff (working tree, else current branch) and
// default to report-only. Passing --fix lets the model apply the changes with
// the Edit/Write tools. This keeps behavior predictable: nothing in the user's
// working tree is modified unless they explicitly ask with --fix.
function parseFix(args: string): { fix: boolean; rest: string } {
  const tokens = args.split(/\s+/).filter(Boolean)
  const fix = tokens.includes('--fix')
  const rest = tokens.filter(t => t !== '--fix').join(' ')
  return { fix, rest }
}

const DIFF_PREAMBLE = `Determine the diff to review:
      - Run \`git diff HEAD\` to see all uncommitted changes (staged + unstaged).
      - If that is empty, find the default branch (try \`git symbolic-ref refs/remotes/origin/HEAD\`, else main/master) and run \`git diff <default-branch>...HEAD\` to review this branch's commits.
      - If still empty, tell the user there is nothing to review and stop.
      Read the changed files (and nearby code) as needed for context.`

const CODE_REVIEW_PROMPT = (fix: boolean, rest: string) => `
      You are an expert code reviewer. Review the LOCAL changes in this repository.

      1. ${DIFF_PREAMBLE}
      2. Review the changes, in priority order:
         - Correctness bugs: logic errors, unhandled edge cases, error handling, race conditions, resource leaks, security issues.
         - Convention violations vs the surrounding code.
         - Reuse / simplification / efficiency opportunities.
      3. Report findings grouped by severity (Bugs → Conventions → Cleanups). For each: \`file:line\`, what's wrong, and a concrete suggested fix.

      ${
        fix
          ? `4. After reporting, APPLY the fixes you are confident about using the Edit/Write tools. Make minimal, surgical edits that match the surrounding style. Do NOT change anything you're unsure about — list those separately under "Needs your call". After editing, briefly summarize what you changed.`
          : `4. Do NOT modify any files — this is a report only. Tell the user they can re-run with \`--fix\` to apply the confident fixes.`
      }

      Be concise but thorough.${rest ? `\n\n      Extra instructions: ${rest}` : ''}
    `

const SIMPLIFY_PROMPT = (fix: boolean, rest: string) => `
      You are doing a cleanup-only review of the LOCAL changes — QUALITY ONLY, not bug-hunting.

      1. ${DIFF_PREAMBLE}
      2. Look ONLY for: code reuse (remove duplication), simplification (less/clearer code), efficiency (avoid needless work), and altitude (right level of abstraction). Do NOT change behavior and do NOT hunt for bugs — use /code-review for that.
      3. Report each opportunity with \`file:line\` and the suggested change.

      ${
        fix
          ? `4. Then APPLY the cleanups directly with the Edit/Write tools. Edits MUST be behavior-preserving, minimal, and match the surrounding style. After editing, summarize what you changed.`
          : `4. Do NOT modify any files — report only. Tell the user they can re-run with \`--fix\` to apply.`
      }

      Be concise.${rest ? `\n\n      Extra instructions: ${rest}` : ''}
    `

const codeReview: Command = {
  type: 'prompt',
  name: 'code-review',
  description:
    'Review the local diff for correctness bugs + cleanups (report-only; pass --fix to apply)',
  progressMessage: 'reviewing local changes',
  contentLength: 0,
  source: 'builtin',
  async getPromptForCommand(args): Promise<ContentBlockParam[]> {
    const { fix, rest } = parseFix(args)
    return [{ type: 'text', text: CODE_REVIEW_PROMPT(fix, rest) }]
  },
}

const simplify: Command = {
  type: 'prompt',
  name: 'simplify',
  description:
    'Cleanup-only review of the local diff — reuse/simplification/efficiency (report-only; pass --fix to apply)',
  progressMessage: 'reviewing local changes for cleanups',
  contentLength: 0,
  source: 'builtin',
  async getPromptForCommand(args): Promise<ContentBlockParam[]> {
    const { fix, rest } = parseFix(args)
    return [{ type: 'text', text: SIMPLIFY_PROMPT(fix, rest) }]
  },
}

export default codeReview
export { simplify }
