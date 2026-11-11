import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEditor, useSlide } from '../store/useEditor'
import { FORMATS } from '../design/tokens'
import { SlideView } from '../render/SlideView'
import { patternBox } from '../render/Patterns'
import { PATTERN_BY_ID } from '../design/patterns'
import { importPhoto } from '../lib/image'

type Drag =
  | { kind: 'pan'; startX: number; startY: number; ox: number; oy: number; moved: boolean }
  | { kind: 'block'; id: string; from: number; startY: number; moved: boolean }
  | { kind: 'pattern'; id: string; startX: number; startY: number; ox: number; oy: number; moved: boolean }

export function Canvas() {
  const slide = useSlide()
  const project = useEditor((s) => s.project)
  const sel = useEditor((s) => s.sel)
  const zoom = useEditor((s) => s.zoom)
  const showGuides = useEditor((s) => s.showGuides)
  const overflow = useEditor((s) => s.overflow[s.sel.slideId] ?? 0)
  const selectBlock = useEditor((s) => s.selectBlock)
  const selectPattern = useEditor((s) => s.selectPattern)
  const setZoom = useEditor((s) => s.setZoom)
  const reportOverflow = useEditor((s) => s.reportOverflow)
  const dropPhoto = useEditor((s) => s.dropPhoto)
  const updatePhoto = useEditor((s) => s.updatePhoto)
  const moveBlockTo = useEditor((s) => s.moveBlockTo)
  const updatePattern = useEditor((s) => s.updatePattern)
  const fileRef = useRef<HTMLInputElement>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0.5)
  const [dropping, setDropping] = useState(false)
  const [drop, setDrop] = useState<{ index: number; y: number } | null>(null)
  const [heldBlock, setHeldBlock] = useState<string | null>(null)
  const drag = useRef<Drag | null>(null)
  const dropRef = useRef<{ index: number; y: number } | null>(null)

  const format = FORMATS[project.format]
  const panel = useEditor((s) => s.panel)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const recompute = () => {
      // The Figma work area leaves 86px on each side of the 564px canvas
      // column and 92px above/below the 704px workspace. Keep the preview at
      // that scale when zoom is set to Fit.
      const padX = 172
      const padY = 184
      const k = Math.min(
        (el.clientWidth - padX) / format.width,
        (el.clientHeight - padY) / format.height
      )
      setFit(Math.max(0.1, Math.min(1, k)))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [format.width, format.height])

  const k = zoom === 'fit' ? fit : zoom

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      if (d.kind === 'pattern') {
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return
        d.moved = true
        updatePattern(d.id, { x: Math.round(d.ox + dx / k), y: Math.round(d.oy + dy / k) })
        return
      }
      if (d.kind === 'block') {
        if (!d.moved && Math.abs(e.clientY - d.startY) < 4) return
        if (!d.moved) {
          d.moved = true
          setHeldBlock(d.id)
          document.body.style.cursor = 'grabbing'
        }
        const next = computeDrop(e.clientY)
        dropRef.current = next
        setDrop(next)
        return
      }
      // a few pixels of slop so clicking a text block never nudges the photo
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return
      d.moved = true
      const clamp = (v: number) => Math.max(-50, Math.min(50, v))
      updatePhoto({
        offsetX: clamp(d.ox - (dx / k / format.width) * 100),
        offsetY: clamp(d.oy - (dy / k / format.height) * 100),
      })
    }

    const up = () => {
      const d = drag.current
      drag.current = null
      document.body.style.cursor = ''
      if (d?.kind === 'block' && d.moved) {
        const target = dropRef.current
        if (target) {
          const to = target.index > d.from ? target.index - 1 : target.index
          moveBlockTo(d.id, to)
        }
      }
      dropRef.current = null
      setDrop(null)
      setHeldBlock(null)
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, updatePhoto, updatePattern, moveBlockTo, format.width, format.height])

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      e.preventDefault()
      const current = zoom === 'fit' ? fit : zoom
      setZoom(Math.max(0.1, Math.min(2, current * (e.deltaY > 0 ? 0.92 : 1.08))))
    }
    const el = wrapRef.current
    el?.addEventListener('wheel', onWheel, { passive: false })
    return () => el?.removeEventListener('wheel', onWheel)
  }, [zoom, fit, setZoom])

  if (!slide) return <div className="canvas-wrap" ref={wrapRef} />

  // keep the canvas clean while the user edits text; show grips in Декор
  const showPatternTools = panel === 'decor' || Boolean(sel.patternId)
  const pannable = Boolean(slide.photo && slide.photo.style !== 'trio' && slide.photo.src)

  /** Where would the held block land if dropped at this pointer position? */
  function computeDrop(clientY: number) {
    const stage = stageRef.current
    const root = stage?.querySelector('[data-slide-root]')
    if (!stage || !root) return null
    const rects = Array.from(root.querySelectorAll('[data-block-id]')).map((el) =>
      el.getBoundingClientRect()
    )
    if (!rects.length) return null
    let index = rects.length
    for (let i = 0; i < rects.length; i++) {
      if (clientY < rects[i].top + rects[i].height / 2) {
        index = i
        break
      }
    }
    const base = stage.getBoundingClientRect().top
    const gap = 7
    const y =
      index === 0
        ? rects[0].top - gap - base
        : index >= rects.length
          ? rects[rects.length - 1].bottom + gap - base
          : (rects[index - 1].bottom + rects[index].top) / 2 - base
    return { index, y }
  }

  const startDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    // mousedown is prevented below, so focus would otherwise stay wherever it
    // was — and the arrow keys only act on the layer while the slide has focus
    stageRef.current?.focus()
    const el = (e.target as HTMLElement).closest('[data-block-id]') as HTMLElement | null
    if (el) {
      const id = el.getAttribute('data-block-id')!
      const from = slide.blocks.findIndex((b) => b.id === id)
      if (from < 0) return
      // stops the browser starting a text selection instead of a drag
      e.preventDefault()
      drag.current = { kind: 'block', id, from, startY: e.clientY, moved: false }
      return
    }
    if (!pannable) return
    e.preventDefault()
    drag.current = {
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      ox: slide.photo!.offsetX,
      oy: slide.photo!.offsetY,
      moved: false,
    }
  }

  return (
    <div
      className="canvas-wrap"
      ref={wrapRef}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={async (e) => {
        e.preventDefault()
        setDropping(false)
        const file = Array.from(e.dataTransfer.files).find((f) =>
          f.type.startsWith('image/')
        )
        if (file) dropPhoto(await importPhoto(file))
      }}
    >
      <div
        ref={stageRef}
        className="stage"
        tabIndex={-1}
        style={{ width: format.width * k, height: format.height * k, position: 'relative' }}
      >
        <div
          className="stage-shadow"
          style={{
            transform: `scale(${k})`,
            transformOrigin: 'top left',
            width: format.width,
            height: format.height,
            cursor: pannable ? 'grab' : undefined,
          }}
          // capture: the blocks stop propagation so they can own selection
          onMouseDownCapture={startDrag}
          onDoubleClick={() => fileRef.current?.click()}
        >
          <SlideView
            slide={slide}
            project={project}
            interactive
            showGuides={showGuides}
            selectedBlockId={sel.blockId}
            dimBlockId={heldBlock}
            onSelectBlock={selectBlock}
            onOverflow={(px) => reportOverflow(slide.id, px)}
          />
        </div>

        {/* Handles stay outside the exported slide while patterns can be dragged. */}
        {showPatternTools ? (
          <div className="pattern-layer">
            {slide.patterns.map((p) => {
              const b = patternBox(p)
              const active = sel.patternId === p.id
              return (
                <button
                  key={p.id}
                  className="pattern-pick"
                  aria-selected={active}
                  style={{
                    left: b.left * k,
                    top: b.top * k,
                    width: b.w * k,
                    height: b.h * k,
                    transform: `rotate(${p.rotation}deg)`,
                  }}
                  title={PATTERN_BY_ID[p.pattern].label}
                  data-pattern-id={p.id}
                  onClick={() => selectPattern(p.id)}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return
                    e.preventDefault()
                    e.stopPropagation()
                    selectPattern(p.id)
                    drag.current = { kind: 'pattern', id: p.id, startX: e.clientX, startY: e.clientY, ox: p.x, oy: p.y, moved: false }
                  }}
                />
              )
            })}
          </div>
        ) : null}

        {drop ? (
          <div
            className="block-drop-line"
            style={{
              left: format.padding.left * k,
              width: (format.width - format.padding.left - format.padding.right) * k,
              top: drop.y,
            }}
          />
        ) : null}

        {overflow > 1 ? (
          <div className="overflow-flag">
            Не помещается: {Math.round(overflow)} px — сократите текст
          </div>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) dropPhoto(await importPhoto(file))
        }}
      />

      {dropping ? <div className="drop-veil">Отпустите — вставлю фото в слайд</div> : null}

      {pannable || slide.blocks.length > 1 ? (
        <div className="canvas-hint">
          {sel.patternId
            ? 'Стрелки переставляют росчерк по местам · Esc — отпустить'
            : sel.blockId
              ? '↑↓ — порядок блока, ←→ — выравнивание · Esc — отпустить'
              : slide.blocks.length > 1
                ? 'Блоки перетаскиваются по вертикали'
                : null}
          {pannable && (sel.blockId || sel.patternId || slide.blocks.length > 1) ? ' · ' : null}
          {pannable ? 'фото двигается мышью, двойной клик — заменить' : null}
        </div>
      ) : null}

      <div className="zoombar">
        <button
          className="btn ghost sm"
          onClick={() => setZoom(Math.max(0.1, k - 0.1))}
          title="Уменьшить"
          aria-label="Уменьшить"
        >
          −
        </button>
        <button
          className="btn ghost sm"
          onClick={() => setZoom('fit')}
          title="Вписать"
          aria-label="Вписать в экран"
        >
          {Math.round(k * 100)}%
        </button>
        <button
          className="btn ghost sm"
          onClick={() => setZoom(Math.min(2, k + 0.1))}
          title="Увеличить"
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
    </div>
  )
}
