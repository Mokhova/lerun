import type { Issue, Project, Slide } from '../types'
import { FORMATS, TYPE_SCALE, contrast, hex } from '../design/tokens'

/**
 * Glyphs that Rhythmic RUS does not contain. The browser silently falls back
 * to Gilroy for them, which looks like a mistake — so we flag it.
 */
const DISPLAY_MISSING = ['“', '”', '–', '[', ']', '№', '\\', '`']

const MAX_PATTERNS = 2
const MAX_COLORS = 3
const CONTRAST_MIN = 3.2

const textOf = (s: Slide) =>
  s.blocks
    .map((b) => {
      if (b.type === 'text') return b.text
      if (b.type === 'caption') return b.text
      if (b.type === 'quote') return [b.before, b.display, b.after].join(' ')
      if (b.type === 'list')
        return [b.header, ...b.items.map((i) => `${i.title} ${i.text}`)].join(' ')
      return ''
    })
    .join(' ')
    .trim()

export function validate(project: Project, overflow: Record<string, number>): Issue[] {
  const out: Issue[] = []
  const format = FORMATS[project.format]
  const push = (i: Issue) => out.push(i)

  project.slides.forEach((slide, index) => {
    const bg = hex(slide.bg)
    const over = overflow[slide.id] ?? 0

    if (over > 1) {
      push({
        level: 'error',
        slideId: slide.id,
        message: `Слайд ${index + 1}: контент не помещается в безопасную зону на ${Math.round(over)} px`,
        fix: 'Сократите текст, уменьшите кегль или разбейте слайд на два',
      })
    }

    if (slide.patterns.length > MAX_PATTERNS) {
      push({
        level: 'warn',
        slideId: slide.id,
        message: `Слайд ${index + 1}: ${slide.patterns.length} паттерна — фон перегружен`,
        fix: `Оставьте не больше ${MAX_PATTERNS}`,
      })
    }

    if (slide.photo && slide.photo.style !== 'trio' && !slide.photo.src) {
      push({
        level: 'warn',
        slideId: slide.id,
        message: `Слайд ${index + 1}: фото-слайд без картинки`,
        fix: 'Загрузите фото или смените шаблон',
      })
    }
    if (slide.photo?.style === 'trio' && slide.photo.srcs.filter(Boolean).length < 3) {
      push({
        level: 'warn',
        slideId: slide.id,
        message: `Слайд ${index + 1}: в ряду заполнены не все три фото`,
      })
    }

    const colors = new Set<string>()
    slide.blocks.forEach((b) => {
      if (b.type === 'text') colors.add(b.color)
      if (b.type === 'list') {
        colors.add(b.color)
        colors.add(b.accent)
      }
      if (b.type === 'quote') {
        colors.add(b.color)
        colors.add(b.accent)
      }
      if (b.type === 'caption') colors.add(b.color)
    })
    if (colors.size > MAX_COLORS) {
      push({
        level: 'warn',
        slideId: slide.id,
        message: `Слайд ${index + 1}: ${colors.size} цвета текста — рябит`,
        fix: `Держитесь ${MAX_COLORS} цветов: основной, акцент, приглушённый`,
      })
    }

    slide.blocks.forEach((block) => {
      const onPhoto = Boolean(slide.photo?.src) || Boolean(slide.photo?.srcs.length)

      if (block.type === 'text') {
        if (!block.text.trim()) {
          push({
            level: 'warn',
            slideId: slide.id,
            blockId: block.id,
            message: `Слайд ${index + 1}: пустой текстовый блок`,
            fix: 'Удалите его или впишите текст',
          })
        }
        const spec = TYPE_SCALE[block.variant]
        if (block.text.length > spec.maxChars) {
          push({
            level: 'warn',
            slideId: slide.id,
            blockId: block.id,
            message: `Слайд ${index + 1}: «${spec.label}» — слишком длинный текст (${block.text.length} зн.)`,
            fix: `Для этого стиля комфортно до ${spec.maxChars} знаков`,
          })
        }
        if (!onPhoto) {
          const ratio = contrast(hex(block.color), bg)
          if (ratio < CONTRAST_MIN) {
            push({
              level: 'warn',
              slideId: slide.id,
              blockId: block.id,
              message: `Слайд ${index + 1}: текст почти сливается с фоном (контраст ${ratio.toFixed(1)}:1)`,
              fix: 'Возьмите другой цвет из палитры или смените тему',
            })
          }
        }
        if (spec.family === 'display') {
          const bad = DISPLAY_MISSING.filter((c) => block.text.includes(c))
          if (bad.length) {
            push({
              level: 'warn',
              slideId: slide.id,
              blockId: block.id,
              message: `Слайд ${index + 1}: в рукописном шрифте нет знаков ${bad.join(' ')}`,
              fix: 'Замените на « » — или уберите',
            })
          }
        }
      }

      if (block.type === 'list' && block.items.length === 0) {
        push({
          level: 'warn',
          slideId: slide.id,
          blockId: block.id,
          message: `Слайд ${index + 1}: пустой список`,
        })
      }

      if (block.type === 'caption' && (block.style === 'card' || block.style === 'bubble')) {
        const ratio = contrast(hex(block.color), hex(block.surface))
        if (ratio < CONTRAST_MIN) {
          push({
            level: 'warn',
            slideId: slide.id,
            blockId: block.id,
            message: `Слайд ${index + 1}: подпись плохо читается на подложке (${ratio.toFixed(1)}:1)`,
          })
        }
      }
    })

    const hasPhoto = Boolean(slide.photo?.src || slide.photo?.srcs.some(Boolean))
    const plainTextOnPhoto = slide.blocks.some(
      (b) =>
        (b.type === 'text' && b.text.trim()) ||
        (b.type === 'caption' && b.style === 'text' && b.text.trim())
    )
    if (hasPhoto && plainTextOnPhoto && (slide.photo?.scrim ?? 0) < 0.15) {
      push({
        level: 'info',
        slideId: slide.id,
        message: `Слайд ${index + 1}: текст лежит прямо на фото`,
        fix: 'Добавьте затемнение в «Стиль» или возьмите подпись с ореолом / карточкой',
      })
    }

    if (!textOf(slide) && !slide.photo) {
      push({ level: 'info', slideId: slide.id, message: `Слайд ${index + 1}: пустой` })
    }
  })

  const first = project.slides[0]
  if (first) {
    const hasHook = first.blocks.some(
      (b) =>
        (b.type === 'text' && ['displayXL', 'display', 'h1', 'h2'].includes(b.variant)) ||
        b.type === 'quote'
    )
    if (!hasHook) {
      push({
        level: 'info',
        slideId: first.id,
        message: 'На первом слайде нет крупного заголовка — его пролистают',
        fix: 'Добавьте обложку с крупным заголовком',
      })
    }
  }

  if (project.slides.length > 10) {
    push({
      level: 'info',
      slideId: project.slides[10].id,
      message: `${project.slides.length} слайдов — в Telegram в один пост влезает 10`,
    })
  }
  if (project.slides.length > 20) {
    push({
      level: 'warn',
      slideId: project.slides[20].id,
      message: 'В Instagram-карусель влезает максимум 20 слайдов',
    })
  }

  if (format.width !== 1080) {
    push({ level: 'info', slideId: project.slides[0].id, message: 'Нестандартная ширина' })
  }

  return out
}

export const countBy = (issues: Issue[], level: Issue['level']) =>
  issues.filter((i) => i.level === level).length

export const issuesForSlide = (issues: Issue[], slideId: string) =>
  issues.filter((i) => i.slideId === slideId)
