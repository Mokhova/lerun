/**
 * Design tokens taken 1:1 from the Figma source of truth
 * «💚 Great Lerun» → Цвета / Шрифты / slide.
 * Nothing in the editor is allowed to invent values outside this file.
 */

/* ------------------------------------------------------------------ colors */

export type ColorId =
  | 'navy'
  | 'mint'
  | 'lime'
  | 'graphite'
  | 'ivory'
  | 'lavender'
  | 'lilac'
  | 'white'

export type Swatch = { id: ColorId; name: string; hex: string; note?: string }

export const PALETTE: Record<ColorId, Swatch> = {
  navy: { id: 'navy', name: 'Deep navy', hex: '#012742' },
  mint: { id: 'mint', name: 'Mint', hex: '#2ADE72' },
  lime: { id: 'lime', name: 'Lime', hex: '#E6FF83' },
  graphite: { id: 'graphite', name: 'Deep grey', hex: '#101820' },
  ivory: { id: 'ivory', name: 'Ivory', hex: '#EFEEE4' },
  lavender: { id: 'lavender', name: 'Lavender', hex: '#CDB4F1' },
  lilac: { id: 'lilac', name: 'Lilac', hex: '#9A62EB' },
  white: { id: 'white', name: 'White', hex: '#FFFFFF' },
}

export const PALETTE_ORDER: ColorId[] = [
  'navy',
  'mint',
  'lime',
  'graphite',
  'ivory',
  'lavender',
  'lilac',
  'white',
]

export const hex = (c: ColorId) => PALETTE[c].hex

/** The green the Figma decorations are drawn with (stroke of every pattern). */
export const PATTERN_DEFAULT = '#6DEE89'

/**
 * A Figma layer-blur radius and the CSS `blur()` standard deviation are not the
 * same unit. 0.3 is what lines the two up against the reference renders.
 */
export const FIGMA_BLUR = 0.3

/* -------------------------------------------------------------- typography */

export type FontFamily = 'display' | 'sans' | 'sansAlt'

export const FONT_STACK: Record<FontFamily, string> = {
  display: "'Rhythmic RUS', 'Gilroy', 'Montserrat', sans-serif",
  // The supplied Gilroy files contain Cyrillic glyphs; Montserrat fills Latin glyphs.
  sans: "'Gilroy', 'Montserrat', sans-serif",
  sansAlt: "'Montserrat Alternates', 'Montserrat', 'Gilroy', sans-serif",
}

export type TextVariant =
  | 'displayXL'
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyL'
  | 'body'
  | 'caption'

export type TypeSpec = {
  id: TextVariant
  label: string
  hint: string
  family: FontFamily
  size: number
  lineHeight: number
  weight: number
  italic?: boolean
  /** soft limit — above this the lint warns that the style is being misused */
  maxChars: number
}

/**
 * «Размерная сетка» from the Figma file (node 75:4887) plus the two body
 * sizes the real components use (40/44 and 44/48).
 */
export const TYPE_SCALE: Record<TextVariant, TypeSpec> = {
  displayXL: {
    id: 'displayXL',
    label: 'Обложка',
    hint: 'Rhythmic RUS · 144/116 — только для первого слайда',
    family: 'display',
    size: 144,
    lineHeight: 116,
    weight: 400,
    maxChars: 42,
  },
  display: {
    id: 'display',
    label: 'Рукописный заголовок',
    hint: 'Rhythmic RUS · 80/64',
    family: 'display',
    size: 80,
    lineHeight: 64,
    weight: 400,
    maxChars: 90,
  },
  h1: {
    id: 'h1',
    label: 'Крупный заголовок',
    hint: 'Gilroy Bold · 96/88',
    family: 'sans',
    size: 96,
    lineHeight: 88,
    weight: 800,
    maxChars: 110,
  },
  h2: {
    id: 'h2',
    label: 'Заголовок',
    hint: 'Gilroy Bold · 80/80',
    family: 'sans',
    size: 80,
    lineHeight: 80,
    weight: 800,
    maxChars: 150,
  },
  h3: {
    id: 'h3',
    label: 'Подзаголовок',
    hint: 'Gilroy Bold · 60/54',
    family: 'sans',
    size: 60,
    lineHeight: 54,
    weight: 700,
    maxChars: 220,
  },
  bodyL: {
    id: 'bodyL',
    label: 'Текст крупный',
    hint: 'Gilroy Medium · 44/48',
    family: 'sans',
    size: 44,
    lineHeight: 48,
    weight: 500,
    maxChars: 420,
  },
  body: {
    id: 'body',
    label: 'Текст',
    hint: 'Gilroy Medium · 40/44',
    family: 'sans',
    size: 40,
    lineHeight: 44,
    weight: 500,
    maxChars: 520,
  },
  caption: {
    id: 'caption',
    label: 'Сноска',
    hint: 'Gilroy Regular · 32/32',
    family: 'sans',
    size: 32,
    lineHeight: 32,
    weight: 400,
    maxChars: 160,
  },
}

export const TEXT_VARIANTS: TextVariant[] = [
  'displayXL',
  'display',
  'h1',
  'h2',
  'h3',
  'bodyL',
  'body',
  'caption',
]

/* ------------------------------------------------------------------ canvas */

export type FormatId = 'post45' | 'square' | 'landscape169' | 'story'

export type FormatSpec = {
  id: FormatId
  label: string
  hint: string
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
  /** vertical centre of the footer line, measured from the top */
  footerTop: number
}

/**
 * post45 is the Figma `slide` component: 1080×1440, padding 160/120/180/120,
 * content box 840×1100, footer baseline at y=1348.
 */
export const FORMATS: Record<FormatId, FormatSpec> = {
  post45: {
    id: 'post45',
    label: '4:5 — пост',
    hint: '1080×1440 · основной формат из макета',
    width: 1080,
    height: 1440,
    padding: { top: 160, right: 120, bottom: 180, left: 120 },
    footerTop: 1348,
  },
  square: {
    id: 'square',
    label: '1:1 — квадрат',
    hint: '1080×1080 · для Telegram',
    width: 1080,
    height: 1080,
    padding: { top: 120, right: 120, bottom: 150, left: 120 },
    footerTop: 988,
  },
  landscape169: {
    id: 'landscape169',
    label: '16:9 — горизонтальный',
    hint: '1080×608 · горизонтальный формат',
    width: 1080,
    height: 608,
    padding: { top: 48, right: 90, bottom: 64, left: 90 },
    footerTop: 568,
  },
  story: {
    id: 'story',
    label: '9:16 — сторис',
    hint: '1080×1920 · вертикаль',
    width: 1080,
    height: 1920,
    padding: { top: 300, right: 120, bottom: 300, left: 120 },
    footerTop: 1808,
  },
}

export const FORMAT_ORDER: FormatId[] = ['post45', 'square', 'landscape169', 'story']

export const contentBox = (f: FormatSpec) => ({
  width: f.width - f.padding.left - f.padding.right,
  height: f.height - f.padding.top - f.padding.bottom,
})

/** Gaps used by the Figma components, exposed as the only allowed rhythm. */
export const GAPS = [0, 12, 16, 32, 40, 60, 88, 120] as const
export const DEFAULT_GAP = 60

/* ------------------------------------------------------------- color utils */

export const toRgb = (h: string) => {
  const v = h.replace('#', '')
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

const channel = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export const luminance = (h: string) => {
  const { r, g, b } = toRgb(h)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1…21 */
export const contrast = (a: string, b: string) => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export const isDark = (h: string) => luminance(h) < 0.4

export const rgba = (h: string, a: number) => {
  const { r, g, b } = toRgb(h)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
