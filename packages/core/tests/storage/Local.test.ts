import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalStorage } from '@/storage/Local'

// Enhanced localStorage mock with all necessary methods
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  let shouldThrow = false

  return {
    getItem(key: string) {
      if (shouldThrow) throw new Error('localStorage disabled')
      return store[key] || null
    },
    setItem(key: string, value: string) {
      if (shouldThrow) throw new Error('localStorage disabled')
      store[key] = value.toString()
    },
    removeItem(key: string) {
      if (shouldThrow) throw new Error('localStorage disabled')
      delete store[key]
    },
    clear() {
      store = {}
    },
    key(index: number) {
      if (shouldThrow) throw new Error('localStorage disabled')
      const keys = Object.keys(store)
      return keys[index] || null
    },
    get length() {
      if (shouldThrow) throw new Error('localStorage disabled')
      return Object.keys(store).length
    },
    // Helper for testing
    _setShouldThrow(value: boolean) {
      shouldThrow = value
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

describe('LocalStorage', () => {
  let ls: LocalStorage<any>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    ;(localStorageMock as any)._setShouldThrow(false)
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Create instance after spies are set up
    ls = new LocalStorage()
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  describe('isEnabled/isDisabled', () => {
    it('should return true when localStorage is available', () => {
      expect(ls.isEnabled()).toBe(true)
      expect(ls.isDisabled()).toBe(false)
    })

    it('should return false when localStorage throws errors', () => {
      ;(localStorageMock as any)._setShouldThrow(true)
      expect(ls.isEnabled()).toBe(false)
      expect(ls.isDisabled()).toBe(true)
    })
  })

  describe('server-side rendering scenarios', () => {
    it('should handle undefined window in get method', () => {
      const originalWindow = global.window
      // @ts-expect-error
      delete global.window

      const serverLs = new LocalStorage()
      expect(serverLs.get('testKey')).toBeUndefined()

      global.window = originalWindow
    })

    it('should handle undefined localStorage in get method', () => {
      const originalLocalStorage = window.localStorage
      // @ts-expect-error
      delete window.localStorage

      expect(ls.get('testKey')).toBeUndefined()

      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      })
    })

    it('should handle undefined window in set method', () => {
      const originalWindow = global.window
      // @ts-expect-error
      delete global.window

      const serverLs = new LocalStorage()
      expect(() => serverLs.set('testKey', { value: 'test' })).not.toThrow()

      global.window = originalWindow
    })

    it('should handle undefined window in remove method', () => {
      const originalWindow = global.window
      // @ts-expect-error
      delete global.window

      const serverLs = new LocalStorage()
      expect(() => serverLs.remove('testKey')).not.toThrow()

      global.window = originalWindow
    })

    it('should handle SSR scenarios for clear and keys methods', () => {
      const originalWindow = global.window
      // @ts-expect-error
      delete global.window

      const serverLs = new LocalStorage()
      expect(() => serverLs.clear()).not.toThrow()
      expect(serverLs.keys()).toEqual([])

      global.window = originalWindow
    })
  })

  describe('blocked storage access', () => {
    // Firefox with cross-site cookies blocked (and sandboxed iframes) throw a
    // SecurityError when the `window.localStorage` property itself is read.
    const blockStorageAccess = () => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException(
            "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
            'SecurityError'
          )
        },
      })
    }

    const restoreStorageAccess = () => {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      })
    }

    afterEach(() => {
      restoreStorageAccess()
    })

    it('should not throw when reading localStorage in get', () => {
      blockStorageAccess()

      expect(() => ls.get('testKey')).not.toThrow()
      expect(ls.get('testKey')).toBeUndefined()
    })

    it('should not throw when reading localStorage in set', () => {
      blockStorageAccess()

      expect(() => ls.set('testKey', { value: 'test' })).not.toThrow()
    })

    it('should not throw when reading localStorage in remove', () => {
      blockStorageAccess()

      expect(() => ls.remove('testKey')).not.toThrow()
    })

    it('should not throw when reading localStorage in clear', () => {
      blockStorageAccess()

      expect(() => ls.clear()).not.toThrow()
    })

    it('should not throw when reading localStorage in keys', () => {
      blockStorageAccess()

      expect(() => ls.keys()).not.toThrow()
      expect(ls.keys()).toEqual([])
    })

    it('should report storage as disabled', () => {
      blockStorageAccess()

      expect(ls.isEnabled()).toBe(false)
      expect(ls.isDisabled()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle JSON parse errors in get method', () => {
      // Set invalid JSON directly in localStorage
      window.localStorage.setItem('quiltt.testKey', 'invalid json {')

      expect(ls.get('testKey')).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'localStorage Error: "quiltt.testKey"',
        expect.any(Error)
      )
    })

    it('should handle localStorage errors in set method', () => {
      ;(localStorageMock as any)._setShouldThrow(true)

      expect(() => ls.set('testKey', { value: 'test' })).not.toThrow()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'localStorage Error: "quiltt.testKey"',
        expect.any(Error)
      )
    })

    it('should handle localStorage errors in remove method', () => {
      ;(localStorageMock as any)._setShouldThrow(true)

      expect(() => ls.remove('testKey')).not.toThrow()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'localStorage Error: "quiltt.testKey"',
        expect.any(Error)
      )
    })

    it('should handle localStorage errors in clear method', () => {
      ;(localStorageMock as any)._setShouldThrow(true)

      expect(() => ls.clear()).not.toThrow()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'localStorage Error during clear',
        expect.any(Error)
      )
    })

    it('should handle localStorage errors in keys method', () => {
      ;(localStorageMock as any)._setShouldThrow(true)

      const keys = ls.keys()
      expect(keys).toEqual([])
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'localStorage Error getting keys',
        expect.any(Error)
      )
    })
  })

  describe('set method edge cases', () => {
    it('should remove item when setting null/undefined value', () => {
      ls.set('testKey', { value: 'initial' })
      expect(ls.get('testKey')).toEqual({ value: 'initial' })

      ls.set('testKey', null)
      expect(ls.get('testKey')).toBeNull()

      ls.set('testKey', { value: 'test' })
      ls.set('testKey', undefined)
      expect(ls.get('testKey')).toBeNull()
    })
  })

  describe('storage event handling', () => {
    let mockEventListener: (event: StorageEvent) => void
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      // Set up spy before creating instance
      vi.clearAllMocks()
      window.localStorage.clear()
      ;(localStorageMock as any)._setShouldThrow(false)
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      // Now create instance which will register the event listener
      ls = new LocalStorage()

      // Get the storage event listener
      const storageCall = addEventListenerSpy.mock.calls.find((call: any) => call[0] === 'storage')
      if (storageCall) {
        mockEventListener = storageCall[1] as (event: StorageEvent) => void
      }
    })

    it('should handle storage events for quiltt keys', () => {
      const observer = vi.fn()
      ls.subscribe('testKey', observer) // Note: using short key, not quiltt.testKey

      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: JSON.stringify({ updated: true }),
      })

      mockEventListener(storageEvent)

      expect(observer).toHaveBeenCalledWith({ updated: true })
    })

    it('should handle storage events with null newValue', () => {
      const observer = vi.fn()
      ls.subscribe('testKey', observer)

      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: null,
      })

      mockEventListener(storageEvent)

      expect(observer).toHaveBeenCalledWith(null)
    })

    it('should ignore storage events for non-quiltt keys', () => {
      const observer1 = vi.fn()
      const observer2 = vi.fn()

      ls.subscribe('key1', observer1)
      ls.subscribe('key2', observer2)

      // Set some initial values
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      // For non-quiltt keys, the current implementation doesn't trigger observers
      const storageEvent = new StorageEvent('storage', {
        key: 'some.other.key',
        newValue: 'whatever',
      })

      mockEventListener(storageEvent)

      // The current implementation only handles quiltt keys or null keys
      // Non-quiltt keys are ignored, so observers should not be called
      expect(observer1).not.toHaveBeenCalled()
      expect(observer2).not.toHaveBeenCalled()
    })

    it('should handle storage events with no key (localStorage.clear())', () => {
      const observer1 = vi.fn()
      const observer2 = vi.fn()

      ls.subscribe('key1', observer1)
      ls.subscribe('key2', observer2)

      // Set some initial values
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      const storageEvent = new StorageEvent('storage', {
        key: null,
        newValue: null,
      })

      mockEventListener(storageEvent)

      expect(observer1).toHaveBeenCalledWith({ value: 1 })
      expect(observer2).toHaveBeenCalledWith({ value: 2 })
    })

    it('should not trigger observers for keys without observers', () => {
      const observer = vi.fn()
      ls.subscribe('differentKey', observer)

      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: JSON.stringify({ updated: true }),
      })

      mockEventListener(storageEvent)

      expect(observer).not.toHaveBeenCalled()
    })

    it('should handle JSON parse errors in storage events gracefully', () => {
      const observer = vi.fn()
      ls.subscribe('testKey', observer)

      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: 'invalid json {',
      })

      mockEventListener(storageEvent)

      expect(observer).not.toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to parse storage event value for quiltt.testKey',
        expect.any(Error)
      )
    })

    it('should handle observer errors gracefully during null key events', () => {
      const faultyObserver = vi.fn().mockImplementation(() => {
        throw new Error('Observer error during clear')
      })
      const goodObserver = vi.fn()

      ls.subscribe('key1', faultyObserver)
      ls.subscribe('key2', goodObserver)

      // Set initial values
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      // Simulate localStorage.clear() event (key: null)
      const storageEvent = new StorageEvent('storage', {
        key: null,
        newValue: null,
      })

      mockEventListener(storageEvent)

      expect(faultyObserver).toHaveBeenCalled()
      expect(goodObserver).toHaveBeenCalledWith({ value: 2 })
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Observer error for key quiltt.key1',
        expect.any(Error)
      )
    })

    it('should handle observer errors gracefully for quiltt key events', () => {
      const faultyObserver = vi.fn().mockImplementation(() => {
        throw new Error('Observer error')
      })
      const goodObserver = vi.fn()

      ls.subscribe('testKey', faultyObserver)
      ls.subscribe('testKey', goodObserver)

      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: JSON.stringify({ test: true }),
      })

      mockEventListener(storageEvent)

      expect(faultyObserver).toHaveBeenCalled()
      expect(goodObserver).toHaveBeenCalledWith({ test: true })
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Observer error for key quiltt.testKey',
        expect.any(Error)
      )
    })
  })

  describe('subscription management', () => {
    it('should properly unsubscribe observers', () => {
      const observer1 = vi.fn()
      const observer2 = vi.fn()

      ls.subscribe('testKey', observer1)
      ls.subscribe('testKey', observer2)

      ls.unsubscribe('testKey', observer1)

      // Simulate a storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: JSON.stringify({ test: true }),
      })

      const mockEventListener = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'storage'
      )?.[1]

      mockEventListener(storageEvent)

      expect(observer1).not.toHaveBeenCalled()
      expect(observer2).toHaveBeenCalledWith({ test: true })
    })

    it('should handle unsubscribing from non-existent key', () => {
      const observer = vi.fn()

      expect(() => ls.unsubscribe('nonExistentKey', observer)).not.toThrow()
    })

    it('should test subscribe return value for unsubscribe', () => {
      const observer = vi.fn()
      const unsubscribe = ls.subscribe('testKey', observer)

      // Trigger event to verify observer is active
      const storageEvent = new StorageEvent('storage', {
        key: 'quiltt.testKey',
        newValue: JSON.stringify({ test: true }),
      })

      const mockEventListener = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'storage'
      )?.[1]

      mockEventListener(storageEvent)
      expect(observer).toHaveBeenCalledWith({ test: true })

      // Unsubscribe and verify observer is no longer called
      observer.mockClear()
      unsubscribe()

      mockEventListener(storageEvent)
      expect(observer).not.toHaveBeenCalled()
    })
  })

  describe('basic functionality', () => {
    it('should get and set values correctly', () => {
      const testKey = 'testKey'
      const testValue = { a: 1 }
      ls.set(testKey, testValue)
      expect(ls.get(testKey)).toEqual(testValue)
    })

    it('should remove values correctly', () => {
      const testKey = 'testKey'
      ls.set(testKey, { a: 1 })
      ls.remove(testKey)
      expect(ls.get(testKey)).toBeNull()
    })
  })

  describe('additional utility methods', () => {
    it('should test has method', () => {
      expect(ls.has('nonExistent')).toBe(false)

      ls.set('testKey', { value: 'test' })
      expect(ls.has('testKey')).toBe(true)

      ls.set('nullKey', null)
      expect(ls.has('nullKey')).toBe(false)
    })

    it('should test clear method', () => {
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      expect(ls.get('key1')).toEqual({ value: 1 })
      expect(ls.get('key2')).toEqual({ value: 2 })

      ls.clear()

      expect(ls.get('key1')).toBeNull()
      expect(ls.get('key2')).toBeNull()
    })

    it('should test keys method', () => {
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      const keys = ls.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toHaveLength(2)
    })

    it('should clear only keys with the correct prefix', () => {
      // Set some keys with quiltt prefix
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      // Set some keys with different prefixes directly in localStorage
      window.localStorage.setItem('other.key1', JSON.stringify({ value: 'other1' }))
      window.localStorage.setItem('different.key2', JSON.stringify({ value: 'other2' }))

      ls.clear()

      // Quiltt keys should be cleared
      expect(ls.get('key1')).toBeNull()
      expect(ls.get('key2')).toBeNull()

      // Other keys should remain
      expect(window.localStorage.getItem('other.key1')).not.toBeNull()
      expect(window.localStorage.getItem('different.key2')).not.toBeNull()
    })

    it('should return only keys with the correct prefix', () => {
      // Set some keys with quiltt prefix
      ls.set('key1', { value: 1 })
      ls.set('key2', { value: 2 })

      // Set some keys with different prefixes directly in localStorage
      window.localStorage.setItem('other.key1', JSON.stringify({ value: 'other1' }))
      window.localStorage.setItem('different.key2', JSON.stringify({ value: 'other2' }))

      const keys = ls.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).not.toContain('other.key1')
      expect(keys).not.toContain('different.key2')
      expect(keys).toHaveLength(2)
    })
  })

  describe('custom prefix', () => {
    it('should work with custom key prefix', () => {
      const customLs = new LocalStorage('myapp')

      customLs.set('testKey', { value: 'test' })

      // Should be stored with custom prefix
      expect(window.localStorage.getItem('myapp.testKey')).not.toBeNull()
      expect(window.localStorage.getItem('quiltt.testKey')).toBeNull()

      expect(customLs.get('testKey')).toEqual({ value: 'test' })
    })
  })
})
