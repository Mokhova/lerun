import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEditor } from '../store/useEditor'
import { FORMATS } from '../design/tokens'
import { SlideView } from '../render/SlideView'
import { validate, issuesForSlide } from '../lint/validate'

/** fallback until the column is measured */
const THUMB_W = 188
/** .strip-item carries a 2px border on each side */
const ITEM_BORDER = 2
const DRAG_SLOP = 5
/** how close to the list edge a drag has to get before the list follows */
const EDGE = 48
const EDGE_SPEED = 14

export function SlideStrip({ onAdd }: { onAdd: () => void }) {
  const project = useEditor((s) => s.project)
  const selected = useEditor((s) => s.sel.slideId)
  const overflow = useEditor((s) => s.overflow)
  const selectSlide = useEditor((s) => s.selectSlide)
  const duplicateSlide = useEditor((s) => s.duplicateSlide)
  const deleteSlide = useEditor((s) => s.deleteSlide)
  const moveSlide = useEditor((s) => s.moveSlide)

  const listRef = useRef<HTMLDivElement>(null)
  const pending = useRef<{ from: number; y: number; moved: boolean } | null>(null)
  const overRef = useRef<number | null>(null)
  const pointerY = useRef(0)
  const speed = useRef(0)
  const raf = useRef(0)
  const [from, setFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const format = FORMATS[project.format]
  // the column narrows at 1360px, and a hardcoded width used to be cropped
  // by 23px there — measure it instead
  const [thumbW, setThumbW] = useState(THUMB_W)
  const k = thumbW / format.width
  const issues = useMemo(() => validate(project, overflow), [project, overflow])

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const measure = () => {
      const cs = getComputedStyle(el)
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      setThumbW(Math.max(80, el.clientWidth - pad - ITEM_BORDER * 2))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** Which card is the pointer currently over? */
  const indexAt = (clientY: number) => {
    const cards = Array.from(
      listRef.current?.querySelectorAll('[data-slide-card]') ?? []
    ) as HTMLElement[]
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect()
      if (clientY < r.bottom) return i
    }
    return cards.length - 1
  }

  useEffect(() => {
    /** keeps the list following the pointer while it rests against an edge */
    const tick = () => {
      const el = listRef.current
      if (el && speed.current) {
        const before = el.scrollTop
        el.scrollTop += speed.current
        if (el.scrollTop !== before) {
          const target = indexAt(pointerY.current)
          overRef.current = target
          setOver(target)
        }
      }
      raf.current = requestAnimationFrame(tick)
    }

    const move = (e: MouseEvent) => {
      const p = pending.current
      if (!p) return
      if (!p.moved && Math.abs(e.clientY - p.y) < DRAG_SLOP) return
      if (!p.moved) {
        p.moved = true
        setFrom(p.from)
        document.body.style.cursor = 'grabbing'
        raf.current = requestAnimationFrame(tick)
      }
      pointerY.current = e.clientY
      const box = listRef.current?.getBoundingClientRect()
      speed.current = !box
        ? 0
        : e.clientY < box.top + EDGE
          ? -EDGE_SPEED
          : e.clientY > box.bottom - EDGE
            ? EDGE_SPEED
            : 0
      const target = indexAt(e.clientY)
      overRef.current = target
      setOver(target)
    }

    const up = () => {
      const p = pending.current
      pending.current = null
      document.body.style.cursor = ''
      speed.current = 0
      cancelAnimationFrame(raf.current)
      const target = overRef.current
      overRef.current = null
      setOver(null)
      setFrom(null)
      if (p?.moved && target !== null && target !== p.from) moveSlide(p.from, target)
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      cancelAnimationFrame(raf.current)
    }
  }, [moveSlide])

  const selectedAt = project.slides.findIndex((s) => s.id === selected)

  // the list scrolls now, so the current slide has to be brought along.
  // Instant, not smooth: held arrow keys repeat faster than an animation can
  // finish, and a list lagging behind the selection is worse than a jump.
  // Watching the position too, since deleting or reordering slides moves the
  // card out from under the viewport without the selection ever changing.
  useEffect(() => {
    if (pending.current) return
    listRef.current
      ?.querySelector(`[data-slide-id="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, selectedAt, project.slides.length])

  return (
    <aside className="strip">
      <div className="strip-head">
        <span className="label">Слайды · {project.slides.length}</span>
        <button className="btn sm primary" onClick={onAdd} title="Добавить слайд (N)">
          + Слайд
        </button>
      </div>
      <div className="strip-list" ref={listRef}>
        {project.slides.map((slide, i) => {
          const mine = issuesForSlide(issues, slide.id)
          const err = mine.some((x) => x.level === 'error')
          const warn = mine.some((x) => x.level === 'warn')
          const dragging = from === i
          const marker = from !== null && over === i && from !== i ? (from > i ? 'before' : 'after') : null
          return (
            <div
              key={slide.id}
              data-slide-card
              data-slide-id={slide.id}
              className="strip-item"
              aria-selected={selected === slide.id}
              data-dragging={dragging || undefined}
              data-drop={marker ?? undefined}
              onMouseDown={(e) => {
                if (e.button !== 0) return
                if ((e.target as HTMLElement).closest('.tools')) return
                e.preventDefault()
                pending.current = { from: i, y: e.clientY, moved: false }
              }}
              onClick={() => {
                if (from === null) selectSlide(slide.id)
              }}
            >
              <span className="num">{i + 1}</span>
              {err || warn ? (
                <span
                  className="badge"
                  style={{ background: err ? 'var(--error)' : 'var(--warn)' }}
                  title={mine.map((m) => m.message).join('\n')}
                >
                  {err ? '!' : '•'}
                </span>
              ) : null}
              <div
                className="thumb-frame"
                style={{ width: thumbW, height: Math.round(format.height * k) }}
              >
                <div
                  className="thumb-scaler"
                  style={{ transform: `scale(${k})`, width: format.width, height: format.height }}
                >
                  <SlideView slide={slide} project={project} />
                </div>
              </div>
              <div className="tools" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => moveSlide(i, i - 1)}
                  disabled={i === 0}
                  title="Выше"
                  aria-label="Поднять слайд"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveSlide(i, i + 1)}
                  disabled={i === project.slides.length - 1}
                  title="Ниже"
                  aria-label="Опустить слайд"
                >
                  ↓
                </button>
                <button
                  onClick={() => duplicateSlide(slide.id)}
                  title="Дублировать"
                  aria-label="Дублировать слайд"
                >
                  ⧉
                </button>
                <button
                  onClick={() => deleteSlide(slide.id)}
                  disabled={project.slides.length <= 1}
                  title="Удалить"
                  aria-label="Удалить слайд"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <p className="strip-foot">Слайды можно перетаскивать мышью · ↑↓ — переключение</p>
    </aside>
  )
}
