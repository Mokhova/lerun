import type { ColorId, FormatId, TextVariant } from './design/tokens'
import type { PatternId } from './design/patterns'

export type Align = 'left' | 'center' | 'right'
export type Distribute = 'top' | 'center' | 'between' | 'bottom'
export type NoiseStyle = 'none' | 'warm' | 'black'

/* ------------------------------------------------------------------ blocks */

export type TextBlock = {
  id: string
  type: 'text'
  variant: TextVariant
  text: string
  color: ColorId
  align: Align
  /** Montserrat Alternates instead of Montserrat (brand-approved alt cut) */
  alt?: boolean
  italic?: boolean
  uppercase?: boolean
  muted?: boolean
}

export type ListItem = { id: string; title: string; text: string }

export type ListBlock = {
  id: string
  type: 'list'
  /** bullet — маркированный; numbered — «1. Навык» рукописным + абзац */
  style: 'bullet' | 'numbered'
  marker: 'star' | 'dot'
  header: string
  showHeader: boolean
  items: ListItem[]
  color: ColorId
  accent: ColorId
}

export type QuoteStyle = 'topLeft' | 'center' | 'centerDisplay' | 'displayOnly'

export type QuoteBlock = {
  id: string
  type: 'quote'
  style: QuoteStyle
  /** before / display / after — the three slots of the Figma Quote component */
  before: string
  display: string
  after: string
  color: ColorId
  accent: ColorId
}

export type CaptionStyle = 'text' | 'shadow' | 'card' | 'bubble'

export type CaptionBlock = {
  id: string
  type: 'caption'
  style: CaptionStyle
  text: string
  color: ColorId
  surface: ColorId
}

export type SpacerBlock = { id: string; type: 'spacer'; size: number }

export type Block =
  | TextBlock
  | ListBlock
  | QuoteBlock
  | CaptionBlock
  | SpacerBlock

export type BlockType = Block['type']

/* --------------------------------------------------------------- decoration */

export type PatternInstance = {
  id: string
  pattern: PatternId
  /** centre position in slide pixels */
  x: number
  y: number
  scale: number
  rotation: number
  color: ColorId | 'brand'
  opacity: number
  blur: number
  flipX: boolean
  flipY: boolean
  /** render above the content instead of behind it */
  front: boolean
}

/**
 * The four photo layouts of the Figma `photo` component (node 173:229):
 * full 1080×1440 · rounded r184 · trio 3×(333×760) r140 · card 840×900 r184.
 */
export type PhotoStyle = 'full' | 'rounded' | 'trio' | 'card'

export type SlidePhoto = {
  style: PhotoStyle
  src: string
  /** used by the `trio` layout */
  srcs: string[]
  scale: number
  offsetX: number
  offsetY: number
  /** затемнение снизу, чтобы подпись читалась */
  scrim: number
}

/* ------------------------------------------------------------------ slides */

export type Slide = {
  id: string
  name: string
  bg: ColorId
  blocks: Block[]
  gap: number
  distribute: Distribute
  noise: NoiseStyle
  noiseIntensity: number
  patterns: PatternInstance[]
  photo: SlidePhoto | null
  showFooter: boolean
}

export type Project = {
  id: string
  title: string
  format: FormatId
  footerText: string
  slides: Slide[]
  updatedAt: number
}

/* -------------------------------------------------------------------- lint */

export type IssueLevel = 'error' | 'warn' | 'info'

export type Issue = {
  level: IssueLevel
  slideId: string
  blockId?: string
  message: string
  fix?: string
}
