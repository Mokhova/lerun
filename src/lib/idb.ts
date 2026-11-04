/**
 * Tiny IndexedDB key/value store. Projects carry pasted photos as data URIs,
 * which blows past the 5 MB localStorage quota, so autosave lives here.
 */
const DB = 'lerun-carousels'
const STORE = 'kv'

let dbp: Promise<IDBDatabase> | null = null

/**
 * `indexedDB.open` can hang indefinitely — another tab holding an upgrade, a
 * blocked delete, Safari private mode. Never let that freeze the editor.
 */
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('хранилище не ответило')), ms)
    ),
  ])

const open = () => {
  if (dbp) return dbp
  dbp = withTimeout(
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('база занята другой вкладкой'))
    }),
    4000
  ).catch((e) => {
    dbp = null
    throw e
  })
  return dbp
}

/**
 * A read either succeeded (and `value` may legitimately be empty) or failed.
 * Collapsing the two into `undefined` is how a slow disk turns into a wiped
 * carousel, so the caller is forced to tell them apart.
 */
export type ReadResult<T> =
  | { ok: true; value: T | undefined }
  | { ok: false; reason: string }

export async function idbRead<T>(key: string): Promise<ReadResult<T>> {
  try {
    const db = await open()
    const value = await withTimeout(
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      }),
      4000
    )
    return { ok: true, value }
  } catch (e) {
    return { ok: false, reason: explain(e) }
  }
}

/** Browser storage errors are English and technical; the editor speaks Russian. */
function explain(e: unknown): string {
  const err = e as { name?: string; message?: string }
  if (err?.name === 'VersionError') return 'база новее этой версии редактора'
  if (err?.name === 'QuotaExceededError') return 'на диске нет места'
  if (err?.name === 'SecurityError' || err?.name === 'InvalidStateError')
    return 'браузер закрыл доступ к хранилищу'
  // our own timeouts and the blocked-by-another-tab case are already plain
  if (err?.message === 'хранилище не ответило' || err?.message === 'база занята другой вкладкой')
    return err.message
  return 'браузер отклонил запрос'
}

/** Rejects on failure — the editor shows «не сохраняется» instead of pretending. */
export async function idbWrite(key: string, value: unknown): Promise<void> {
  const db = await open()
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('запись отменена'))
    }),
    4000
  )
}
