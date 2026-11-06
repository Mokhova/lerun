import { type ReactNode } from 'react'
import { useEditor, useSlide } from '../../store/useEditor'
import type {
  Block,
  BlockType,
  CaptionBlock,
  ListBlock,
  QuoteBlock,
  SpacerBlock,
  TextBlock,
} from '../../types'
import {
  FONT_STACK,
  TEXT_VARIANTS,
  TYPE_SCALE,
  type ColorId,
  type TextVariant,
} from '../../design/tokens'
import { Swatches } from '../controls'
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDownGlyph,
  ArrowUpGlyph,
  CapsIcon,
  CloseGlyph,
  OpacityIcon,
} from '../icons'

const BLOCK_LABEL: Record<BlockType, string> = {
  text: 'Текст',
  list: 'Список',
  quote: 'Цитата',
  caption: 'Подпись к фото',
  spacer: 'Отступ',
}

/** A text block is named by the style it carries — that is what «1. Заголовок» means. */
const nameOf = (b: Block) =>
  b.type === 'text' ? TYPE_SCALE[b.variant].label : BLOCK_LABEL[b.type]

/* ----------------------------------------------------------------- pieces */

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ins-sec">
      <span className="ins-label">{title}</span>
      {children}
    </div>
  )
}

function Chip({
  on,
  onClick,
  icon,
  children,
  title,
}: {
  on?: boolean
  onClick: () => void
  icon?: ReactNode
  children: ReactNode
  title?: string
}) {
  return (
    <button className="ins-chip" aria-pressed={on} onClick={onClick} title={title}>
      {icon}
      {children}
    </button>
  )
}

function Palette({
  title,
  value,
  onChange,
}: {
  title: string
  value: ColorId
  onChange: (c: ColorId) => void
}) {
  return (
    <Sec title={title}>
      <Swatches value={value} onChange={onChange} />
    </Sec>
  )
}

/**
 * Relative size, compressed into a band where every sample stays readable.
 * True quarter-scale put three of the eight at 11, 10 and 8px — the smallest
 * read as an empty tile, and the two most-used styles differed by one pixel.
 */
const sampleSize = (size: number) => {
  const [lo, hi] = [32, 144]
  const [min, max] = [14, 30]
  return Math.round((min + ((size - lo) / (hi - lo)) * (max - min)) * 10) / 10
}

/** The type ramp. Each tile shows the real face and says what it is. */
function TypePicker({
  value,
  onChange,
}: {
  value: TextVariant
  onChange: (v: TextVariant) => void
}) {
  // the cover style is for the first slide — elsewhere it is only shown when
  // the block already carries it, so an old project still reads correctly
  const onFirstSlide = useEditor((s) => s.project.slides[0]?.id === s.sel.slideId)
  const offered = TEXT_VARIANTS.filter(
    (v) => v !== 'displayXL' || onFirstSlide || value === 'displayXL'
  )

  return (
    <div className="ins-fonts">
      {offered.map((v) => {
        const t = TYPE_SCALE[v]
        return (
          <button
            key={v}
            className="ins-font"
            aria-pressed={value === v}
            title={`${t.label} — ${t.hint}`}
            onClick={() => onChange(v)}
          >
            <span
              className="sample"
              style={{
                fontFamily: FONT_STACK[t.family],
                fontWeight: t.weight,
                fontSize: sampleSize(t.size),
                textTransform: v === 'displayXL' ? 'uppercase' : undefined,
              }}
            >
              Аа
            </span>
            <span className="name">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ panel */

export function ContentPanel() {
  const slide = useSlide()
  const selectedId = useEditor((s) => s.sel.blockId)
  const addBlock = useEditor((s) => s.addBlock)
  if (!slide) return null
  const block = slide.blocks.find((b) => b.id === selectedId) ?? slide.blocks[0]

  return (
    <div className="panel">
      <div className="ins-list">
        {block ? <section className="ins-block"><header className="ins-head"><span className="ins-name">{slide.blocks.findIndex((b) => b.id === block.id) + 1}. {nameOf(block)}</span></header><BlockBody block={block} /></section>
          : <p className="ins-note">Выберите слой или добавьте новый блок.</p>}
      </div>

      <div className="ins-add">
        {(['text', 'list', 'quote', 'caption', 'spacer'] as BlockType[]).map((t) => (
          <Chip key={t} onClick={() => addBlock(t)}>
            + {BLOCK_LABEL[t]}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function BlockBody({ block }: { block: Block }) {
  if (block.type === 'text') return <TextBody block={block} />
  if (block.type === 'list') return <ListBody block={block} />
  if (block.type === 'quote') return <QuoteBody block={block} />
  if (block.type === 'caption') return <CaptionBody block={block} />
  return <SpacerBody block={block} />
}

/* ------------------------------------------------------------------- text */

function TextBody({ block }: { block: TextBlock }) {
  const update = useEditor((s) => s.updateBlock)
  const spec = TYPE_SCALE[block.variant]
  const over = block.text.length - spec.maxChars

  return (
    <>
      <div className="ins-sec">
        <textarea
          className="ins-field"
          value={block.text}
          onChange={(e) => update(block.id, { text: e.target.value })}
          placeholder="Напишите текст…"
        />
        {over > 0 ? (
          <p className="ins-over">
            На {over} знаков больше, чем держит «{spec.label}»
          </p>
        ) : null}
      </div>

      <Sec title="Шрифт">
        <TypePicker value={block.variant} onChange={(variant) => update(block.id, { variant })} />
        <p className="ins-note">{spec.hint}</p>
      </Sec>

      <Palette title="Цвет" value={block.color} onChange={(c) => update(block.id, { color: c })} />

      <Sec title="Выравнивание">
        <div className="ins-chips">
          <Chip
            on={block.align === 'left'}
            icon={<AlignLeftIcon />}
            onClick={() => update(block.id, { align: 'left' })}
          >
            Слева
          </Chip>
          <Chip
            on={block.align === 'center'}
            icon={<AlignCenterIcon />}
            onClick={() => update(block.id, { align: 'center' })}
          >
            По центру
          </Chip>
          <Chip
            on={block.align === 'right'}
            icon={<AlignRightIcon />}
            onClick={() => update(block.id, { align: 'right' })}
          >
            Справа
          </Chip>
        </div>
      </Sec>

      <Sec title="Стиль текста">
        <div className="ins-chips">
          <Chip
            on={!!block.muted}
            icon={<OpacityIcon />}
            onClick={() => update(block.id, { muted: !block.muted })}
          >
            Полупрозрачный
          </Chip>
          <Chip
            on={!!block.uppercase}
            icon={<CapsIcon />}
            onClick={() => update(block.id, { uppercase: !block.uppercase })}
          >
            Заглавные
          </Chip>
          {spec.family !== 'display' ? (
            <>
              <Chip
                on={!!block.italic}
                onClick={() => update(block.id, { italic: !block.italic })}
              >
                Курсив
              </Chip>
              <Chip
                on={!!block.alt}
                title="Montserrat Alternates"
                onClick={() => update(block.id, { alt: !block.alt })}
              >
                Альт
              </Chip>
            </>
          ) : null}
        </div>
      </Sec>
    </>
  )
}

/* ------------------------------------------------------------------- list */

function ListBody({ block }: { block: ListBlock }) {
  const update = useEditor((s) => s.updateBlock)
  const addItem = useEditor((s) => s.addItem)
  const updateItem = useEditor((s) => s.updateItem)
  const deleteItem = useEditor((s) => s.deleteItem)
  const moveItem = useEditor((s) => s.moveItem)
  const numbered = block.style === 'numbered'

  return (
    <>
      <Sec title="Вид списка">
        <div className="ins-chips">
          <Chip on={numbered} onClick={() => update(block.id, { style: 'numbered' })}>
            С подзаголовками
          </Chip>
          <Chip on={!numbered} onClick={() => update(block.id, { style: 'bullet' })}>
            Маркеры
          </Chip>
          {!numbered ? (
            <>
              <Chip
                on={block.marker === 'star'}
                onClick={() => update(block.id, { marker: 'star' })}
              >
                ✷ Звёздочка
              </Chip>
              <Chip on={block.marker === 'dot'} onClick={() => update(block.id, { marker: 'dot' })}>
                • Точка
              </Chip>
            </>
          ) : null}
        </div>
      </Sec>

      <Sec title="Заголовок списка">
        <div className="ins-chips">
          <Chip
            on={block.showHeader}
            onClick={() => update(block.id, { showHeader: !block.showHeader })}
          >
            {block.showHeader ? 'Показан' : 'Скрыт'}
          </Chip>
        </div>
        {block.showHeader ? (
          <textarea
            className="ins-field short"
            value={block.header}
            placeholder="Рукописный заголовок"
            onChange={(e) => update(block.id, { header: e.target.value })}
          />
        ) : null}
      </Sec>

      {block.items.map((it, i) => (
        <div className="ins-sec" key={it.id}>
          <div className="ins-head">
            <span className="ins-name">Пункт {i + 1}</span>
            <div className="ins-acts-group">
              <button
                className="ins-icon"
                title="Удалить пункт"
                aria-label="Удалить пункт"
                onClick={() => deleteItem(block.id, it.id)}
              >
                <CloseGlyph />
              </button>
              <button
                className="ins-icon"
                title="Выше"
                aria-label="Выше"
                disabled={i === 0}
                onClick={() => moveItem(block.id, it.id, -1)}
              >
                <ArrowUpGlyph />
              </button>
              <button
                className="ins-icon"
                title="Ниже"
                aria-label="Ниже"
                disabled={i === block.items.length - 1}
                onClick={() => moveItem(block.id, it.id, 1)}
              >
                <ArrowDownGlyph />
              </button>
            </div>
          </div>
          {numbered ? (
            <input
              className="ins-field one-line"
              value={it.title}
              placeholder={`${i + 1}. Пункт`}
              onChange={(e) => updateItem(block.id, it.id, { title: e.target.value })}
            />
          ) : null}
          <textarea
            className="ins-field"
            value={it.text}
            placeholder="Текст пункта"
            onChange={(e) => updateItem(block.id, it.id, { text: e.target.value })}
          />
        </div>
      ))}

      <div className="ins-chips">
        <Chip onClick={() => addItem(block.id)}>+ Пункт</Chip>
      </div>

      {numbered ? (
        <Palette
          title="Цвет подзаголовков"
          value={block.accent}
          onChange={(c) => update(block.id, { accent: c })}
        />
      ) : (
        <Palette
          title="Цвет маркеров"
          value={block.accent}
          onChange={(c) => update(block.id, { accent: c })}
        />
      )}
      <Palette
        title="Цвет текста"
        value={block.color}
        onChange={(c) => update(block.id, { color: c })}
      />
    </>
  )
}

/* ------------------------------------------------------------------ quote */

function QuoteBody({ block }: { block: QuoteBlock }) {
  const update = useEditor((s) => s.updateBlock)
  const withDisplay = block.style === 'centerDisplay' || block.style === 'displayOnly'

  return (
    <>
      <Sec title="Вид цитаты">
        <div className="ins-chips">
          <Chip
            on={block.style === 'center'}
            title="Montserrat ExtraBold 96/88"
            onClick={() => update(block.id, { style: 'center' })}
          >
            Центр
          </Chip>
          <Chip
            on={block.style === 'topLeft'}
            title="Montserrat ExtraBold 80/80"
            onClick={() => update(block.id, { style: 'topLeft' })}
          >
            Слева
          </Chip>
          <Chip
            on={block.style === 'centerDisplay'}
            title="Акцент внутри фразы"
            onClick={() => update(block.id, { style: 'centerDisplay' })}
          >
            С акцентом
          </Chip>
          <Chip
            on={block.style === 'displayOnly'}
            title="Подводка + крупный акцент"
            onClick={() => update(block.id, { style: 'displayOnly' })}
          >
            Подводка
          </Chip>
        </div>
      </Sec>

      <div className="ins-sec">
        <textarea
          className="ins-field short"
          value={block.before}
          placeholder="Начало фразы"
          onChange={(e) => update(block.id, { before: e.target.value })}
        />
        <input
          className="ins-field one-line"
          value={block.display}
          placeholder="Акцентное слово"
          onChange={(e) => update(block.id, { display: e.target.value })}
        />
        {block.style !== 'displayOnly' ? (
          <textarea
            className="ins-field short"
            value={block.after}
            placeholder="Продолжение"
            onChange={(e) => update(block.id, { after: e.target.value })}
          />
        ) : null}
        <p className="ins-note">
          {withDisplay
            ? 'Акцентное слово набирается рукописным Rhythmic RUS.'
            : 'В этом виде части склеиваются в одно предложение одним шрифтом.'}
        </p>
      </div>

      <Palette title="Цвет" value={block.color} onChange={(c) => update(block.id, { color: c })} />
      {withDisplay ? (
        <Palette
          title="Цвет акцента"
          value={block.accent}
          onChange={(c) => update(block.id, { accent: c })}
        />
      ) : null}
    </>
  )
}

/* ---------------------------------------------------------------- caption */

function CaptionBody({ block }: { block: CaptionBlock }) {
  const update = useEditor((s) => s.updateBlock)
  const onSurface = block.style === 'card' || block.style === 'bubble'

  return (
    <>
      <Sec title="Вид подписи">
        <div className="ins-chips">
          <Chip on={block.style === 'text'} onClick={() => update(block.id, { style: 'text' })}>
            Текст
          </Chip>
          <Chip
            on={block.style === 'shadow'}
            title="Мягкое свечение под текстом — для фото"
            onClick={() => update(block.id, { style: 'shadow' })}
          >
            Ореол
          </Chip>
          <Chip on={block.style === 'card'} onClick={() => update(block.id, { style: 'card' })}>
            Карточка
          </Chip>
          <Chip on={block.style === 'bubble'} onClick={() => update(block.id, { style: 'bubble' })}>
            Облако
          </Chip>
        </div>
      </Sec>

      <div className="ins-sec">
        <textarea
          className="ins-field short"
          value={block.text}
          placeholder="Подпись"
          onChange={(e) => update(block.id, { text: e.target.value })}
        />
        <p className="ins-note">Montserrat Bold · 44/48, по центру</p>
      </div>

      <Palette
        title="Цвет текста"
        value={block.color}
        onChange={(c) => update(block.id, { color: c })}
      />
      {onSurface ? (
        <Palette
          title="Цвет подложки"
          value={block.surface}
          onChange={(c) => update(block.id, { surface: c })}
        />
      ) : null}
    </>
  )
}

/* ----------------------------------------------------------------- spacer */

function SpacerBody({ block }: { block: SpacerBlock }) {
  const update = useEditor((s) => s.updateBlock)
  return (
    <Sec title="Высота">
      <div className="ins-range">
        <input
          type="range"
          min={8}
          max={400}
          step={4}
          value={block.size}
          onChange={(e) => update(block.id, { size: Number(e.target.value) })}
        />
        <span>{block.size} px</span>
      </div>
    </Sec>
  )
}
