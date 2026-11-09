import { useRef } from 'react'
import { useEditor, useSlide } from '../../store/useEditor'
import { GAPS, hex } from '../../design/tokens'
import { THEMES } from '../../design/themes'
import type { SlidePhoto } from '../../types'
import { importPhoto } from '../../lib/image'
import { Chips, Section, Seg, Slider, Swatches } from '../controls'

export function StylePanel() {
  const slide = useSlide()
  const project = useEditor((s) => s.project)
  const theme = useEditor((s) => s.theme)
  const applyTheme = useEditor((s) => s.applyTheme)
  const updateSlide = useEditor((s) => s.updateSlide)
  const setPhotoStyle = useEditor((s) => s.setPhotoStyle)
  const setPhoto = useEditor((s) => s.setPhoto)
  const updatePhoto = useEditor((s) => s.updatePhoto)
  const clearPhoto = useEditor((s) => s.clearPhoto)
  const setFooterText = useEditor((s) => s.setFooterText)
  const fileRef = useRef<HTMLInputElement>(null)
  const slotRef = useRef<number>(0)

  if (!slide) return null

  const pick = async (file: File | undefined) => {
    if (!file) return
    const src = await importPhoto(file)
    setPhoto(src, slide.photo?.style === 'trio' ? slotRef.current : undefined)
  }

  return (
    <div className="panel">
      <Section
        title="Тема"
        action={
          <button className="btn sm ghost" onClick={() => applyTheme(theme.id, 'all')}>
            На все слайды
          </button>
        }
      >
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className="theme-card"
              aria-pressed={slide.bg === t.bg}
              title={t.name}
              onClick={() => applyTheme(t.id, 'slide')}
            >
              <span className="sw">
                <i style={{ background: hex(t.bg) }} />
                <i style={{ background: hex(t.text) }} />
                <i style={{ background: hex(t.accent) }} />
              </span>
              <em>{t.name}</em>
            </button>
          ))}
        </div>
        <p className="hint">
          Тема меняет фон, цвет текста и акценты сразу — комбинации проверены на контраст.
        </p>
      </Section>

      <Section title="Фон слайда">
        <Swatches value={slide.bg} onChange={(c) => updateSlide(slide.id, { bg: c })} />
      </Section>

      <Section title="Раскладка контента">
        <Seg
          value={slide.distribute}
          onChange={(v) => updateSlide(slide.id, { distribute: v })}
          options={[
            { value: 'top', label: 'Сверху' },
            { value: 'center', label: 'Центр' },
            { value: 'bottom', label: 'Снизу' },
            { value: 'between', label: 'Враспор' },
          ]}
        />
        <div className="col" style={{ gap: 4 }}>
          <span className="hint">Расстояние между блоками</span>
          <div className="seg">
            {GAPS.map((g) => (
              <button
                key={g}
                aria-pressed={slide.gap === g}
                onClick={() => updateSlide(slide.id, { gap: g })}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <p className="hint">
          Поля слайда зафиксированы макетом: {project.format === 'post45' ? '160/120/180/120' : 'по формату'}.
          Контент всегда внутри безопасной зоны.
        </p>
      </Section>

      <Section
        title="Фото"
        action={
          slide.photo ? (
            <button className="btn sm ghost danger" onClick={clearPhoto}>
              Убрать
            </button>
          ) : null
        }
      >
        <Chips
          value={(slide.photo?.style ?? 'none') as SlidePhoto['style'] | 'none'}
          onChange={(v) =>
            v === 'none' ? clearPhoto() : setPhotoStyle(v as SlidePhoto['style'])
          }
          options={[
            { value: 'none', label: 'Нет' },
            { value: 'full', label: 'Во весь слайд' },
            { value: 'rounded', label: 'Скруглённое', title: 'Радиус 184 как в макете' },
            { value: 'card', label: 'Карточка', title: '840×900, радиус 184' },
            { value: 'trio', label: 'Три в ряд', title: 'Три арки 333×760' },
          ]}
        />

        {slide.photo ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {slide.photo.style === 'trio' ? (
              <div className="row" style={{ gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    className="btn sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      slotRef.current = i
                      fileRef.current?.click()
                    }}
                  >
                    {slide.photo?.srcs[i] ? `Фото ${i + 1} ✓` : `Фото ${i + 1}`}
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn" onClick={() => fileRef.current?.click()}>
                {slide.photo.src ? 'Заменить картинку' : 'Загрузить картинку'}
              </button>
            )}

            {slide.photo.style !== 'trio' ? (
              <>
                <Slider
                  label="Масштаб"
                  value={slide.photo.scale}
                  min={1}
                  max={2}
                  step={0.01}
                  onChange={(v) => updatePhoto({ scale: v })}
                />
                <Slider
                  label="Сдвиг по горизонтали"
                  value={slide.photo.offsetX}
                  min={-50}
                  max={50}
                  suffix="%"
                  onChange={(v) => updatePhoto({ offsetX: v })}
                />
                <Slider
                  label="Сдвиг по вертикали"
                  value={slide.photo.offsetY}
                  min={-50}
                  max={50}
                  suffix="%"
                  onChange={(v) => updatePhoto({ offsetY: v })}
                />
                <Slider
                  label="Затемнение снизу"
                  value={slide.photo.scrim}
                  min={0}
                  max={0.8}
                  step={0.01}
                  onChange={(v) => updatePhoto({ scrim: v })}
                />
              </>
            ) : null}
          </>
        ) : (
          <p className="hint">Выберите раскладку — появится загрузка картинки.</p>
        )}
      </Section>

      <Section
        title="Подпись канала"
        action={
          <button
            className="btn sm"
            aria-pressed={slide.showFooter}
            onClick={() => updateSlide(slide.id, { showFooter: !slide.showFooter })}
          >
            {slide.showFooter ? 'Показана' : 'Скрыта'}
          </button>
        }
      >
        <input
          className="field"
          value={project.footerText}
          onChange={(e) => setFooterText(e.target.value)}
          placeholder="тгк Рефлексант"
        />
        <p className="hint">Gilroy 32/32, 50 % прозрачности — как в макете.</p>
      </Section>
    </div>
  )
}
