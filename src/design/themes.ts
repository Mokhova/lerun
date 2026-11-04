/**
 * Pre-checked colour combinations. The editor never offers a free colour
 * picker: a user picks a theme, and every colour on the slide comes from one
 * of these quartets. All of them are lifted from the «Примеры комбинаций
 * цветов» row of the Figma file and pass WCAG AA for body text.
 */
import type { ColorId } from './tokens'
import type { NoiseStyle } from '../types'

export type Theme = {
  id: string
  name: string
  bg: ColorId
  text: ColorId
  accent: ColorId
  pattern: ColorId
  noise: NoiseStyle
}

export const THEMES: Theme[] = [
  {
    id: 'ivory',
    name: 'Айвори',
    bg: 'ivory',
    text: 'graphite',
    accent: 'lilac',
    pattern: 'mint',
    noise: 'warm',
  },
  {
    id: 'paper',
    name: 'Белый',
    bg: 'white',
    text: 'graphite',
    accent: 'lilac',
    pattern: 'lavender',
    noise: 'warm',
  },
  {
    id: 'lime',
    name: 'Лайм',
    bg: 'lime',
    text: 'graphite',
    accent: 'lilac',
    pattern: 'mint',
    noise: 'black',
  },
  {
    id: 'lavender',
    name: 'Лаванда',
    bg: 'lavender',
    text: 'graphite',
    accent: 'lilac',
    pattern: 'white',
    noise: 'black',
  },
  {
    id: 'navy',
    name: 'Ночной',
    bg: 'navy',
    text: 'white',
    accent: 'mint',
    pattern: 'mint',
    noise: 'black',
  },
  {
    id: 'graphite',
    name: 'Графит',
    bg: 'graphite',
    text: 'white',
    accent: 'lime',
    pattern: 'mint',
    noise: 'black',
  },
  {
    id: 'lilac',
    name: 'Сирень',
    bg: 'lilac',
    text: 'white',
    accent: 'lime',
    pattern: 'lavender',
    noise: 'black',
  },
  {
    id: 'mint',
    name: 'Мята',
    bg: 'mint',
    text: 'navy',
    accent: 'navy',
    pattern: 'white',
    noise: 'black',
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<
  string,
  Theme
>

export const DEFAULT_THEME = THEMES[0]

/** Which theme does this slide currently look like? Used to highlight the UI. */
export const matchTheme = (bg: ColorId): Theme | undefined =>
  THEMES.find((t) => t.bg === bg)
