import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toCanvas } from 'html-to-image'
import JSZip from 'jszip'
import type { Project, Slide } from '../types'
import { FORMATS, hex } from '../design/tokens'
import { SlideView } from '../render/SlideView'
import { FONT_EMBED_CSS } from '../fonts/embedCss'

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

async function waitForImages(host: HTMLElement) {
  const imgs = Array.from(host.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((r) => {
            img.onload = () => r()
            img.onerror = () => r()
          })
    )
  )
}

/** Mounts one slide at its true pixel size off-screen and hands it to `fn`. */
async function withSlideNode<T>(
  slide: Slide,
  project: Project,
  fn: (node: HTMLElement) => Promise<T>
): Promise<T> {
  const host = document.createElement('div')
  host.setAttribute('data-export-host', '')
  host.style.cssText =
    'position:fixed;left:-30000px;top:0;width:2200px;pointer-events:none;opacity:1;'
  document.body.appendChild(host)
  const root = createRoot(host)
  // flushSync commits the tree synchronously — no requestAnimationFrame, which a
  // background tab would throttle to one frame per second during a long export.
  flushSync(() => {
    root.render(<SlideView slide={slide} project={project} />)
  })

  await document.fonts.ready
  await waitForImages(host)
  await tick()

  try {
    const node = host.querySelector('[data-slide-root]') as HTMLElement
    return await fn(node)
  } finally {
    root.unmount()
    host.remove()
  }
}

export type FileKind = 'png' | 'jpeg'

/**
 * The grain makes PNG compress badly (~2 MB a slide), so JPEG at 94 % is the
 * friendlier default for anything that is going straight into a post.
 */
export async function slideToBlob(
  slide: Slide,
  project: Project,
  scale = 1,
  kind: FileKind = 'png'
): Promise<Blob> {
  const format = FORMATS[project.format]
  return withSlideNode(slide, project, async (node) => {
    const canvas = await toCanvas(node, {
      width: format.width,
      height: format.height,
      pixelRatio: scale,
      cacheBust: false,
      fontEmbedCSS: FONT_EMBED_CSS,
      backgroundColor: hex(slide.bg),
      style: { margin: '0' },
    })
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось отрисовать слайд'))),
        kind === 'jpeg' ? 'image/jpeg' : 'image/png',
        kind === 'jpeg' ? 0.94 : undefined
      )
    })
  })
}

export const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const safeName = (s: string) =>
  s.trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-').slice(0, 48) || 'carousel'

export async function exportSlide(
  project: Project,
  index: number,
  scale = 1,
  kind: FileKind = 'png'
): Promise<void> {
  const slide = project.slides[index]
  const blob = await slideToBlob(slide, project, scale, kind)
  const n = String(index + 1).padStart(2, '0')
  download(blob, `${safeName(project.title)}-${n}.${kind === 'jpeg' ? 'jpg' : 'png'}`)
}

export async function exportAll(
  project: Project,
  scale = 1,
  kind: FileKind = 'png',
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const zip = new JSZip()
  const folder = zip.folder(safeName(project.title))!
  const ext = kind === 'jpeg' ? 'jpg' : 'png'
  for (let i = 0; i < project.slides.length; i++) {
    const blob = await slideToBlob(project.slides[i], project, scale, kind)
    folder.file(`${String(i + 1).padStart(2, '0')}.${ext}`, blob)
    onProgress?.(i + 1, project.slides.length)
  }
  const out = await zip.generateAsync({ type: 'blob' })
  download(out, `${safeName(project.title)}.zip`)
}

export async function copySlide(project: Project, index: number): Promise<void> {
  const blob = await slideToBlob(project.slides[index], project, 1)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export const exportProjectJson = (project: Project) =>
  download(
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
    `${safeName(project.title)}.lerun.json`
  )

export async function readProjectJson(file: File): Promise<Project> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Project
  if (!parsed?.slides?.length) throw new Error('Это не проект Lerun')
  return parsed
}

