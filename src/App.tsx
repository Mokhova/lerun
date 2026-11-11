import { useEffect, useState } from 'react'
import { importPhoto } from './lib/image'
import { useEditor } from './store/useEditor'
import { TopBar } from './ui/TopBar'
import { SlideStrip } from './ui/SlideStrip'
import { LayerList } from './ui/LayerList'
import { Canvas } from './ui/Canvas'
import { Inspector } from './ui/Inspector'
import { TemplatePicker } from './ui/TemplatePicker'
import { TextImport } from './ui/TextImport'
import { ExportDialog } from './ui/ExportDialog'
import { StorageNotice } from './ui/StorageNotice'

type Dialog = 'templates' | 'text' | 'export' | null

export default function App() {
  const ready = useEditor((s) => s.ready)
  const hydrate = useEditor((s) => s.hydrate)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const sel = useEditor((s) => s.sel)
  const deletePattern = useEditor((s) => s.deletePattern)
  const deleteBlock = useEditor((s) => s.deleteBlock)
  const dropPhoto = useEditor((s) => s.dropPhoto)
  const stepSlide = useEditor((s) => s.stepSlide)
  const duplicateBlock = useEditor((s) => s.duplicateBlock)
  const duplicateSlide = useEditor((s) => s.duplicateSlide)
  const moveBlock = useEditor((s) => s.moveBlock)
  const movePatternBy = useEditor((s) => s.movePatternBy)
  const alignBlock = useEditor((s) => s.alignBlock)
  const selectBlock = useEditor((s) => s.selectBlock)
  const selectPattern = useEditor((s) => s.selectPattern)

  const [dialog, setDialog] = useState<Dialog>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  // kept outside the dialog so closing it never costs the user a pasted post
  const [importDraft, setImportDraft] = useState('')

  const toast = (m: string) => {
    setToastMsg(m)
    window.setTimeout(() => setToastMsg((cur) => (cur === m ? null : cur)), 2600)
  }

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // paste a screenshot straight onto the slide
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const el = e.target as HTMLElement
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/')
      )
      const file = item?.getAsFile()
      if (file) {
        e.preventDefault()
        dropPhoto(await importPhoto(file))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [dropPhoto])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing =
        el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
      const mod = e.metaKey || e.ctrlKey
      // a dialog owns the keyboard while it is open
      if (document.querySelector('.modal-backdrop')) return
      /**
       * Editing a layer with the keyboard only happens where the layer is.
       * Tab can land on any chip inside a block card, and a stray Down there
       * used to reorder the slide silently.
       */
      const onSlide = el === document.body || Boolean(el?.closest?.('.canvas-wrap'))
      // walking the carousel is harmless, so the slide strip may do it too —
      // but never from a control in the inspector, which scrolls instead
      const canWalk = onSlide || Boolean(el?.closest?.('.strip'))

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setDialog('export')
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (sel.blockId) duplicateBlock(sel.blockId)
        else duplicateSlide(sel.slideId)
        return
      }
      if (typing) return

      if (!mod && (e.key === 'n' || e.key === 'т')) {
        e.preventDefault()
        setDialog('templates')
        return
      }
      if (onSlide && (e.key === 'Backspace' || e.key === 'Delete') && sel.patternId) {
        e.preventDefault()
        deletePattern(sel.patternId)
        return
      }
      if (onSlide && (e.key === 'Backspace' || e.key === 'Delete') && sel.blockId) {
        e.preventDefault()
        deleteBlock(sel.blockId)
        return
      }
      // let go of the layer, so the arrows walk the carousel again
      if (e.key === 'Escape' && (sel.blockId || sel.patternId)) {
        e.preventDefault()
        selectBlock(null)
        selectPattern(null)
        return
      }
      if (!e.key.startsWith('Arrow')) return
      const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
      const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0

      // a picked-up layer moves, but only from the slide itself
      if (onSlide && sel.patternId) {
        e.preventDefault()
        movePatternBy(sel.patternId, dx as -1 | 0 | 1, dy as -1 | 0 | 1)
        return
      }
      if (onSlide && sel.blockId) {
        e.preventDefault()
        // up/down is the block's place in the stack, left/right is where its
        // text sits across the slide — the only horizontal position it has
        if (dy) moveBlock(sel.blockId, dy as -1 | 1)
        else alignBlock(sel.blockId, dx === -1 ? 'left' : 'right')
        return
      }
      // a layer is held, or focus sits on a control — leave the arrows to
      // whatever has focus rather than changing the slide behind the user
      if (sel.blockId || sel.patternId || !canWalk) return
      e.preventDefault()
      stepSlide((dy || dx) as -1 | 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    undo,
    redo,
    sel,
    deletePattern,
    deleteBlock,
    stepSlide,
    moveBlock,
    movePatternBy,
    alignBlock,
    selectBlock,
    selectPattern,
    duplicateBlock,
    duplicateSlide,
  ])

  if (!ready) return <div className="splash">Загружаю шрифты и проект…</div>

  return (
    <div className="app">
      <TopBar
        onTextImport={() => setDialog('text')}
        onExport={() => setDialog('export')}
        toast={toast}
      />
      <SlideStrip onAdd={() => setDialog('templates')} />
      <Canvas />
      <LayerList />
      <Inspector />

      {dialog === 'templates' ? <TemplatePicker onClose={() => setDialog(null)} /> : null}
      {dialog === 'text' ? (
        <TextImport
          text={importDraft}
          onText={setImportDraft}
          onClose={() => setDialog(null)}
          toast={toast}
        />
      ) : null}
      {dialog === 'export' ? (
        <ExportDialog onClose={() => setDialog(null)} toast={toast} />
      ) : null}
      {toastMsg ? <div className="toast">{toastMsg}</div> : null}
      <StorageNotice />
    </div>
  )
}
