const DB_NAME = 'grand-luxury-christmas-tree'
const STORE = 'kv'

export type SavedRecord = {
  generated: true
  photos: string[]
  captions?: string[]
  savedAt: number
}

export type DraftRecord = {
  active: boolean
  photos: (string | null)[]
  captions?: string[]
  updatedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed'))
  })
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(key)
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'))
    })
  } finally {
    db.close()
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'))
    })
  } finally {
    db.close()
  }
}
