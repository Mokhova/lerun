import { useMemo } from 'react'
import type { NoiseStyle } from '../types'
import { noiseTile, SHEEN } from '../design/noise'

/**
 * Full-bleed, fixed to the card, never interactive — exactly like the `noise`
 * component in Figma, which sits on top of everything else on the slide.
 */
export function Noise({
  style,
  intensity,
}: {
  style: NoiseStyle
  intensity: number
}) {
  const tile = useMemo(
    () => (style === 'none' ? '' : noiseTile(style, intensity)),
    [style, intensity]
  )
  if (style === 'none') return null
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: SHEEN[style],
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${tile})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
