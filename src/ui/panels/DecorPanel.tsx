import { useEditor, useSelectedPattern, useSlide } from '../../store/useEditor'
import {
  PATTERNS,
  PATTERN_BY_ID,
  PATTERN_FADES,
  PATTERN_SIZES,
  PATTERN_SOFTNESS,
  PATTERN_SPOTS,
  PATTERN_TURNS,
  STROKE_WIDTH,
  nearest,
} from '../../design/patterns'
import { NOISE_LABELS } from '../../design/noise'
import { PALETTE, PALETTE_ORDER, hex, PATTERN_DEFAULT, type ColorId } from '../../design/tokens'
import { FORMATS } from '../../design/tokens'
import type { NoiseStyle } from '../../types'
import { Empty, Section, Seg, Slider } from '../controls'

/** One chip row — the only shape a pattern setting is allowed to take now. */
function Preset<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="ins-chips">
      {options.map((o) => (
        <button
          key={String(o.id)}
          className="ins-chip"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const Mini = ({ id, color }: { id: string; color: string }) => {
  const def = PATTERN_BY_ID[id as keyof typeof PATTERN_BY_ID]
  const pad = STROKE_WIDTH
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${def.width + pad * 2} ${def.height + pad * 2}`}
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    >
      <path
        d={def.d}
        fill="none"
        stroke={color}
        strokeWidth={36}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DecorPanel() {
  const slide = useSlide()
  const pattern = useSelectedPattern()
  const sel = useEditor((s) => s.sel)
  const theme = useEditor((s) => s.theme)
  const updateSlide = useEditor((s) => s.updateSlide)
  const addPattern = useEditor((s) => s.addPattern)
  const updatePattern = useEditor((s) => s.updatePattern)
  const deletePattern = useEditor((s) => s.deletePattern)
  const selectPattern = useEditor((s) => s.selectPattern)
  const formatId = useEditor((s) => s.project.format)

  if (!slide) return null

  const format = FORMATS[formatId]
  const base = pattern ? PATTERN_BY_ID[pattern.pattern].blur : 100

  /** Which named spot is this pattern sitting on (or nearest to)? */
  const spotOf = (x: number, y: number) =>
    PATTERN_SPOTS.reduce((best, sp) => {
      const d = (sp.fx * format.width - x) ** 2 + (sp.fy * format.height - y) ** 2
      const bd = (best.fx * format.width - x) ** 2 + (best.fy * format.height - y) ** 2
      return d < bd ? sp : best
    }, PATTERN_SPOTS[0]).id

  return (
    <div className="panel">
      <button
        className="btn primary"
        style={{ width: '100%', marginBottom: 12 }}
        onClick={() => {
          const p = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
          addPattern(p.id, {
            x: Math.round(format.width * (0.15 + Math.random() * 0.7)),
            y: Math.round(format.height * (0.15 + Math.random() * 0.7)),
            rotation: Math.round(Math.random() * 360),
          })
        }}
      >
        ✨ Сделать красиво
      </button>
      <Section title="Шум">
        <Seg
          value={slide.noise}
          onChange={(v) => updateSlide(slide.id, { noise: v as NoiseStyle })}
          options={(['none', 'warm', 'black'] as NoiseStyle[]).map((v) => ({
            value: v,
            label: NOISE_LABELS[v],
          }))}
        />
        {slide.noise !== 'none' ? (
          <Slider
            label="Зернистость"
            value={slide.noiseIntensity}
            min={0.2}
            max={2}
            step={0.05}
            onChange={(v) => updateSlide(slide.id, { noiseIntensity: v })}
          />
        ) : null}
        <p className="hint">
          Шум всегда покрывает карточку целиком и не двигается — так задано в макете.
        </p>
      </Section>

      <Section title="Добавить паттерн">
        <div className="pattern-grid">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              className="pattern-card"
              title={p.label}
              onClick={() => addPattern(p.id)}
            >
              <Mini id={p.id} color={hex(theme.pattern)} />
              <em>{p.label}</em>
            </button>
          ))}
        </div>
        <p className="hint">
          Росчерк встаёт на одно из мест, предусмотренных макетом, — промахнуться нельзя.
        </p>
      </Section>

      {slide.patterns.length ? (
        <Section title={`Паттерны на слайде · ${slide.patterns.length}`}>
          <div className="col" style={{ gap: 6 }}>
            {slide.patterns.map((p) => (
              <div
                key={p.id}
                className="block-row"
                aria-selected={sel.patternId === p.id}
                onClick={() => selectPattern(p.id)}
              >
                <div style={{ width: 34, height: 26, flex: '0 0 auto' }}>
                  <Mini
                    id={p.pattern}
                    color={p.color === 'brand' ? PATTERN_DEFAULT : hex(p.color)}
                  />
                </div>
                <div className="t">
                  <b>{PATTERN_BY_ID[p.pattern].label}</b>
                  <span>
                    {Math.round(p.scale * 100)}% · {Math.round(p.rotation)}°
                    {p.front ? ' · поверх текста' : ''}
                  </span>
                </div>
                <button
                  className="btn ghost icon sm danger"
                  title="Убрать росчерк"
                  aria-label="Убрать росчерк"
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePattern(p.id)
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {pattern ? (
        <>
          <Section title="Цвет паттерна">
            <div className="ins-swatches">
              <button
                className="ins-swatch"
                aria-pressed={pattern.color === 'brand'}
                title="Фирменный зелёный из макета"
                onClick={() => updatePattern(pattern.id, { color: 'brand' })}
              >
                <i style={{ background: PATTERN_DEFAULT }} />
              </button>
              {PALETTE_ORDER.map((c: ColorId) => (
                <button
                  key={c}
                  className="ins-swatch"
                  aria-pressed={pattern.color === c}
                  title={PALETTE[c].name}
                  onClick={() => updatePattern(pattern.id, { color: c })}
                >
                  <i style={{ background: hex(c) }} />
                </button>
              ))}
            </div>
          </Section>

          <Section title="Место на слайде">
            <Preset
              options={PATTERN_SPOTS.map((sp) => ({ id: sp.id, label: sp.label }))}
              value={spotOf(pattern.x, pattern.y)}
              onChange={(id) => {
                const sp = PATTERN_SPOTS.find((x) => x.id === id)!
                updatePattern(pattern.id, {
                  x: Math.round(format.width * sp.fx),
                  y: Math.round(format.height * sp.fy),
                })
              }}
            />
          </Section>

          <Section title="Размер">
            <Preset
              options={PATTERN_SIZES.map((o) => ({ id: o.scale, label: o.label }))}
              value={nearest(
                PATTERN_SIZES.map((o) => ({ id: o.scale })),
                pattern.scale
              )}
              onChange={(scale) => updatePattern(pattern.id, { scale })}
            />
          </Section>

          <Section title="Поворот">
            <Preset
              options={PATTERN_TURNS}
              value={nearest(PATTERN_TURNS, ((pattern.rotation % 360) + 360) % 360)}
              onChange={(rotation) => updatePattern(pattern.id, { rotation })}
            />
            <div className="ins-chips">
              <button
                className="ins-chip"
                aria-pressed={pattern.flipX}
                onClick={() => updatePattern(pattern.id, { flipX: !pattern.flipX })}
              >
                ↔ Отразить
              </button>
              <button
                className="ins-chip"
                aria-pressed={pattern.flipY}
                onClick={() => updatePattern(pattern.id, { flipY: !pattern.flipY })}
              >
                ↕ Отразить
              </button>
            </div>
          </Section>

          <Section title="Мягкость">
            <Preset
              options={PATTERN_SOFTNESS.map((o) => ({
                id: Math.round(base * o.k),
                label: o.label,
              }))}
              value={nearest(
                PATTERN_SOFTNESS.map((o) => ({ id: Math.round(base * o.k) })),
                pattern.blur
              )}
              onChange={(blur) => updatePattern(pattern.id, { blur })}
            />
          </Section>

          <Section title="Насыщенность">
            <Preset
              options={PATTERN_FADES}
              value={nearest(PATTERN_FADES, pattern.opacity)}
              onChange={(opacity) => updatePattern(pattern.id, { opacity })}
            />
          </Section>

          <Section title="Слой">
            <div className="ins-chips">
              <button
                className="ins-chip"
                aria-pressed={!pattern.front}
                onClick={() => updatePattern(pattern.id, { front: false })}
              >
                За текстом
              </button>
              <button
                className="ins-chip"
                aria-pressed={pattern.front}
                onClick={() => updatePattern(pattern.id, { front: true })}
              >
                Поверх текста
              </button>
            </div>
            <div className="ins-chips">
              <button className="ins-chip" onClick={() => deletePattern(pattern.id)}>
                Удалить росчерк
              </button>
            </div>
          </Section>
        </>
      ) : slide.patterns.length ? (
        <Empty icon="◠" title="Выберите паттерн" hint="Кликните по нему на слайде или в списке." />
      ) : null}
    </div>
  )
}
