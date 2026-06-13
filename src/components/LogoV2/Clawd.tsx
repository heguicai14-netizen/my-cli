import * as React from 'react'
import { useEffect, useState } from 'react'
// BaseText is the raw Ink Text — it accepts arbitrary hex backgroundColor, which
// the half-block renderer needs to paint each cell's lower pixel.
import { Box, BaseText as Text } from '../../ink.js'
import { getInitialSettings } from '../../utils/settings/settings.js'

export type ClawdPose =
  | 'default'
  | 'arms-up' // kept for API compatibility with AnimatedClawd (no longer used)
  | 'look-left'
  | 'look-right'

type Props = {
  pose?: ClawdPose
}

// A tiny robot pet. 8×8 pixel sprite rendered with half-block glyphs (▀ = two
// stacked pixels via fg/bg color), so it's only 4 terminal rows. It bobs and
// blinks (cyan eyes off) so it feels alive.
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
const ROBOT_BLINK = ROBOT_OPEN.with(3, 'MMMMMMMM')

const FRAME_MS = 140
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
  const [reducedMotion] = useState(
    () => getInitialSettings().prefersReducedMotion ?? false,
  )
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => setI(v => (v + 1) % 600), FRAME_MS)
    return () => clearTimeout(t)
  }, [i, reducedMotion])

  const hopUp = !reducedMotion && Math.floor(i / 4) % 6 === 0
  const blink = !reducedMotion && i % 26 < 2
  const sprite = blink ? ROBOT_BLINK : ROBOT_OPEN

  return (
    <Box height={CHAR_ROWS + 1} flexDirection="column" alignItems="center">
      <Box marginTop={hopUp ? 0 : 1} flexShrink={0}>
        {renderSprite(sprite)}
      </Box>
    </Box>
  )
}
