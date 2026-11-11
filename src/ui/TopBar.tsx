import { useEffect, useRef } from 'react'
import { useEditor } from '../store/useEditor'
import { FORMATS } from '../design/tokens'
import { readProjectJson } from '../export/exportImage'
import { Seg } from './controls'
import { SaveCheckIcon, TextSparkleIcon, UndoIcon } from './icons'

export function TopBar({
  onTextImport,
  onExport,
  toast,
}: {
  onTextImport: () => void
  onExport: () => void
  toast: (m: string) => void
}) {
  const project = useEditor((s) => s.project)
  const setTitle = useEditor((s) => s.setTitle)
  const setFormat = useEditor((s) => s.setFormat)
  const undo = useEditor((s) => s.undo)
  const canUndo = useEditor((s) => s.past.length > 0)
  const replaceProject = useEditor((s) => s.replaceProject)
  const resetProject = useEditor((s) => s.resetProject)
  const saveState = useEditor((s) => s.saveState)
  const storage = useEditor((s) => s.storage)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === 'o') {
        event.preventDefault()
        fileRef.current?.click()
      } else if (key === 'n') {
        event.preventDefault()
        if (confirm('Начать новую карусель? Текущая будет заменена.')) resetProject()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [resetProject])

  const save =
    storage !== 'ok'
      ? { state: 'failed', label: 'Автосохранение выключено' }
      : saveState === 'saving'
        ? { state: 'saving', label: 'Сохраняю…' }
        : saveState === 'failed'
          ? { state: 'failed', label: 'Не сохраняется' }
          : saveState === 'saved'
            ? { state: 'saved', label: 'Сохранено' }
            : null

  return (
    <header className="topbar">
      <div className="brand">
        <span>Lucent</span><b>&amp; lERUN</b>
      </div>

      <div className="topbar-main">
        <div className="topbar-set">
          <input
            className="field topbar-title"
            value={project.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Новая карусель"
          />
          <div className="topbar-format">
            <Seg
              value={project.format}
              onChange={setFormat}
              options={(['post45', 'square', 'landscape169'] as const).map((f) => ({
                value: f,
                label: f === 'post45' ? '4:5' : f === 'square' ? '1:1' : '16:9',
                title: FORMATS[f].hint,
              }))}
            />
          </div>
        </div>

        <div className="topbar-actions">
          <span
            className="save-state"
            data-state={save?.state ?? 'saving'}
            title={save?.label ?? 'Сохраняю…'}
            aria-label={save?.label ?? 'Сохраняю…'}
          >
            <SaveCheckIcon />
          </span>
          <button
            className="topbar-icon"
            onClick={undo}
            disabled={!canUndo}
            title="Отменить ⌘Z"
            aria-label="Отменить"
          >
            <UndoIcon />
          </button>
          <button className="topbar-text" onClick={onTextImport} title="Вставить текст поста">
            <TextSparkleIcon />
            <span>Текст на слайды</span>
          </button>
          <button className="topbar-export" onClick={onExport} title="Выгрузить ⌘E">
            Экспорт
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            replaceProject(await readProjectJson(f))
            toast('Проект открыт')
          } catch (err) {
            toast(`Не получилось открыть: ${(err as Error).message}`)
          }
        }}
      />
    </header>
  )
}
