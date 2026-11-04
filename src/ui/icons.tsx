/**
 * Panel glyphs. The five below are drawn from the Figma geometry (1px strokes,
 * 45° heads); the rest ship as SVG files exported from the same file and live
 * in `public/icons`.
 */

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1,
  fill: 'none',
} as const

export const CloseGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4.1 4.1 11.9 11.9M11.9 4.1 4.1 11.9" {...stroke} />
  </svg>
)

export const CopyGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="2.7" y="3.2" width="8" height="8" {...stroke} />
    <rect x="6.3" y="5.8" width="8" height="8" {...stroke} />
  </svg>
)

export const ArrowUpGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 3.2V12.5M4.5 6.7 8 3.2l3.5 3.5" {...stroke} />
  </svg>
)

export const ArrowDownGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 12.8V3.5M4.5 9.3 8 12.8l3.5-3.5" {...stroke} />
  </svg>
)

export const ChevronGlyph = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    style={{ transform: open ? undefined : 'scaleY(-1)' }}
  >
    <path d="M4.5 10 8 6.5l3.5 3.5" {...stroke} />
  </svg>
)

/** Exported straight from the design file — never recoloured or resized. */
export const GridIcon = () => <img src={`${import.meta.env.BASE_URL}icons/grid.svg`} width={16} height={16} alt="" />
export const AlignLeftIcon = () => (
  <img src={`${import.meta.env.BASE_URL}icons/align-left.svg`} width={16} height={16} alt="" />
)
export const AlignCenterIcon = () => (
  <img src={`${import.meta.env.BASE_URL}icons/align-center.svg`} width={16} height={16} alt="" />
)
export const AlignRightIcon = () => (
  <img src={`${import.meta.env.BASE_URL}icons/align-right.svg`} width={16} height={16} alt="" />
)
export const OpacityIcon = () => <img src={`${import.meta.env.BASE_URL}icons/opacity.svg`} width={16} height={16} alt="" />
export const CapsIcon = () => <img src={`${import.meta.env.BASE_URL}icons/caps.svg`} width={13.0516} height={7} alt="" />
