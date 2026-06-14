import * as React from 'react'
// BaseText is the raw Ink Text — it accepts arbitrary hex backgroundColor, which
// the half-block renderer needs to paint each cell's lower pixel.
import { Box, BaseText as Text } from '../../ink.js'

export type ClawdPose =
  | 'default'
  | 'arms-up' // kept for API compatibility with AnimatedClawd (no longer used)
  | 'look-left'
  | 'look-right'

type Props = {
  pose?: ClawdPose
}

// A tiny robot pet. 8×8 pixel sprite rendered with half-block glyphs (▀ = two
// stacked pixels via fg/bg color), so it's only 4 terminal rows.
//
// Rendered STATICALLY — do NOT add an animation timer here. A per-frame
// setState loop re-renders the whole live region ~7×/s forever; since this logo
// anchors the top of Ink's managed region, every tick yanks the terminal
// viewport back to the welcome screen and makes scrollback unusable.
const PAL: Record<string, string | undefined> = {
  M: '#9AA7B0', // metal body
  m: '#C6D0D6', // light metal (highlight)
  x: '#6B7780', // dark metal (edge)
  L: '#4FE0E0', // cyan eyes
  '.': undefined,
}

const ROBOT_OPEN = [
  '...M....',
  '..mmmm..',
  '.MMMMMM.',
  'MLMMMMLM',
  'MMMMMMMM',
  'M.M..M.M',
  '.MMMMMM.',
  '.x....x.',
]
const CHAR_ROWS = ROBOT_OPEN.length / 2 // 4

type Cell = { ch: string; fg?: string; bg?: string }
function cellOf(top: string, bot: string): Cell {
  const t = PAL[top]
  const b = PAL[bot]
  if (!t && !b) return { ch: ' ' }
  if (t && !b) return { ch: '▀', fg: t }
  if (!t && b) return { ch: '▄', fg: b }
  return { ch: '▀', fg: t, bg: b }
}

function renderSprite(rows: string[]): React.ReactNode {
  const charRows: React.ReactNode[] = []
  for (let r = 0; r < rows.length; r += 2) {
    const top = rows[r] ?? ''
    const bot = rows[r + 1] ?? ''
    const width = Math.max(top.length, bot.length)
    const spans: Array<Cell & { n: number }> = []
    for (let c = 0; c < width; c++) {
      const cell = cellOf(top[c] ?? '.', bot[c] ?? '.')
      const last = spans[spans.length - 1]
      if (last && last.ch === cell.ch && last.fg === cell.fg && last.bg === cell.bg)
        last.n++
      else spans.push({ ...cell, n: 1 })
    }
    charRows.push(
      <Box key={r}>
        {spans.map((s, j) => (
          <Text key={j} color={s.fg} backgroundColor={s.bg}>
            {s.ch.repeat(s.n)}
          </Text>
        ))}
      </Box>,
    )
  }
  return <Box flexDirection="column">{charRows}</Box>
}

export function Clawd(_props: Props): React.ReactNode {
  return (
    <Box height={CHAR_ROWS + 1} flexDirection="column" alignItems="center">
      <Box marginTop={1} flexShrink={0}>
        {renderSprite(ROBOT_OPEN)}
      </Box>
    </Box>
  )
}
