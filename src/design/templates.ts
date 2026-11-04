/**
 * Ready-made slides. A user who knows nothing about design starts from one of
 * these, retypes the words and is still inside the guidelines.
 */
import { nanoid } from 'nanoid'
import type {
  Block,
  CaptionBlock,
  ListBlock,
  PatternInstance,
  QuoteBlock,
  Slide,
  SlidePhoto,
  SpacerBlock,
  TextBlock,
} from '../types'
import type { ColorId, TextVariant } from './tokens'
import { DEFAULT_GAP } from './tokens'
import type { Theme } from './themes'
import { DEFAULT_THEME } from './themes'
import { PATTERNS, type PatternId } from './patterns'

export const nid = () => nanoid(10)

/* ---------------------------------------------------------- block factories */

export const makeText = (
  variant: TextVariant,
  text: string,
  color: ColorId,
  extra: Partial<TextBlock> = {}
): TextBlock => ({
  id: nid(),
  type: 'text',
  variant,
  text,
  color,
  align: 'left',
  ...extra,
})

export const makeList = (theme: Theme, style: ListBlock['style'] = 'numbered'): ListBlock => ({
  id: nid(),
  type: 'list',
  style,
  marker: 'star',
  header: 'Как научиться говорить «нет»',
  showHeader: style === 'bullet',
  items: [1, 2, 3].map((i) => ({
    id: nid(),
    title: `${i}. Навык`,
    text: 'Говорить «нет» — такой же навык, как и всё остальное, если вы не будете его тренировать, ничего само не случится.',
  })),
  color: theme.text,
  // Figma draws both the numbered sub-headers and the ✷ markers in the ink
  // colour; the accent stays available as a deliberate choice.
  accent: theme.text,
})

export const makeQuote = (theme: Theme, style: QuoteBlock['style'] = 'center'): QuoteBlock => ({
  id: nid(),
  type: 'quote',
  style,
  before: 'Могу подтвердить и с обратной стороны:',
  display: 'инициатива',
  after: 'располагает к себе',
  color: theme.text,
  accent: theme.accent,
})

export const makeCaption = (theme: Theme, style: CaptionBlock['style'] = 'card'): CaptionBlock => ({
  id: nid(),
  type: 'caption',
  style,
  text: 'Могу подтвердить и с обратной стороны — инициатива располагает к себе',
  color: theme.text,
  surface: 'ivory',
})

export const emptyPhoto = (style: SlidePhoto['style'] = 'full'): SlidePhoto => ({
  style,
  src: '',
  srcs: [],
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  scrim: 0,
})

export const makeSpacer = (size = 60): SpacerBlock => ({ id: nid(), type: 'spacer', size })

export const makePattern = (
  pattern: PatternId,
  patch: Partial<PatternInstance> = {}
): PatternInstance => {
  const def = PATTERNS.find((p) => p.id === pattern)!
  return {
    id: nid(),
    pattern,
    x: 540,
    y: 1080,
    scale: 1,
    rotation: 0,
    color: 'brand',
    opacity: 1,
    blur: def.blur,
    flipX: false,
    flipY: false,
    front: false,
    ...patch,
  }
}

/* ------------------------------------------------------------- slide maker */

const base = (theme: Theme, name: string, blocks: Block[], patch: Partial<Slide> = {}): Slide => ({
  id: nid(),
  name,
  bg: theme.bg,
  blocks,
  gap: DEFAULT_GAP,
  distribute: 'top',
  noise: theme.noise,
  noiseIntensity: 1,
  patterns: [],
  photo: null,
  showFooter: true,
  ...patch,
})

export type TemplateId =
  | 'cover'
  | 'coverSans'
  | 'text'
  | 'numbered'
  | 'bullets'
  | 'quote'
  | 'quoteDisplay'
  | 'photo'
  | 'photoTrio'
  | 'cta'
  | 'blank'

export type Template = {
  id: TemplateId
  name: string
  hint: string
  make: (theme: Theme) => Slide
}

export const TEMPLATES: Template[] = [
  {
    id: 'cover',
    name: 'Обложка',
    hint: 'Крупный рукописный заголовок — первый слайд карусели',
    make: (t) =>
      base(
        t,
        'Обложка',
        [
          makeText('displayXL', 'Как дружить?', t.text),
          makeText('bodyL', 'И что будет, если не дружить', t.text, { muted: true }),
        ],
        {
          distribute: 'between',
          patterns: [
            makePattern('pattern07', { x: 620, y: 1120, scale: 1, color: t.pattern }),
          ],
        }
      ),
  },
  {
    id: 'coverSans',
    name: 'Обложка-плакат',
    hint: 'Жирный Montserrat во весь слайд',
    make: (t) =>
      base(t, 'Обложка', [makeText('h1', 'Как научиться\nговорить «нет»', t.text)], {
        distribute: 'center',
        patterns: [makePattern('pattern10', { x: 540, y: 1180, color: t.pattern })],
      }),
  },
  {
    id: 'text',
    name: 'Текст',
    hint: 'Рукописный заголовок + абзац',
    make: (t) =>
      base(t, 'Текст', [
        makeText('display', 'Как научиться говорить «нет»', t.text),
        makeText(
          'body',
          'Говорить «нет» — такой же навык, как и всё остальное, если вы не будете его тренировать, ничего само не случится.',
          t.text
        ),
      ]),
  },
  {
    id: 'numbered',
    name: 'Список с шагами',
    hint: '«1. Навык» рукописным + пояснение',
    make: (t) => base(t, 'Список', [makeList(t, 'numbered')], { gap: 0 }),
  },
  {
    id: 'bullets',
    name: 'Маркированный список',
    hint: 'Заголовок + пункты со звёздочкой',
    make: (t) => base(t, 'Список', [makeList(t, 'bullet')], { gap: 0 }),
  },
  {
    id: 'quote',
    name: 'Цитата',
    hint: 'Крупная мысль по центру',
    make: (t) => base(t, 'Цитата', [makeQuote(t, 'center')], { distribute: 'center' }),
  },
  {
    id: 'quoteDisplay',
    name: 'Цитата с акцентом',
    hint: 'Ключевое слово рукописным шрифтом',
    make: (t) =>
      base(t, 'Цитата', [makeQuote(t, 'centerDisplay')], { distribute: 'center' }),
  },
  {
    id: 'photo',
    name: 'Фото на весь слайд',
    hint: 'Картинка + подпись внизу',
    make: (t) =>
      base(t, 'Фото', [makeCaption(t, 'card')], {
        distribute: 'bottom',
        photo: emptyPhoto('full'),
      }),
  },
  {
    id: 'photoTrio',
    name: 'Три фото',
    hint: 'Ряд картинок + подпись',
    make: (t) =>
      base(t, 'Фото', [makeCaption(t, 'text')], {
        distribute: 'bottom',
        photo: emptyPhoto('trio'),
      }),
  },
  {
    id: 'cta',
    name: 'Финал',
    hint: 'Призыв к действию — последний слайд',
    make: (t) =>
      base(
        t,
        'Финал',
        [
          makeText('h2', 'Сохрани,\nчтобы не потерять', t.text),
          makeText('bodyL', 'И подпишись — здесь про то, как не выгорать.', t.text, {
            muted: true,
          }),
        ],
        {
          distribute: 'center',
          patterns: [makePattern('pattern06', { x: 540, y: 1150, color: t.pattern })],
        }
      ),
  },
  {
    id: 'blank',
    name: 'Пустой',
    hint: 'Чистый слайд с сеткой макета',
    make: (t) => base(t, 'Слайд', []),
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
) as Record<TemplateId, Template>

export const starterSlides = (theme: Theme = DEFAULT_THEME): Slide[] => [
  TEMPLATE_BY_ID.cover.make(theme),
  TEMPLATE_BY_ID.text.make(theme),
  TEMPLATE_BY_ID.numbered.make(theme),
  TEMPLATE_BY_ID.cta.make(theme),
]
