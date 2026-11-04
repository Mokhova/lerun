import { useMemo } from 'react'
import { useEditor } from '../store/useEditor'
import {
  makeList,
  makeText,
  nid,
  TEMPLATE_BY_ID,
} from '../design/templates'
import type { Block, Slide } from '../types'
import { DEFAULT_GAP } from '../design/tokens'
import type { Theme } from '../design/themes'
import { slides as slideCount } from '../lib/plural'
import { Modal } from './controls'

const BULLET = /^\s*(?:[-–—•*]|\d+[.)])\s+/

const SAMPLE = `Как научиться говорить «нет»

И что будет, если не говорить
---
Говорить «нет» — такой же навык, как и всё остальное. Если вы не будете его тренировать, ничего само не случится.
---
1. Заметить момент
Пауза перед ответом — уже половина дела.
2. Назвать причину
Без оправданий: «не успею», «не моя зона».
3. Предложить альтернативу
Это снимает чувство вины у обеих сторон.
---
Сохрани, чтобы не потерять`

/** Splits pasted text into slides: `---` is an explicit break, blank lines group paragraphs. */
function buildSlides(raw: string, theme: Theme): Slide[] {
  const chunks = raw
    .split(/\n\s*---+\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean)

  return chunks.map((chunk, index) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    const bullets = lines.filter((l) => BULLET.test(l))
    const blocks: Block[] = []

    if (bullets.length >= 2) {
      const list = makeList(theme, lines.some((l) => /^\d+[.)]/.test(l)) ? 'numbered' : 'bullet')
      const head = lines[0] && !BULLET.test(lines[0]) ? lines[0] : ''
      list.header = head
      list.showHeader = Boolean(head)
      list.items = []
      let current: { id: string; title: string; text: string } | null = null
      for (const line of lines) {
        if (line === head) continue
        if (BULLET.test(line)) {
          current = {
            id: nid(),
            title: line.replace(/\s+$/, ''),
            text: '',
          }
          if (list.style === 'bullet') {
            current.text = line.replace(BULLET, '')
            current.title = ''
          }
          list.items.push(current)
        } else if (current) {
          current.text = current.text ? `${current.text} ${line}` : line
        }
      }
      blocks.push(list)
      return {
        ...TEMPLATE_BY_ID.blank.make(theme),
        id: nid(),
        name: 'Список',
        blocks,
        gap: 0,
      }
    }

    if (index === 0) {
      const cover = TEMPLATE_BY_ID.cover.make(theme)
      const [title, ...rest] = lines
      cover.blocks = [
        makeText('displayXL', title ?? '', theme.text),
        ...(rest.length
          ? [makeText('bodyL', rest.join(' '), theme.text, { muted: true })]
          : []),
      ]
      return cover
    }

    const [first, ...rest] = lines
    const headerish = first && first.length < 56 && rest.length > 0
    if (headerish) {
      blocks.push(makeText('display', first, theme.text))
      blocks.push(makeText('body', rest.join('\n'), theme.text))
    } else if (lines.length === 1 && lines[0].length < 70) {
      blocks.push(makeText('h2', lines[0], theme.text))
    } else {
      blocks.push(makeText('body', lines.join('\n'), theme.text))
    }

    return {
      ...TEMPLATE_BY_ID.blank.make(theme),
      id: nid(),
      name: 'Текст',
      blocks,
      gap: DEFAULT_GAP,
      distribute: lines.length === 1 ? ('center' as const) : ('top' as const),
    }
  })
}

export function TextImport({
  text,
  onText,
  onClose,
  toast,
}: {
  text: string
  onText: (v: string) => void
  onClose: () => void
  toast: (m: string) => void
}) {
  const theme = useEditor((s) => s.theme)
  const project = useEditor((s) => s.project)
  const replaceProject = useEditor((s) => s.replaceProject)

  // the button counts real slides, so nobody has to guess what the click does
  const built = useMemo(() => buildSlides(text, theme), [text, theme])

  const apply = () => {
    if (!built.length) return
    replaceProject({ ...project, slides: built, updatedAt: Date.now() })
    toast(`Собрано ${slideCount(built.length)} · ⌘Z вернёт прежнюю карусель`)
    onText('')
    onClose()
  }

  return (
    <Modal
      title="Текст → карусель"
      width={720}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={() => onText(SAMPLE)}>
            Подставить пример
          </button>
          <button className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" onClick={apply} disabled={!built.length}>
            {built.length
              ? `Заменить на ${slideCount(built.length)}`
              : 'Собрать карусель'}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <p className="hint" style={{ fontSize: 12.5 }}>
          Вставьте готовый текст поста — редактор разложит его по слайдам.
          <br />
          <span className="kbd">---</span> на отдельной строке — разрыв между слайдами.
          Строки с <span className="kbd">1.</span> или <span className="kbd">—</span> превращаются
          в список. Первый кусок становится обложкой.
        </p>
        <textarea
          className="field"
          style={{ minHeight: 320, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5 }}
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Вставьте текст поста сюда"
        />
        <p className="warn-line">
          <span aria-hidden="true">⚠</span>
          <span>
            {built.length
              ? `Текущие ${slideCount(project.slides.length)} будут заменены на ${slideCount(
                  built.length
                )}. ⌘Z вернёт прежнюю карусель.`
              : `Текущие ${slideCount(project.slides.length)} будут заменены. ⌘Z вернёт прежнюю карусель.`}
          </span>
        </p>
      </div>
    </Modal>
  )
}
