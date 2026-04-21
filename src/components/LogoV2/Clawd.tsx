import * as React from 'react'
import { Box, Text } from '../../ink.js'

export type ClawdPose =
  | 'default'
  | 'arms-up' // both arms raised (used during jump)
  | 'look-left' // both pupils shifted left
  | 'look-right' // both pupils shifted right

type Props = {
  pose?: ClawdPose
}

// Doraemon-style mascot — round head drawn with box-drawing corners so the
// silhouette reads as circular at 3×9. The top row carries raised arms
// during the jump animation; the middle row holds the face; the bottom row
// is the collar with the iconic bell.
function eyesFor(pose: ClawdPose): { left: string; right: string } {
  switch (pose) {
    case 'look-left':
      return { left: '◐', right: '◐' }
    case 'look-right':
      return { left: '◑', right: '◑' }
    case 'arms-up':
      return { left: '◉', right: '◉' }
    default:
      return { left: '●', right: '●' }
  }
}

export function Clawd({ pose = 'default' }: Props): React.ReactNode {
  const { left, right } = eyesFor(pose)
  const topRow = pose === 'arms-up' ? '\\╭─────╮/' : ' ╭─────╮ '
  const faceRow = ` │ ${left}ω${right} │ `
  const bellRow = ' ╰──◯──╯ '
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="clawd_body">{topRow}</Text>
      <Text color="clawd_body">{faceRow}</Text>
      <Text color="clawd_body">{bellRow}</Text>
    </Box>
  )
}
