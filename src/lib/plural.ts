/** Russian plural: plural(1, 'слайд', 'слайда', 'слайдов') → 'слайд'. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

export const slides = (n: number) => `${n} ${plural(n, 'слайд', 'слайда', 'слайдов')}`
