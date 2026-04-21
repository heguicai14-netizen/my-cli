import chalk from 'chalk'
import { getSdkBetas } from '../../bootstrap/state.js'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalInputTokens,
  getTotalOutputTokens,
} from '../../cost-tracker.js'
import type { LocalCommandCall } from '../../types/command.js'
import {
  calculateContextPercentages,
  getContextWindowForModel,
} from '../../utils/context.js'
import { formatTokens } from '../../utils/format.js'
import { getMainLoopModel, renderModelName } from '../../utils/model/model.js'
import { getCurrentUsage, getTokenUsage } from '../../utils/tokens.js'

function pad(label: string, width: number): string {
  return label.padEnd(width, ' ')
}

export const call: LocalCommandCall = async (_args, context) => {
  const model = getMainLoopModel()
  const contextWindow = getContextWindowForModel(model, getSdkBetas())
  const messages = context.messages ?? []
  const currentUsage = getCurrentUsage(messages)
  const { used: usedPct, remaining: remainingPct } = calculateContextPercentages(
    currentUsage,
    contextWindow,
  )

  const usedTokens = currentUsage
    ? currentUsage.input_tokens +
      currentUsage.cache_creation_input_tokens +
      currentUsage.cache_read_input_tokens
    : null
  const remainingTokens = usedTokens === null ? null : Math.max(0, contextWindow - usedTokens)

  const totalInput = getTotalInputTokens()
  const totalOutput = getTotalOutputTokens()
  const totalCacheRead = getTotalCacheReadInputTokens()
  const totalCacheCreate = getTotalCacheCreationInputTokens()
  const sessionAllZero =
    totalInput + totalOutput + totalCacheRead + totalCacheCreate === 0

  const label = 14
  const lines: string[] = []

  lines.push(chalk.bold('Session tokens'))
  lines.push(`  ${pad('Input:', label)}${formatTokens(totalInput)}`)
  lines.push(`  ${pad('Output:', label)}${formatTokens(totalOutput)}`)
  lines.push(`  ${pad('Cache read:', label)}${formatTokens(totalCacheRead)}`)
  lines.push(`  ${pad('Cache write:', label)}${formatTokens(totalCacheCreate)}`)
  lines.push('')
  lines.push(
    chalk.bold(
      `Context window (${renderModelName(model)} · ${formatTokens(contextWindow)})`,
    ),
  )
  if (usedTokens === null || remainingTokens === null) {
    lines.push(chalk.dim('  No usage reported by the last assistant turn yet.'))
  } else {
    lines.push(
      `  ${pad('Used:', label)}${formatTokens(usedTokens)} / ${formatTokens(contextWindow)}  (${usedPct ?? 0}%)`,
    )
    lines.push(
      `  ${pad('Free:', label)}${formatTokens(remainingTokens)}  (${remainingPct ?? 100}%)`,
    )
  }

  // Diagnostics: when everything looks empty, surface why so the user can
  // tell apart "no API turns yet" from "provider returned no usage".
  if (sessionAllZero || usedTokens === null) {
    const assistantCount = messages.filter(m => m?.type === 'assistant').length
    const lastAssistant = [...messages]
      .reverse()
      .find(m => m?.type === 'assistant')
    const lastRawUsage = lastAssistant ? getTokenUsage(lastAssistant) : undefined
    lines.push('')
    lines.push(chalk.dim('Diagnostics:'))
    lines.push(chalk.dim(`  Assistant messages in thread: ${assistantCount}`))
    lines.push(
      chalk.dim(
        `  Last assistant message has usage field: ${lastRawUsage ? 'yes' : 'no'}`,
      ),
    )
    if (lastRawUsage) {
      lines.push(
        chalk.dim(
          `    input=${lastRawUsage.input_tokens ?? 0} output=${lastRawUsage.output_tokens ?? 0} ` +
            `cache_read=${lastRawUsage.cache_read_input_tokens ?? 0} ` +
            `cache_create=${lastRawUsage.cache_creation_input_tokens ?? 0}`,
        ),
      )
    }
    if (sessionAllZero && assistantCount > 0 && !lastRawUsage) {
      lines.push(
        chalk.dim(
          '  → The provider responded but omitted `usage` from the stream.',
        ),
      )
      lines.push(
        chalk.dim(
          '    Anthropic-compatible proxies (Kimi, OpenRouter, etc.) sometimes skip it.',
        ),
      )
    }
  }

  return { type: 'text', value: lines.join('\n') }
}
