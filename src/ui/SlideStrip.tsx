import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor } from '../store/useEditor'
import { FORMATS } from '../design/tokens'
import { SlideView } from '../render/SlideView'
import { validate, issuesForSlide } from '../lint/validate'

const THUMB_H = 52
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
  const pending = useRef<{ from: number; x: number; moved: boolean } | null>(null)
  const overRef = useRef<number | null>(null)
  const pointerX = useRef(0)
  const speed = useRef(0)
  const raf = useRef(0)
  const [from, setFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const format = FORMATS[project.format]
  const k = THUMB_H / format.height
  const thumbW = Math.round(format.width * k)
  const issues = useMemo(() => validate(project, overflow), [project, overflow])

  /** Which card is the pointer currently over? */
  const indexAt = (clientX: number) => {
    const cards = Array.from(
      listRef.current?.querySelectorAll('[data-slide-card]') ?? []
    ) as HTMLElement[]
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect()
      if (clientX < r.left + r.width / 2) return i
    }
    return cards.length - 1
  }

  useEffect(() => {
    /** keeps the list following the pointer while it rests against an edge */
    const tick = () => {
      const el = listRef.current
      if (el && speed.current) {
        const before = el.scrollLeft
        el.scrollLeft += speed.current
        if (el.scrollLeft !== before) {
          const target = indexAt(pointerX.current)
          overRef.current = target
          setOver(target)
        }
      }
      raf.current = requestAnimationFrame(tick)
    }

    const move = (e: MouseEvent) => {
      const p = pending.current
      if (!p) return
      if (!p.moved && Math.abs(e.clientX - p.x) < DRAG_SLOP) return
      if (!p.moved) {
        p.moved = true
        setFrom(p.from)
        document.body.style.cursor = 'grabbing'
        raf.current = requestAnimationFrame(tick)
      }
      pointerX.current = e.clientX
      const box = listRef.current?.getBoundingClientRect()
      speed.current = !box
        ? 0
        : e.clientX < box.left + EDGE
          ? -EDGE_SPEED
          : e.clientX > box.right - EDGE
            ? EDGE_SPEED
            : 0
      const target = indexAt(e.clientX)
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
                pending.current = { from: i, x: e.clientX, moved: false }
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
        <button className="strip-add" onClick={onAdd} title="Добавить слайд (N)" aria-label="Добавить слайд">+</button>
      </div>
    </aside>
  )
}
