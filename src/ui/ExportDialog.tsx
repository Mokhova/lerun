import { useMemo, useState } from 'react'
import { useEditor } from '../store/useEditor'
import { slides as slideCount } from '../lib/plural'
import { validate, countBy } from '../lint/validate'
import {
  copySlide,
  exportAll,
  exportProjectJson,
  exportSlide,
  type FileKind,
} from '../export/exportImage'
import { FORMATS } from '../design/tokens'
import { Modal, Seg } from './controls'

export function ExportDialog({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const project = useEditor((s) => s.project)
  const index = useEditor((s) => s.project.slides.findIndex((x) => x.id === s.sel.slideId))
  const overflow = useEditor((s) => s.overflow)
  const [scale, setScale] = useState<'1' | '2'>('1')
  const [kind, setKind] = useState<FileKind>('jpeg')
  const [busy, setBusy] = useState<string | null>(null)

  const issues = useMemo(() => validate(project, overflow), [project, overflow])
  const errors = countBy(issues, 'error')
  const warns = countBy(issues, 'warn')
  const format = FORMATS[project.format]
  const k = Number(scale)

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    try {
      await fn()
      toast('Готово')
    } catch (e) {
      toast(`Не получилось: ${(e as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      title="Выгрузка"
      width={560}
      onClose={onClose}
      footer={
        <button className="btn ghost" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        {errors ? (
          <div className="issue error">
            <div>
              <b>
                {errors === 1 ? 'Есть 1 ошибка' : `Ошибок: ${errors}`} — контент не помещается
              </b>
              <span>Выгрузить можно, но текст будет обрезан. Загляните во вкладку «Проверка».</span>
            </div>
          </div>
        ) : (
          <div className={`issue ${warns ? 'warn' : 'info'}`}>
            <div>
              <b>
                {warns
                  ? `Есть замечания: ${warns} — выгрузить можно`
                  : 'Всё по гайдлайну'}
              </b>
              <span>
                {slideCount(project.slides.length)} · {format.width * k}×{format.height * k} px
                {warns ? ' · подробности во вкладке «Проверка»' : ''}
              </span>
            </div>
          </div>
        )}

        <div className="col" style={{ gap: 6 }}>
          <span className="label">Формат файла</span>
          <Seg
            value={kind}
            onChange={setKind}
            options={[
              { value: 'jpeg', label: 'JPEG — лёгкий', title: 'Для публикации' },
              { value: 'png', label: 'PNG — точный', title: 'Без потерь, файлы тяжелее' },
            ]}
          />
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="label">Разрешение</span>
          <Seg
            value={scale}
            onChange={setScale}
            options={[
              { value: '1', label: `1× — ${format.width}×${format.height}` },
              { value: '2', label: `2× — ${format.width * 2}×${format.height * 2}` },
            ]}
          />
          <p className="hint">
            Instagram и Telegram сжимают всё до 1080 по ширине — 1× достаточно. 2× берите,
            если планируете печать или кроп.
          </p>
          <p className="hint">
            Пока идёт выгрузка, не переключайтесь на другую вкладку: браузер замораживает
            фоновые вкладки, и отрисовка встанет на паузу.
          </p>
        </div>

        <div className="col" style={{ gap: 8 }}>
          <button
            className="btn primary"
            style={{ height: 38 }}
            disabled={!!busy}
            onClick={() =>
              run('all', () =>
                exportAll(project, k, kind, (done, total) => setBusy(`${done} / ${total}`))
              )
            }
          >
            {busy === 'all' || (busy && busy.includes('/'))
              ? `Готовлю ${busy}…`
              : `Скачать все слайды — ZIP`}
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn"
              style={{ flex: 1 }}
              disabled={!!busy || index < 0}
              onClick={() => run('one', () => exportSlide(project, index, k, kind))}
            >
              Текущий слайд — файл
            </button>
            <button
              className="btn"
              style={{ flex: 1 }}
              disabled={!!busy || index < 0}
              onClick={() => run('copy', () => copySlide(project, index))}
            >
              Скопировать в буфер
            </button>
          </div>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="label">Проект</span>
          <button className="btn" onClick={() => exportProjectJson(project)}>
            Сохранить файл проекта (.json)
          </button>
          <p className="hint">
            Чтобы вернуться к карусели позже или передать её другому человеку.
          </p>
        </div>
      </div>
    </Modal>
  )
}
