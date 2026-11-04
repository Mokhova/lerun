/**
 * Reproduces the Figma NOISE effect (monotone, noiseSize 2, density 1) plus the
 * 20 %-opacity linear sheen that sits under it on the `noise` component
 * (node 238:246). Rendered once into a canvas tile and reused as a data URI so
 * that the PNG export gets exactly the same grain as the preview.
 */
import type { NoiseStyle } from '../types'

const TILE = 256
/** Figma noiseSize = 2 → each grain cell is 2×2 px of the 1080-wide artboard */
const CELL = 2

const cache = new Map<string, string>()

const COLORS: Record<Exclude<NoiseStyle, 'none'>, [number, number, number]> = {
  warm: [177, 172, 129],
  black: [0, 0, 0],
}

/** Angle derived from the Figma gradientTransform of both noise styles. */
export const SHEEN_ANGLE = 143

export const SHEEN: Record<Exclude<NoiseStyle, 'none'>, string> = {
  warm: `linear-gradient(${SHEEN_ANGLE}deg, rgba(217,197,166,0.20) 0%, rgba(255,255,255,0) 100%)`,
  black: `linear-gradient(${SHEEN_ANGLE}deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 100%)`,
}

export function noiseTile(style: Exclude<NoiseStyle, 'none'>, intensity = 1): string {
  const key = `${style}:${intensity.toFixed(2)}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = TILE
  canvas.height = TILE
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(TILE, TILE)
  const [r, g, b] = COLORS[style]
  const peak = 0.16 * intensity

  for (let y = 0; y < TILE; y += CELL) {
    for (let x = 0; x < TILE; x += CELL) {
      const a = Math.round(Math.random() * peak * 255)
      for (let dy = 0; dy < CELL; dy++) {
        for (let dx = 0; dx < CELL; dx++) {
          const i = ((y + dy) * TILE + (x + dx)) * 4
          img.data[i] = r
          img.data[i + 1] = g
          img.data[i + 2] = b
          img.data[i + 3] = a
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  return url
}

export const NOISE_LABELS: Record<NoiseStyle, string> = {
  none: 'Без шума',
  warm: 'Тёплый',
  black: 'Графитовый',
}
