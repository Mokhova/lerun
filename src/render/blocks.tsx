import type { CSSProperties } from 'react'
import type {
  Block,
  CaptionBlock,
  ListBlock,
  QuoteBlock,
  SpacerBlock,
  TextBlock,
} from '../types'
import {
  FIGMA_BLUR,
  FONT_STACK,
  TYPE_SCALE,
  hex,
  rgba,
  type ColorId,
  type TextVariant,
} from '../design/tokens'

/* ------------------------------------------------------------------ shared */

export const typeStyle = (
  variant: TextVariant,
  color: ColorId,
  opts: { alt?: boolean; italic?: boolean; uppercase?: boolean; muted?: boolean } = {}
): CSSProperties => {
  const t = TYPE_SCALE[variant]
  const family = t.family === 'display' ? 'display' : opts.alt ? 'sansAlt' : 'sans'
  return {
    fontFamily: FONT_STACK[family],
    fontSize: t.size,
    lineHeight: `${t.lineHeight}px`,
    fontWeight: t.weight,
    fontStyle: opts.italic ? 'italic' : 'normal',
    textTransform: opts.uppercase ? 'uppercase' : 'none',
    color: hex(color),
    opacity: opts.muted ? 0.5 : 1,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    margin: 0,
  }
}

/* -------------------------------------------------------------------- text */

function TextView({ block }: { block: TextBlock }) {
  return (
    <div
      style={{
        ...typeStyle(block.variant, block.color, block),
        textAlign: block.align,
        width: '100%',
      }}
    >
      {block.text || ' '}
    </div>
  )
}

/* -------------------------------------------------------------------- list */

/** The ✷ marker of the Figma `icon` component: a six-spoked asterisk, 28×32. */
const StarMarker = ({ color }: { color: string }) => (
  <svg width={28} height={32} viewBox="0 0 28 32" aria-hidden style={{ display: 'block' }}>
    <g fill={color}>
      {[0, 60, 120].map((angle) => (
        <rect
          key={angle}
          x="11.9"
          y="3"
          width="4.2"
          height="26"
          rx="2.1"
          transform={`rotate(${angle} 14 16)`}
        />
      ))}
    </g>
  </svg>
)

function ListView({ block }: { block: ListBlock }) {
  const body = typeStyle('body', block.color)
  if (block.style === 'numbered') {
    return (
      <div style={{ width: '100%' }}>
        {block.showHeader && block.header ? (
          <div style={{ ...typeStyle('display', block.color), paddingBottom: 60 }}>
            {block.header}
          </div>
        ) : null}
        {block.items.map((it, i) => (
          <div
            key={it.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              paddingBottom: i === block.items.length - 1 ? 0 : 88,
            }}
          >
            <div style={{ ...typeStyle('display', block.accent), paddingLeft: 2 }}>
              {it.title}
            </div>
            <div style={body}>{it.text}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {block.showHeader && block.header ? (
        <div style={{ ...typeStyle('display', block.color), paddingBottom: 60 }}>
          {block.header}
        </div>
      ) : null}
      {block.items.map((it, i) => (
        <div
          key={it.id}
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            paddingBottom: i === block.items.length - 1 ? 0 : 32,
          }}
        >
          {block.marker === 'star' ? (
            <div style={{ paddingTop: 14, flex: '0 0 auto' }}>
              <StarMarker color={hex(block.accent)} />
            </div>
          ) : (
            <div
              style={{
                ...typeStyle('body', block.accent),
                fontWeight: 900,
                lineHeight: '46px',
                flex: '0 0 auto',
                width: 17,
              }}
            >
              •
            </div>
          )}
          <div style={{ ...body, flex: 1 }}>{it.text}</div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------- quote */

function QuoteView({ block }: { block: QuoteBlock }) {
  const center: CSSProperties = { textAlign: 'center', width: '100%' }

  // the plain styles read as one sentence, so the three slots are joined
  const joined = [block.before, block.display, block.after]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')

  if (block.style === 'topLeft') {
    return (
      <div style={{ ...typeStyle('h2', block.color), textAlign: 'left', width: '100%' }}>
        {joined}
      </div>
    )
  }
  if (block.style === 'center') {
    return <div style={{ ...typeStyle('h1', block.color), ...center }}>{joined}</div>
  }
  if (block.style === 'centerDisplay') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...center }}>
        {block.before ? (
          <div style={{ ...typeStyle('h2', block.color), ...center }}>{block.before}</div>
        ) : null}
        {block.display ? (
          <div style={{ ...typeStyle('display', block.accent), ...center }}>
            {block.display}
          </div>
        ) : null}
        {block.after ? (
          <div style={{ ...typeStyle('h2', block.color), ...center }}>{block.after}</div>
        ) : null}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, ...center }}>
      {block.before ? (
        <div style={{ ...typeStyle('h3', block.color), ...center }}>{block.before}</div>
      ) : null}
      {block.display ? (
        <div style={{ ...typeStyle('display', block.accent), ...center }}>{block.display}</div>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------------- caption */

/** The speech-bubble tail from the Figma `photo caption` component (506×110). */
const BUBBLE_TAIL =
  'M 37.54764175415039 109 C 140.57332229614258 109 292.61123847961426 123.86927795410156 280.6082458496094 0 C 311.61597442626953 123.86927795410156 417.14225006103516 109 480.157958984375 109 C 662.20263671875 109 -185.00812911987305 109 37.54764175415039 109 Z'

const captionText = (block: CaptionBlock): CSSProperties => ({
  fontFamily: FONT_STACK.sans,
  fontSize: 44,
  lineHeight: '48px',
  fontWeight: 700,
  color: hex(block.color),
  textAlign: 'center',
  whiteSpace: 'pre-wrap',
  margin: 0,
})

function CaptionView({
  block,
  bleed,
  bottomPad,
}: {
  block: CaptionBlock
  /** how far the content box is inset from the slide edge (120 in the layout) */
  bleed: number
  bottomPad: number
}) {
  if (block.style === 'card') {
    return (
      <div
        style={{
          width: `calc(100% + 80px)`,
          marginLeft: -40,
          background: hex(block.surface),
          borderRadius: 72,
          padding: '64px 64px 80px',
          boxSizing: 'border-box',
        }}
      >
        <div style={captionText(block)}>{block.text}</div>
      </div>
    )
  }

  if (block.style === 'shadow') {
    // Figma: 1080×280 rect at (-120, -68), radial #E2E3E8 solid to 50 %, layer blur 76
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -bleed,
            right: -bleed,
            top: -68,
            bottom: -68,
            background:
              'radial-gradient(50% 50% at 50% 50%, #E2E3E8 0%, #E2E3E8 50%, rgba(226,227,232,0) 100%)',
            filter: `blur(${Math.round(76 * FIGMA_BLUR)}px)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ ...captionText(block), position: 'relative' }}>{block.text}</div>
      </div>
    )
  }

  if (block.style === 'bubble') {
    const surface = hex(block.surface)
    return (
      <div
        style={{
          position: 'relative',
          width: `calc(100% + ${bleed * 2}px)`,
          marginLeft: -bleed,
          marginBottom: -bottomPad,
          background: surface,
          padding: `72px ${bleed}px ${bottomPad}px`,
          boxSizing: 'border-box',
        }}
      >
        <svg
          aria-hidden
          width={506}
          height={110}
          viewBox="0 0 506 110"
          style={{ position: 'absolute', left: 350, top: -109, display: 'block' }}
        >
          <path d={BUBBLE_TAIL} fill={surface} />
        </svg>
        <div style={captionText(block)}>{block.text}</div>
      </div>
    )
  }

  return <div style={{ ...captionText(block), width: '100%' }}>{block.text}</div>
}

/* ---------------------------------------------------------------- dispatch */

export function BlockView({
  block,
  bleed,
  bottomPad,
}: {
  block: Block
  bleed: number
  bottomPad: number
}) {
  switch (block.type) {
    case 'text':
      return <TextView block={block} />
    case 'list':
      return <ListView block={block} />
    case 'quote':
      return <QuoteView block={block} />
    case 'caption':
      return <CaptionView block={block} bleed={bleed} bottomPad={bottomPad} />
    case 'spacer':
      return <div style={{ height: (block as SpacerBlock).size, width: '100%' }} />
  }
}

export const mutedInk = (color: ColorId) => rgba(hex(color), 0.5)
