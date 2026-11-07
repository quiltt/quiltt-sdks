import type { Observer } from '@/observables'
import type { Maybe } from '@/types'

/**
 * An error and type safe wrapper for localStorage.
 * It allows you to subscribe to changes;
 * but localStorage changes only fire when another
 * window updates the record.
 */
export class LocalStorage<T = any> {
  private observers: { [key: string]: Observer<T>[] } = {}
  private readonly keyPrefix: string

  constructor(keyPrefix = 'quiltt') {
    this.keyPrefix = keyPrefix

    if (typeof window !== 'undefined' && typeof window.addEventListener !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this))
    }
  }

  isEnabled = (): boolean => {
    try {
      const testKey = `${this.keyPrefix}.ping`
      localStorage.setItem(testKey, 'pong')
      localStorage.removeItem(testKey)
      return true
    } catch (_error) {
      return false
    }
  }

  isDisabled = (): boolean => !this.isEnabled()

  get = (key: string): Maybe<T> | undefined => {
    const storage = this.getStorage()
    if (!storage) return undefined

    const fullKey = this.getFullKey(key)
    try {
      const state = storage.getItem(fullKey)
      // A missing key and a cleared one are different states: the first reads `undefined` because no
      // default has been overridden, the second reads `null` because the app cleared it and a default
      // must not come back. `set` writes clears as `null`, so a key that is simply absent is one that
      // was never written.
      return state === null ? undefined : (JSON.parse(state) as T | null)
    } catch (error) {
      console.warn(`localStorage Error: "${fullKey}"`, error)
      return undefined
    }
  }

  set = (key: string, state: Maybe<T> | undefined): void => {
    const storage = this.getStorage()
    if (!storage) return

    const fullKey = this.getFullKey(key)
    try {
      // A cleared key is written as `null` rather than removed. Removing it would make it
      // indistinguishable from one that was never written, so after a reload a caller's default would
      // come back over a value the app had deliberately cleared. `undefined` is not representable in
      // JSON, so it is stored the same way and read back as `null`.
      storage.setItem(fullKey, JSON.stringify(state ?? null))
    } catch (error) {
      console.warn(`localStorage Error: "${fullKey}"`, error)
    }
  }

  remove = (key: string): void => {
    const storage = this.getStorage()
    if (!storage) return

    const fullKey = this.getFullKey(key)
    try {
      storage.removeItem(fullKey)
    } catch (error) {
      console.warn(`localStorage Error: "${fullKey}"`, error)
    }
  }

  has = (key: string): boolean => {
    const storage = this.getStorage()
    if (!storage) return false

    const fullKey = this.getFullKey(key)
    try {
      return storage.getItem(fullKey) !== null
    } catch (error) {
      // Reading can throw (blocked storage, security errors). Callers ask this during render, so
      // an escaping error would crash them; report the key as absent and let them fall back.
      console.warn(`localStorage Error: "${fullKey}"`, error)
      return false
    }
  }

  clear = (): void => {
    const storage = this.getStorage()
    if (!storage) return

    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(`${this.keyPrefix}.`)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => {
        storage.removeItem(key)
      })
    } catch (error) {
      console.warn(`localStorage Error during clear`, error)
    }
  }

  subscribe = (key: string, observer: Observer<T>): (() => void) => {
    const fullKey = this.getFullKey(key)

    if (!this.observers[fullKey]) {
      this.observers[fullKey] = []
    }

    this.observers[fullKey].push(observer)

    // Return unsubscribe function
    return () => this.unsubscribe(key, observer)
  }

  unsubscribe = (key: string, observer: Observer<T>): void => {
    const fullKey = this.getFullKey(key)

    if (this.observers[fullKey]) {
      this.observers[fullKey] = this.observers[fullKey].filter((update) => update !== observer)

      // Clean up empty observer arrays
      if (this.observers[fullKey].length === 0) {
        delete this.observers[fullKey]
      }
    }
  }

  // Get all keys that match quiltt prefix
  keys = (): string[] => {
    const storage = this.getStorage()
    if (!storage) return []

    const keys: string[] = []
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(`${this.keyPrefix}.`)) {
          keys.push(key.replace(`${this.keyPrefix}.`, ''))
        }
      }
    } catch (error) {
      console.warn('localStorage Error getting keys', error)
    }
    return keys
  }

  private getFullKey = (key: string): string => {
    return `${this.keyPrefix}.${key}`
  }

  /**
   * Safely reads `window.localStorage`. Browsers that block storage access
   * (e.g. Firefox with cross-site cookies blocked, or a sandboxed iframe) throw
   * a `SecurityError` on the property read itself, before any storage method is
   * reached, so the read has to happen inside a `try`.
   */
  private getStorage = (): Storage | undefined => {
    if (typeof window === 'undefined') return undefined

    try {
      return window.localStorage
    } catch (_error) {
      return undefined
    }
  }

  /**
   * Handle storage events from other windows/tabs
   * If there is a key, then trigger the related updates. If there is no key
   * it means that a record has been removed and everything needs to be rechecked.
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    const isQuilttKey = event.key?.startsWith(`${this.keyPrefix}.`)

    if (isQuilttKey && event.key) {
      // Parse the new value safely
      let newState: T | null = null
      try {
        newState = event.newValue ? JSON.parse(event.newValue) : null
      } catch (error) {
        console.warn(`Failed to parse storage event value for ${event.key}`, error)
        return
      }

      if (this.observers[event.key]) {
        this.observers[event.key].forEach((observer) => {
          try {
            observer(newState)
          } catch (error) {
            console.warn(`Observer error for key ${event.key}`, error)
          }
        })
      }
    } else if (!event.key) {
      // Storage was cleared or changed in a way that doesn't specify a key
      // Re-check all observed keys
      Object.entries(this.observers).forEach(([fullKey, observers]) => {
        const shortKey = fullKey.replace(`${this.keyPrefix}.`, '')
        const currentValue = this.get(shortKey)

        observers.forEach((observer) => {
          try {
            observer(currentValue)
          } catch (error) {
            console.warn(`Observer error for key ${fullKey}`, error)
          }
        })
      })
    }
  }
}
