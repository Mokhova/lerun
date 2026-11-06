import { create } from 'zustand'
import type {
  Align,
  Block,
  BlockType,
  ListItem,
  PatternInstance,
  Project,
  Slide,
  SlidePhoto,
} from '../types'
import type { ColorId, FormatId } from '../design/tokens'
import { DEFAULT_GAP, FORMATS } from '../design/tokens'
import type { PatternId } from '../design/patterns'
import { DEFAULT_SPOT, PATTERNS, PATTERN_SPOTS, neighbourSpot } from '../design/patterns'
import { DEFAULT_THEME, THEME_BY_ID, type Theme } from '../design/themes'
import {
  makeCaption,
  emptyPhoto,
  makeList,
  makePattern,
  makeQuote,
  makeSpacer,
  makeText,
  nid,
  starterSlides,
  TEMPLATE_BY_ID,
  type TemplateId,
} from '../design/templates'
import { idbRead, idbWrite } from '../lib/idb'

const SAVE_KEY = 'project:current'
const HISTORY_LIMIT = 80

export const newProject = (theme: Theme = DEFAULT_THEME): Project => ({
  id: nid(),
  title: 'Новая карусель',
  format: 'post45',
  footerText: 'тгк Рефлексант',
  slides: starterSlides(theme),
  updatedAt: Date.now(),
})

type Selection = {
  slideId: string
  blockId: string | null
  patternId: string | null
}

/** What the top bar says out loud about the last write. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

/**
 * `unreadable` is the dangerous one: storage did not answer, so there may well
 * be a carousel in there. Autosave stays off until the user decides.
 */
export type StorageState = 'loading' | 'ok' | 'unreadable'

export type EditorState = {
  project: Project
  theme: Theme
  sel: Selection
  past: Project[]
  future: Project[]
  ready: boolean
  saveState: SaveState
  savedAt: number | null
  storage: StorageState
  storageError: string | null
  /** slideId → px of content that does not fit the safe area */
  overflow: Record<string, number>
  zoom: number | 'fit'
  showGuides: boolean
  panel: 'content' | 'style' | 'decor' | 'check'

  hydrate: () => Promise<void>
  /** re-read storage after the user closed the other tab */
  retryStorage: () => Promise<void>
  /** give up on the unreadable copy and start autosaving over it */
  startFresh: () => void
  replaceProject: (p: Project) => void
  resetProject: () => void

  setTitle: (v: string) => void
  setFormat: (v: FormatId) => void
  setFooterText: (v: string) => void

  selectSlide: (id: string) => void
  stepSlide: (dir: -1 | 1) => void
  selectBlock: (id: string | null) => void
  selectPattern: (id: string | null) => void
  setPanel: (p: EditorState['panel']) => void
  setZoom: (z: number | 'fit') => void
  toggleGuides: () => void

  addSlide: (template: TemplateId, at?: number) => void
  duplicateSlide: (id: string) => void
  deleteSlide: (id: string) => void
  moveSlide: (from: number, to: number) => void
  updateSlide: (id: string, patch: Partial<Slide>) => void
  applyTheme: (themeId: string, scope: 'slide' | 'all') => void
  setDefaultTheme: (themeId: string) => void

  addBlock: (type: BlockType) => void
  duplicateBlock: (blockId: string) => void
  /** used by on-canvas drag-to-reorder */
  moveBlockTo: (blockId: string, index: number) => void
  updateBlock: (blockId: string, patch: Partial<Block>) => void
  /** arrow keys: step a text block one notch across the slide */
  alignBlock: (blockId: string, dir: 'left' | 'right') => void
  deleteBlock: (blockId: string) => void
  moveBlock: (blockId: string, dir: -1 | 1) => void

  addItem: (blockId: string) => void
  updateItem: (blockId: string, itemId: string, patch: Partial<ListItem>) => void
  deleteItem: (blockId: string, itemId: string) => void
  moveItem: (blockId: string, itemId: string, dir: -1 | 1) => void

  addPattern: (pattern: PatternId, patch?: Partial<PatternInstance>) => void
  /** arrow keys: send a pattern to the next named spot in that direction */
  movePatternBy: (patternId: string, dx: -1 | 0 | 1, dy: -1 | 0 | 1) => void
  updatePattern: (patternId: string, patch: Partial<PatternInstance>) => void
  deletePattern: (patternId: string) => void

  setPhoto: (src: string, index?: number) => void
  setPhotoStyle: (style: SlidePhoto['style']) => void
  /** drag-and-drop / paste: puts the image wherever it makes sense */
  dropPhoto: (src: string) => void
  updatePhoto: (patch: Partial<SlidePhoto>) => void
  clearPhoto: () => void

  reportOverflow: (slideId: string, px: number) => void

  undo: () => void
  redo: () => void
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export const useEditor = create<EditorState>((set, get) => {
  let saveTimer: number | undefined
  let saveSeq = 0

  const scheduleSave = (project: Project) => {
    // storage held a project we could not read — writing now would destroy it
    if (get().storage !== 'ok') return
    window.clearTimeout(saveTimer)
    set({ saveState: 'saving' })
    const seq = ++saveSeq
    saveTimer = window.setTimeout(() => {
      idbWrite(SAVE_KEY, project).then(
        () => {
          if (seq === saveSeq) set({ saveState: 'saved', savedAt: Date.now() })
        },
        () => {
          if (seq === saveSeq) set({ saveState: 'failed' })
        }
      )
    }, 400)
  }

  /** Every mutation goes through here so undo/redo and autosave stay honest. */
  const commit = (recipe: (p: Project) => void) => {
    const { project, past } = get()
    const next = clone(project)
    recipe(next)
    next.updatedAt = Date.now()
    set({
      project: next,
      past: [...past, project].slice(-HISTORY_LIMIT),
      future: [],
    })
    scheduleSave(next)
  }

  const currentSlide = (p: Project, id: string) => p.slides.find((s) => s.id === id)

  const withSlide = (recipe: (s: Slide, p: Project) => void) =>
    commit((p) => {
      const s = currentSlide(p, get().sel.slideId)
      if (s) recipe(s, p)
    })

  const blankProject = newProject()

  return {
    project: blankProject,
    theme: DEFAULT_THEME,
    sel: { slideId: blankProject.slides[0].id, blockId: null, patternId: null },
    past: [],
    future: [],
    ready: false,
    saveState: 'idle',
    savedAt: null,
    storage: 'loading',
    storageError: null,
    overflow: {},
    zoom: 'fit',
    showGuides: false,
    panel: 'content',

    hydrate: async () => {
      const read = await idbRead<Project>(SAVE_KEY)

      // a timeout or a locked database is NOT an empty one: the previous
      // carousel is probably still in there, so stay off the write path
      if (!read.ok) {
        set({
          ready: true,
          storage: 'unreadable',
          storageError: read.reason,
          saveState: 'idle',
        })
        return
      }

      const saved = read.value
      if (saved?.slides?.length) {
        set({
          project: saved,
          sel: { slideId: saved.slides[0].id, blockId: null, patternId: null },
          ready: true,
          storage: 'ok',
          storageError: null,
          saveState: 'saved',
          savedAt: saved.updatedAt ?? null,
        })
      } else {
        // genuinely first run — the default carousel becomes the saved one
        set({ ready: true, storage: 'ok', storageError: null })
        scheduleSave(get().project)
      }
    },

    retryStorage: async () => {
      set({ storage: 'loading', storageError: null })
      await get().hydrate()
    },

    startFresh: () => {
      set({ storage: 'ok', storageError: null })
      scheduleSave(get().project)
    },

    replaceProject: (p) => {
      // swapping the whole carousel is the most destructive thing here, so it
      // goes on the undo stack like any other edit
      const { project, past } = get()
      set({
        project: p,
        sel: { slideId: p.slides[0]?.id ?? '', blockId: null, patternId: null },
        past: [...past, project].slice(-HISTORY_LIMIT),
        future: [],
        overflow: {},
      })
      scheduleSave(p)
    },

    resetProject: () => get().replaceProject(newProject(get().theme)),

    setTitle: (v) => commit((p) => void (p.title = v)),
    setFormat: (v) => commit((p) => void (p.format = v)),
    setFooterText: (v) => commit((p) => void (p.footerText = v)),

    selectSlide: (id) => set({ sel: { slideId: id, blockId: null, patternId: null } }),
    stepSlide: (dir) => {
      const { project, sel } = get()
      const i = project.slides.findIndex((s) => s.id === sel.slideId)
      const next = project.slides[i + dir]
      if (next) set({ sel: { slideId: next.id, blockId: null, patternId: null } })
    },
    selectBlock: (id) =>
      set((s) => ({ sel: { ...s.sel, blockId: id, patternId: null }, panel: 'content' })),
    selectPattern: (id) =>
      set((s) => ({ sel: { ...s.sel, patternId: id, blockId: null }, panel: 'decor' })),
    setPanel: (panel) => set({ panel }),
    setZoom: (zoom) => set({ zoom }),
    toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),

    addSlide: (template, at) => {
      const slide = TEMPLATE_BY_ID[template].make(get().theme)
      commit((p) => {
        const index = at ?? p.slides.findIndex((s) => s.id === get().sel.slideId) + 1
        p.slides.splice(index <= 0 ? p.slides.length : index, 0, slide)
      })
      set((s) => ({ sel: { slideId: slide.id, blockId: null, patternId: null }, panel: s.panel }))
    },

    duplicateSlide: (id) => {
      const copy = clone(get().project.slides.find((s) => s.id === id))
      if (!copy) return
      copy.id = nid()
      copy.blocks = copy.blocks.map((b) => ({ ...b, id: nid() }))
      copy.patterns = copy.patterns.map((d) => ({ ...d, id: nid() }))
      commit((p) => {
        const i = p.slides.findIndex((s) => s.id === id)
        p.slides.splice(i + 1, 0, copy)
      })
      set({ sel: { slideId: copy.id, blockId: null, patternId: null } })
    },

    deleteSlide: (id) => {
      const { project } = get()
      if (project.slides.length <= 1) return
      const i = project.slides.findIndex((s) => s.id === id)
      commit((p) => void p.slides.splice(i, 1))
      const next = get().project.slides[Math.min(i, get().project.slides.length - 1)]
      set({ sel: { slideId: next.id, blockId: null, patternId: null } })
    },

    moveSlide: (from, to) =>
      commit((p) => {
        if (to < 0 || to >= p.slides.length) return
        const [s] = p.slides.splice(from, 1)
        p.slides.splice(to, 0, s)
      }),

    updateSlide: (id, patch) =>
      commit((p) => {
        const s = currentSlide(p, id)
        if (s) Object.assign(s, patch)
      }),

    setDefaultTheme: (themeId) => set({ theme: THEME_BY_ID[themeId] ?? DEFAULT_THEME }),

    applyTheme: (themeId, scope) => {
      const t = THEME_BY_ID[themeId]
      if (!t) return
      set({ theme: t })
      const paint = (s: Slide) => {
        s.bg = t.bg
        s.noise = t.noise
        s.blocks.forEach((b) => {
          if (b.type === 'text') b.color = t.text
          if (b.type === 'list') {
            b.color = t.text
            b.accent = t.accent
          }
          if (b.type === 'quote') {
            b.color = t.text
            b.accent = t.accent
          }
          if (b.type === 'caption') b.color = t.text
        })
        s.patterns.forEach((d) => {
          if (d.color !== 'brand') d.color = t.pattern
        })
      }
      commit((p) => {
        if (scope === 'all') p.slides.forEach(paint)
        else {
          const s = currentSlide(p, get().sel.slideId)
          if (s) paint(s)
        }
      })
    },

    addBlock: (type) => {
      const t = get().theme
      let block: Block
      switch (type) {
        case 'list':
          block = makeList(t, 'numbered')
          break
        case 'quote':
          block = makeQuote(t, 'center')
          break
        case 'caption':
          block = makeCaption(t, 'card')
          break
        case 'spacer':
          block = makeSpacer(DEFAULT_GAP)
          break
        default:
          block = makeText('body', 'Новый текст', t.text)
      }
      withSlide((s) => void s.blocks.push(block))
      set((s) => ({ sel: { ...s.sel, blockId: block.id, patternId: null }, panel: 'content' }))
    },

    duplicateBlock: (blockId) => {
      const state = get()
      const slide = state.project.slides.find((s) => s.id === state.sel.slideId)
      const source = slide?.blocks.find((b) => b.id === blockId)
      if (!source) return
      const copy = clone(source)
      copy.id = nid()
      if (copy.type === 'list') copy.items = copy.items.map((i) => ({ ...i, id: nid() }))
      withSlide((s) => {
        const i = s.blocks.findIndex((b) => b.id === blockId)
        s.blocks.splice(i + 1, 0, copy)
      })
      set((s) => ({ sel: { ...s.sel, blockId: copy.id, patternId: null } }))
    },

    moveBlockTo: (blockId, index) =>
      withSlide((s) => {
        const from = s.blocks.findIndex((b) => b.id === blockId)
        if (from < 0) return
        const to = Math.max(0, Math.min(s.blocks.length - 1, index))
        if (from === to) return
        const [block] = s.blocks.splice(from, 1)
        s.blocks.splice(to, 0, block)
      }),

    updateBlock: (blockId, patch) =>
      withSlide((s) => {
        const b = s.blocks.find((x) => x.id === blockId)
        if (b) Object.assign(b, patch)
      }),

    alignBlock: (blockId, dir) =>
      withSlide((s) => {
        const b = s.blocks.find((x) => x.id === blockId)
        if (b?.type !== 'text') return
        const order: Align[] = ['left', 'center', 'right']
        const i = order.indexOf(b.align)
        b.align = order[Math.max(0, Math.min(2, i + (dir === 'left' ? -1 : 1)))]
      }),

    deleteBlock: (blockId) => {
      withSlide((s) => {
        const i = s.blocks.findIndex((x) => x.id === blockId)
        if (i >= 0) s.blocks.splice(i, 1)
      })
      set((s) => ({ sel: { ...s.sel, blockId: null } }))
    },

    moveBlock: (blockId, dir) =>
      withSlide((s) => {
        const i = s.blocks.findIndex((x) => x.id === blockId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= s.blocks.length) return
        const [b] = s.blocks.splice(i, 1)
        s.blocks.splice(j, 0, b)
      }),

    addItem: (blockId) =>
      withSlide((s) => {
        const b = s.blocks.find((x) => x.id === blockId)
        if (b?.type !== 'list') return
        b.items.push({
          id: nid(),
          title: `${b.items.length + 1}. Навык`,
          text: 'Новый пункт списка.',
        })
      }),

    updateItem: (blockId, itemId, patch) =>
      withSlide((s) => {
        const b = s.blocks.find((x) => x.id === blockId)
        if (b?.type !== 'list') return
        const it = b.items.find((x) => x.id === itemId)
        if (it) Object.assign(it, patch)
      }),

    deleteItem: (blockId, itemId) =>
      withSlide((s) => {
        const b = s.blocks.find((x) => x.id === blockId)
        if (b?.type !== 'list') return
        b.items = b.items.filter((x) => x.id !== itemId)
      }),

    moveItem: (blockId, itemId, dir) =>
      withSlide((s) => {
        const b = s.blocks.find((x) => x.id === blockId)
        if (b?.type !== 'list') return
        const i = b.items.findIndex((x) => x.id === itemId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= b.items.length) return
        const [it] = b.items.splice(i, 1)
        b.items.splice(j, 0, it)
      }),

    addPattern: (pattern, patch = {}) => {
      const def = PATTERNS.find((p) => p.id === pattern)!
      const format = FORMATS[get().project.format]
      const spot = PATTERN_SPOTS.find((s) => s.id === DEFAULT_SPOT)!
      const inst = makePattern(pattern, {
        color: get().theme.pattern,
        blur: def.blur,
        x: Math.round(format.width * spot.fx),
        y: Math.round(format.height * spot.fy),
        ...patch,
      })
      withSlide((s) => void s.patterns.push(inst))
      set((s) => ({ sel: { ...s.sel, patternId: inst.id, blockId: null }, panel: 'decor' }))
    },

    movePatternBy: (patternId, dx, dy) => {
      const state = get()
      const format = FORMATS[state.project.format]
      const slide = state.project.slides.find((s) => s.id === state.sel.slideId)
      const p = slide?.patterns.find((x) => x.id === patternId)
      if (!p) return
      // where it sits now, in named terms
      const here = PATTERN_SPOTS.reduce((best, sp) => {
        const d = (sp.fx * format.width - p.x) ** 2 + (sp.fy * format.height - p.y) ** 2
        const bd = (best.fx * format.width - p.x) ** 2 + (best.fy * format.height - p.y) ** 2
        return d < bd ? sp : best
      }, PATTERN_SPOTS[0])
      const next = neighbourSpot(here.id, dx, dy)
      const sp = PATTERN_SPOTS.find((x) => x.id === next)
      if (!sp) return
      get().updatePattern(patternId, {
        x: Math.round(format.width * sp.fx),
        y: Math.round(format.height * sp.fy),
      })
    },

    updatePattern: (patternId, patch) =>
      withSlide((s) => {
        const d = s.patterns.find((x) => x.id === patternId)
        if (d) Object.assign(d, patch)
      }),

    deletePattern: (patternId) => {
      withSlide((s) => {
        s.patterns = s.patterns.filter((x) => x.id !== patternId)
      })
      set((s) => ({ sel: { ...s.sel, patternId: null } }))
    },

    setPhoto: (src, index) =>
      withSlide((s) => {
        const photo = s.photo ?? emptyPhoto('full')
        if (photo.style === 'trio' && index != null) {
          const srcs = [...photo.srcs]
          srcs[index] = src
          s.photo = { ...photo, srcs }
        } else {
          s.photo = { ...photo, src }
        }
      }),

    dropPhoto: (src) =>
      withSlide((s) => {
        const photo = s.photo ?? emptyPhoto('full')
        if (photo.style === 'trio') {
          const srcs = [...photo.srcs]
          const slot = [0, 1, 2].find((i) => !srcs[i]) ?? 0
          srcs[slot] = src
          s.photo = { ...photo, srcs }
        } else {
          s.photo = { ...photo, src }
        }
      }),

    setPhotoStyle: (style) =>
      withSlide((s) => {
        s.photo = { ...(s.photo ?? emptyPhoto(style)), style }
      }),

    updatePhoto: (patch) =>
      withSlide((s) => {
        if (s.photo) Object.assign(s.photo, patch)
      }),

    clearPhoto: () => withSlide((s) => void (s.photo = null)),

    reportOverflow: (slideId, px) =>
      set((s) =>
        Math.abs((s.overflow[slideId] ?? 0) - px) < 1
          ? s
          : { overflow: { ...s.overflow, [slideId]: px } }
      ),

    undo: () => {
      const { past, project, future } = get()
      if (!past.length) return
      const prev = past[past.length - 1]
      set({
        project: prev,
        past: past.slice(0, -1),
        future: [project, ...future].slice(0, HISTORY_LIMIT),
        sel: {
          slideId: prev.slides.some((s) => s.id === get().sel.slideId)
            ? get().sel.slideId
            : prev.slides[0].id,
          blockId: null,
          patternId: null,
        },
      })
      scheduleSave(prev)
    },

    redo: () => {
      const { past, project, future } = get()
      if (!future.length) return
      const next = future[0]
      set({
        project: next,
        past: [...past, project].slice(-HISTORY_LIMIT),
        future: future.slice(1),
      })
      scheduleSave(next)
    },
  }
})

/* ------------------------------------------------------------- selectors */

export const useSlide = (): Slide | undefined =>
  useEditor((s) => s.project.slides.find((x) => x.id === s.sel.slideId))

export const useSelectedBlock = (): Block | undefined =>
  useEditor((s) => {
    const slide = s.project.slides.find((x) => x.id === s.sel.slideId)
    return slide?.blocks.find((b) => b.id === s.sel.blockId)
  })

export const useSelectedPattern = (): PatternInstance | undefined =>
  useEditor((s) => {
    const slide = s.project.slides.find((x) => x.id === s.sel.slideId)
    return slide?.patterns.find((d) => d.id === s.sel.patternId)
  })

export const colorOf = (c: ColorId) => c
