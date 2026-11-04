import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseGlyph } from './icons'
import { PALETTE, PALETTE_ORDER, hex, type ColorId } from '../design/tokens'

export function Section({
  title,
  children,
  action,
}: {
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="section">
      {title ? (
        <div className="row between">
          <span className="label">{title}</span>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title ?? o.label}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Wrapping button group — for choices that do not fit one segmented row. */
export function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          className="btn sm"
          title={o.title ?? o.label}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Swatches({
  value,
  onChange,
  allow = PALETTE_ORDER,
}: {
  value: ColorId
  onChange: (c: ColorId) => void
  allow?: ColorId[]
}) {
  return (
    <div className="ins-swatches">
      {allow.map((c) => (
        <button
          key={c}
          className="ins-swatch"
          aria-pressed={value === c}
          title={PALETTE[c].name}
          onClick={() => onChange(c)}
        >
          <i style={{ background: hex(c) }} />
        </button>
      ))}
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <div className="row between">
        <span className="hint">{label}</span>
        <span className="hint" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(value * 100) / 100}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/** Everything inside a dialog that a keyboard can land on. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  title,
  onClose,
  children,
  footer,
  width,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // a click that STARTS inside the dialog and ends on the backdrop is a slip,
  // not a dismissal — losing a pasted post to it is unacceptable
  const fromBackdrop = useRef(false)

  const visible = () =>
    Array.from(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (el) => el.offsetParent !== null
    )

  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null
    // land on the first real control, not on the close button in the header
    const body = box.current?.querySelector('.body')
    const first = visible().find((el) => body?.contains(el)) ?? visible()[0]
    ;(first ?? box.current)?.focus()
    return () => restore?.focus?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = visible()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = box.current?.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    // capture, so the app's own shortcuts never see a key meant for the dialog
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        fromBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && fromBackdrop.current) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={box}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            className="btn ghost icon"
            onClick={onClose}
            title="Закрыть (Esc)"
            aria-label="Закрыть"
          >
            <CloseGlyph />
          </button>
        </header>
        <div className="body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  )
}

export function Empty({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="ok-state">
      <div className="big">{icon}</div>
      <b style={{ color: 'var(--ink-2)' }}>{title}</b>
      {hint ? <span style={{ fontSize: 11.5, maxWidth: 230 }}>{hint}</span> : null}
    </div>
  )
}
