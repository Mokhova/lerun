import type { SlidePhoto } from '../types'
import type { FormatSpec } from '../design/tokens'

/** Geometry of the four photo layouts, straight from Figma node 173:229. */
const TRIO = { top: 200, gap: 20, pad: 20, width: 333, height: 760, radius: 140 }
const CARD = { x: 120, y: 120, width: 840, height: 900, radius: 184 }

const Placeholder = ({ label }: { label: string }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // neutral grey so the placeholder reads on both light and dark slides
      background: 'rgba(128,128,128,0.18)',
      border: '4px dashed rgba(128,128,128,0.55)',
      color: 'rgba(128,128,128,1)',
      fontFamily: "'Gilroy', 'Montserrat', sans-serif",
      fontWeight: 600,
      fontSize: 34,
      textAlign: 'center',
      lineHeight: 1.2,
      padding: 24,
      boxSizing: 'border-box',
    }}
  >
    {label}
  </div>
)

const Img = ({ src, photo, label }: { src: string; photo: SlidePhoto; label: string }) =>
  src ? (
    <img
      src={src}
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: `${50 + photo.offsetX}% ${50 + photo.offsetY}%`,
        transform: photo.scale !== 1 ? `scale(${photo.scale})` : undefined,
        display: 'block',
      }}
    />
  ) : (
    <Placeholder label={label} />
  )

export function PhotoLayer({ photo, format }: { photo: SlidePhoto; format: FormatSpec }) {
  const scrim =
    photo.scrim > 0 ? (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(16,24,32,0) 35%, rgba(16,24,32,${photo.scrim}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    ) : null

  if (photo.style === 'trio') {
    const scaleX = format.width / 1080
    return (
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (TRIO.pad + i * (TRIO.width + TRIO.gap)) * scaleX,
              top: TRIO.top,
              width: TRIO.width * scaleX,
              height: TRIO.height,
              borderRadius: TRIO.radius,
              overflow: 'hidden',
            }}
          >
            <Img src={photo.srcs[i] ?? ''} photo={photo} label={`Фото ${i + 1}`} />
          </div>
        ))}
      </div>
    )
  }

  if (photo.style === 'card') {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: format.width - CARD.x * 2,
          height: CARD.height,
          borderRadius: CARD.radius,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <Img src={photo.src} photo={photo} label="Перетащите фото" />
        {scrim}
      </div>
    )
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: photo.style === 'rounded' ? 184 : 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <Img src={photo.src} photo={photo} label="Перетащите фото сюда" />
      {scrim}
    </div>
  )
}
