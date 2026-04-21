import * as React from 'react'
import { useMemo } from 'react'
import { getSdkBetas } from '../../bootstrap/state.js'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalInputTokens,
  getTotalOutputTokens,
} from '../../cost-tracker.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { Text } from '../../ink.js'
import type { Message } from '../../types/message.js'
import {
  calculateContextPercentages,
  getContextWindowForModel,
} from '../../utils/context.js'
import { formatTokens } from '../../utils/format.js'
import { getCurrentUsage } from '../../utils/tokens.js'

type Props = {
  messages: Message[]
}

/**
 * Compact right-side indicator: "ctx 45k/200k · 22% · 132k used".
 *
 * - ctx X/Y (Z%): current thread's context window usage (from the latest
 *   assistant message's API usage). Colors: default under 75%, yellow 75–89%,
 *   red at 90%+ so the user sees pressure approaching before auto-compact.
 * - used: cumulative input + output tokens across the whole session, read
 *   from the cost-tracker totals.
 *
 * Re-renders whenever `messages` changes (same source as the rest of the
 * footer), so the value updates live as turns complete.
 */
function TokenIndicator({ messages }: Props): React.ReactNode {
  const model = useMainLoopModel()

  const { ctxUsed, ctxWindow, ctxPct } = useMemo(() => {
    const window = getContextWindowForModel(model, getSdkBetas())
    const usage = getCurrentUsage(messages)
    const { used } = calculateContextPercentages(usage, window)
    const usedTokens = usage
      ? usage.input_tokens +
        usage.cache_creation_input_tokens +
        usage.cache_read_input_tokens
      : null
    return { ctxUsed: usedTokens, ctxWindow: window, ctxPct: used }
  }, [messages, model])

  const sessionTotal =
    getTotalInputTokens() +
    getTotalOutputTokens() +
    getTotalCacheReadInputTokens() +
    getTotalCacheCreationInputTokens()

  if (ctxUsed === null && sessionTotal === 0) return null

  const pctColor =
    ctxPct === null
      ? undefined
      : ctxPct >= 90
        ? 'red'
        : ctxPct >= 75
          ? 'yellow'
          : undefined

  const parts: React.ReactNode[] = []
  if (ctxUsed !== null) {
    parts.push(
      <Text key="ctx" color={pctColor} dimColor={pctColor === undefined}>
        {`ctx ${formatTokens(ctxUsed)}/${formatTokens(ctxWindow)} · ${ctxPct ?? 0}%`}
      </Text>,
    )
  }
  if (sessionTotal > 0) {
    parts.push(
      <Text key="tot" dimColor>
        {`${formatTokens(sessionTotal)} used`}
      </Text>,
    )
  }

  return (
    <Text wrap="truncate">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Text dimColor> · </Text> : null}
          {p}
        </React.Fragment>
      ))}
    </Text>
  )
}

export default React.memo(TokenIndicator)
