import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { Distribute, Project, Slide } from '../types'
import { FONT_STACK, FORMATS, contentBox, hex, isDark, rgba } from '../design/tokens'
import { BlockView } from './blocks'
import { Noise } from './Noise'
import { PatternLayer } from './Patterns'
import { PhotoLayer } from './PhotoLayer'

const JUSTIFY: Record<Distribute, CSSProperties['justifyContent']> = {
  top: 'flex-start',
  center: 'center',
  between: 'space-between',
  bottom: 'flex-end',
}

export type SlideViewProps = {
  slide: Slide
  project: Project
  /** selection outlines + click targets; off for export and thumbnails */
  interactive?: boolean
  showGuides?: boolean
  selectedBlockId?: string | null
  /** block currently being dragged on the canvas — shown ghosted */
  dimBlockId?: string | null
  selectedPatternId?: string | null
  onSelectBlock?: (id: string | null) => void
  onOverflow?: (px: number) => void
  children?: React.ReactNode
}

export function SlideView({
  slide,
  project,
  interactive = false,
  showGuides = false,
  selectedBlockId = null,
  dimBlockId = null,
  onSelectBlock,
  onOverflow,
  children,
}: SlideViewProps) {
  const format = FORMATS[project.format]
  const box = contentBox(format)
  const bg = hex(slide.bg)
  const contentRef = useRef<HTMLDivElement>(null)

  const back = slide.patterns.filter((p) => !p.front)
  const front = slide.patterns.filter((p) => p.front)

  /**
   * scrollHeight counts glyph overflow (our line-heights are tighter than the
   * font size by design), so measure the real flow height instead: the sum of
   * the children's margin boxes plus the gaps.
   */
  const measure = () => {
    const el = contentRef.current
    if (!el || !onOverflow) return
    const kids = Array.from(el.children) as HTMLElement[]
    let total = 0
    kids.forEach((kid, i) => {
      const cs = getComputedStyle(kid)
      total += kid.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
      if (i > 0) total += slide.gap
    })
    onOverflow(Math.max(0, Math.round(total - el.clientHeight)))
  }

  useLayoutEffect(measure)
  useEffect(() => {
    if (!onOverflow || !contentRef.current) return
    const ro = new ResizeObserver(measure)
    ro.observe(contentRef.current)
    for (const child of Array.from(contentRef.current.children)) ro.observe(child)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, project.format])

  const footerInk = isDark(bg) ? rgba('#FFFFFF', 0.5) : rgba('#101820', 0.5)

  return (
    <div
      data-slide-root
      style={{
        position: 'relative',
        width: format.width,
        height: format.height,
        background: bg,
        overflow: 'hidden',
        flex: '0 0 auto',
        userSelect: interactive ? 'none' : undefined,
      }}
      onMouseDown={interactive ? () => onSelectBlock?.(null) : undefined}
    >
      {slide.photo ? <PhotoLayer photo={slide.photo} format={format} /> : null}

      <PatternLayer patterns={back} />

      <div
        ref={contentRef}
        style={{
          position: 'absolute',
          left: format.padding.left,
          top: format.padding.top,
          width: box.width,
          height: box.height,
          display: 'flex',
          flexDirection: 'column',
          gap: slide.gap,
          justifyContent: JUSTIFY[slide.distribute],
          alignItems: 'stretch',
        }}
      >
        {slide.blocks.map((block) => (
          <div
            key={block.id}
            data-block-id={block.id}
            onMouseDown={
              interactive
                ? (e) => {
                    e.stopPropagation()
                    onSelectBlock?.(block.id)
                  }
                : undefined
            }
            style={{
              position: 'relative',
              cursor: interactive ? 'pointer' : undefined,
              outline:
                interactive && selectedBlockId === block.id
                  ? '3px solid rgba(154,98,235,0.9)'
                  : undefined,
              outlineOffset: 10,
              borderRadius: 4,
              opacity: dimBlockId === block.id ? 0.35 : 1,
            }}
          >
            <BlockView
              block={block}
              bleed={format.padding.left}
              bottomPad={format.padding.bottom}
            />
          </div>
        ))}
      </div>

      <PatternLayer patterns={front} />

      <Noise style={slide.noise} intensity={slide.noiseIntensity} />

      {slide.showFooter && project.footerText ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: format.footerTop,
            textAlign: 'center',
            fontFamily: FONT_STACK.sans,
            fontWeight: 400,
            fontSize: 32,
            lineHeight: '32px',
            color: footerInk,
            pointerEvents: 'none',
          }}
        >
          {project.footerText}
        </div>
      ) : null}

      {showGuides ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: format.padding.left,
            top: format.padding.top,
            width: box.width,
            height: box.height,
            border: '2px dashed rgba(154,98,235,0.55)',
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {children}
    </div>
  )
}
