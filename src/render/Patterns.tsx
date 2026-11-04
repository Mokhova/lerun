import type { PatternInstance } from '../types'
import { PATTERN_BY_ID, STROKE_WIDTH } from '../design/patterns'
import { FIGMA_BLUR, hex, PATTERN_DEFAULT } from '../design/tokens'

export const BLUR_SCALE = FIGMA_BLUR

export const patternColor = (p: PatternInstance) =>
  p.color === 'brand' ? PATTERN_DEFAULT : hex(p.color)

export function patternBox(p: PatternInstance) {
  const def = PATTERN_BY_ID[p.pattern]
  const pad = STROKE_WIDTH / 2 + p.blur * BLUR_SCALE * 3
  const w = (def.width + pad * 2) * p.scale
  const h = (def.height + pad * 2) * p.scale
  return { def, pad, w, h, left: p.x - w / 2, top: p.y - h / 2 }
}

export function PatternShape({ p }: { p: PatternInstance }) {
  const { def, pad, w, h, left, top } = patternBox(p)
  return (
    <svg
      aria-hidden
      width={w}
      height={h}
      viewBox={`${-pad} ${-pad} ${def.width + pad * 2} ${def.height + pad * 2}`}
      style={{
        position: 'absolute',
        left,
        top,
        overflow: 'visible',
        transform: `rotate(${p.rotation}deg) scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})`,
        transformOrigin: 'center',
        filter: p.blur > 0 ? `blur(${p.blur * BLUR_SCALE * p.scale}px)` : undefined,
        opacity: p.opacity,
        pointerEvents: 'none',
      }}
    >
      <path
        d={def.d}
        fill="none"
        stroke={patternColor(p)}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PatternLayer({ patterns }: { patterns: PatternInstance[] }) {
  if (!patterns.length) return null
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {patterns.map((p) => (
        <PatternShape key={p.id} p={p} />
      ))}
    </div>
  )
}
