import { useEditor } from '../store/useEditor'

/**
 * Shown when IndexedDB did not answer. The saved carousel is probably intact,
 * so the only way past this is a deliberate choice — autosave is off until then.
 */
export function StorageNotice() {
  const storage = useEditor((s) => s.storage)
  const reason = useEditor((s) => s.storageError)
  const retryStorage = useEditor((s) => s.retryStorage)
  const startFresh = useEditor((s) => s.startFresh)

  if (storage === 'ok') return null
  const busy = storage === 'loading'

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 'min(480px, 100%)' }}>
        <header>
          <h2>Не удалось прочитать сохранённое</h2>
        </header>
        <div className="body col" style={{ gap: 10 }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Браузер не отдал хранилище{reason ? ` — ${reason}` : ''}. Прежняя карусель, скорее
            всего, на месте, и чтобы её не затереть, автосохранение сейчас выключено.
          </p>
          <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Чаще всего так бывает, когда редактор открыт ещё в одной вкладке. Закройте её и
            попробуйте снова.
          </p>
        </div>
        <footer>
          <button className="btn ghost" onClick={startFresh} disabled={busy}>
            Начать заново, затереть сохранённое
          </button>
          <button className="btn primary" onClick={() => void retryStorage()} disabled={busy}>
            {busy ? 'Читаю…' : 'Попробовать снова'}
          </button>
        </footer>
      </div>
    </div>
  )
}
