import { useRef } from 'react'
import { useEditor } from '../store/useEditor'
import { FORMATS, FORMAT_ORDER } from '../design/tokens'
import { readProjectJson } from '../export/exportImage'
import { Seg } from './controls'

export function TopBar({
  onTemplates,
  onTextImport,
  onExport,
  toast,
}: {
  onTemplates: () => void
  onTextImport: () => void
  onExport: () => void
  toast: (m: string) => void
}) {
  const project = useEditor((s) => s.project)
  const setTitle = useEditor((s) => s.setTitle)
  const setFormat = useEditor((s) => s.setFormat)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const replaceProject = useEditor((s) => s.replaceProject)
  const resetProject = useEditor((s) => s.resetProject)
  const saveState = useEditor((s) => s.saveState)
  const storage = useEditor((s) => s.storage)
  const fileRef = useRef<HTMLInputElement>(null)

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
        <span className="dot" />
        Lerun
      </div>

      <input
        className="field"
        style={{ width: 210 }}
        value={project.title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название карусели"
      />

      <div style={{ width: 300 }}>
        <Seg
          value={project.format}
          onChange={setFormat}
          options={FORMAT_ORDER.map((f) => ({
            value: f,
            label: FORMATS[f].label,
            title: FORMATS[f].hint,
          }))}
        />
      </div>

      <div style={{ flex: 1 }} />

      {save ? (
        <span className="save-state" data-state={save.state}>
          <i />
          {save.label}
        </span>
      ) : null}

      <button className="btn ghost" onClick={onTextImport} title="Вставить текст поста">
        Текст → карусель
      </button>
      <button className="btn ghost" onClick={onTemplates} title="Шаблоны слайдов (N)">
        Шаблоны
      </button>
      <div className="row" style={{ gap: 2 }}>
        <button
          className="btn ghost icon"
          onClick={undo}
          disabled={!canUndo}
          title="Отменить ⌘Z"
          aria-label="Отменить"
        >
          ↶
        </button>
        <button
          className="btn ghost icon"
          onClick={redo}
          disabled={!canRedo}
          title="Вернуть ⇧⌘Z"
          aria-label="Вернуть"
        >
          ↷
        </button>
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
      <button className="btn ghost" onClick={() => fileRef.current?.click()} title="Открыть .json">
        Открыть
      </button>
      <button
        className="btn ghost"
        onClick={() => {
          if (confirm('Начать новую карусель? Текущая будет заменена.')) resetProject()
        }}
      >
        Новая
      </button>
      <button className="btn primary" onClick={onExport} title="Выгрузить ⌘E">
        Экспорт
      </button>
    </header>
  )
}
