import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock LocalStorage with all necessary methods
const createMockLocalStorage = () => {
  const store: Record<string, any> = {}
  const subscribers: Record<string, Array<(value: any) => void>> = {}

  return {
    get: vi.fn((key: string) => store[key]),
    set: vi.fn((key: string, value: any) => {
      store[key] = value
    }),
    subscribe: vi.fn((key: string, callback: (value: any) => void) => {
      if (!subscribers[key]) subscribers[key] = []
      subscribers[key].push(callback)
    }),
    unsubscribe: vi.fn(),
    has: vi.fn((key: string) => key in store),
    _triggerStorageEvent: (key: string, value: any) => {
      subscribers[key]?.forEach((callback) => {
        callback(value)
      })
    },
    _getStore: () => ({ ...store }),
    _getSubscribers: () => ({ ...subscribers }),
    _clearStore: () => {
      Object.keys(store).forEach((key) => {
        delete store[key]
      })
    },
  }
}

const createMockMemoryStorage = () => {
  const store: Record<string, any> = {}
  return {
    get: vi.fn((key: string) => store[key]),
    set: vi.fn((key: string, value: any) => {
      store[key] = value
    }),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    has: vi.fn((key: string) => key in store),
    _setStore: (key: string, value: any) => {
      store[key] = value
    },
    _clearStore: () => {
      Object.keys(store).forEach((key) => {
        delete store[key]
      })
    },
  }
}

describe('Storage', () => {
  let Storage: any
  let GlobalStorage: any
  let storage: any
  let mockLocalStore: any
  let mockMemoryStore: any

  beforeEach(async () => {
    vi.resetModules()

    vi.doMock('../../src/storage/Local', () => {
      class MockLocalStorage {
        private instance = createMockLocalStorage()
        get = this.instance.get
        set = this.instance.set
        subscribe = this.instance.subscribe
        unsubscribe = this.instance.unsubscribe
        has = this.instance.has
        _triggerStorageEvent = this.instance._triggerStorageEvent
        _getStore = this.instance._getStore
        _getSubscribers = this.instance._getSubscribers
        _clearStore = this.instance._clearStore
      }
      return {
        LocalStorage: MockLocalStorage,
      }
    })

    vi.doMock('../../src/storage/Memory', () => {
      class MockMemoryStorage {
        private instance = createMockMemoryStorage()
        get = this.instance.get
        set = this.instance.set
        subscribe = this.instance.subscribe
        unsubscribe = this.instance.unsubscribe
        has = this.instance.has
        _setStore = this.instance._setStore
        _clearStore = this.instance._clearStore
      }
      return {
        MemoryStorage: MockMemoryStorage,
      }
    })

    // Dynamic import AFTER mocks are set
    const mod = await import('../../src/storage/Storage')
    Storage = mod.Storage
    GlobalStorage = mod.GlobalStorage

    storage = new Storage()
    mockLocalStore = (storage as any).localStore
    mockMemoryStore = (storage as any).memoryStore

    // `_getStore()` returns a copy, so clearing through it did nothing; each store clears itself.
    mockMemoryStore._clearStore()
    mockLocalStore._clearStore()
  })

  describe('basic functionality', () => {
    it('should get value from memory storage when available', () => {
      const testKey = 'test'
      const testValue = { a: 1 }

      mockMemoryStore._setStore(testKey, testValue)

      const result = storage.get(testKey)

      expect(result).toEqual(testValue)
      expect(mockMemoryStore.get).toHaveBeenCalledWith(testKey)
    })

    it('should fallback to localStorage when memory storage returns undefined', () => {
      const testKey = 'test'
      const testValue = { fromLocal: true }

      // Memory storage returns undefined
      mockMemoryStore.get.mockReturnValue(undefined)
      // Local storage has the value
      mockLocalStore.get.mockReturnValue(testValue)

      const result = storage.get(testKey)

      expect(result).toEqual(testValue)
      expect(mockMemoryStore.get).toHaveBeenCalledWith(testKey)
      expect(mockLocalStore.get).toHaveBeenCalledWith(testKey)
    })

    it('should set value in both storages and notify observers', () => {
      const testKey = 'test'
      const newValue = { a: 2 }
      const observer = vi.fn()

      storage.subscribe(testKey, observer)
      storage.set(testKey, newValue)

      expect(mockLocalStore.set).toHaveBeenCalledWith(testKey, newValue)
      expect(mockMemoryStore.set).toHaveBeenCalledWith(testKey, newValue)
      expect(observer).toHaveBeenCalledWith(newValue)
    })
  })

  describe('key presence', () => {
    it('should report a key present when memory storage holds it', () => {
      mockMemoryStore._setStore('test', null)

      expect(storage.has('test')).toBe(true)
    })

    it('should fall back to localStorage presence when memory has no entry', () => {
      mockMemoryStore.has.mockReturnValue(false)
      mockLocalStore.has.mockReturnValue(true)

      expect(storage.has('test')).toBe(true)
      expect(mockLocalStore.has).toHaveBeenCalledWith('test')
    })

    it('should report a key absent when neither store holds it', () => {
      mockMemoryStore.has.mockReturnValue(false)
      mockLocalStore.has.mockReturnValue(false)

      expect(storage.has('test')).toBe(false)
    })
  })

  describe('subscription management', () => {
    it('should subscribe and unsubscribe observers', () => {
      const testKey = 'test'
      const observer = vi.fn()

      storage.subscribe(testKey, observer)
      storage.set(testKey, { b: 2 })

      expect(observer).toHaveBeenCalledTimes(1)

      storage.unsubscribe(testKey, observer)
      storage.set(testKey, { b: 3 })

      expect(observer).toHaveBeenCalledTimes(1) // Observer should not be called again
    })

    it('should handle multiple observers on the same key', () => {
      const testKey = 'test'
      const observer1 = vi.fn()
      const observer2 = vi.fn()
      const testValue = { multi: true }

      storage.subscribe(testKey, observer1)
      storage.subscribe(testKey, observer2)
      storage.set(testKey, testValue)

      expect(observer1).toHaveBeenCalledWith(testValue)
      expect(observer2).toHaveBeenCalledWith(testValue)
    })

    it('should handle unsubscribing non-existent observer', () => {
      const testKey = 'test'
      const observer = vi.fn()

      expect(() => storage.unsubscribe(testKey, observer)).not.toThrow()
    })
  })

  describe('localStorage monitoring', () => {
    it('should monitor localStorage changes and update memory store', () => {
      const testKey = 'test'
      const observer = vi.fn()
      const externalValue = { fromExternal: true }

      // Subscribe to get monitoring started
      storage.subscribe(testKey, observer)

      // Trigger a get to start monitoring
      storage.get(testKey)

      // Verify monitoring was set up
      expect(mockLocalStore.subscribe).toHaveBeenCalledWith(testKey, expect.any(Function))

      // Simulate external localStorage change
      const localStorageCallback = mockLocalStore.subscribe.mock.calls[0][1]
      localStorageCallback(externalValue)

      // Verify memory store was updated and observers were notified
      expect(mockMemoryStore.set).toHaveBeenCalledWith(testKey, externalValue)
      expect(observer).toHaveBeenCalledWith(externalValue)
    })

    it('should handle function-based state updates in localStorage callback', () => {
      const testKey = 'test'
      const observer = vi.fn()
      const prevValue = { count: 1 }
      const stateFunction = vi.fn((prev: any) => ({ count: prev.count + 1 }))

      storage.subscribe(testKey, observer)
      storage.get(testKey) // Start monitoring

      // Set previous value in memory
      mockMemoryStore.get.mockReturnValue(prevValue)

      // Simulate localStorage callback with function
      const localStorageCallback = mockLocalStore.subscribe.mock.calls[0][1]
      localStorageCallback(stateFunction)

      expect(stateFunction).toHaveBeenCalledWith(prevValue)
      expect(mockMemoryStore.set).toHaveBeenCalledWith(testKey, { count: 2 })
      expect(observer).toHaveBeenCalledWith({ count: 2 })
    })

    it('should only monitor each key once', () => {
      const testKey = 'test'

      // Multiple gets should only set up monitoring once
      storage.get(testKey)
      storage.get(testKey)
      storage.set(testKey, 'value')

      expect(mockLocalStore.subscribe).toHaveBeenCalledTimes(1)
    })

    it('should handle localStorage changes when no observers are present', () => {
      const testKey = 'test'
      const externalValue = { noObservers: true }

      // Start monitoring without observers
      storage.get(testKey)

      // Simulate external change
      const localStorageCallback = mockLocalStore.subscribe.mock.calls[0][1]

      // This should not throw even with no observers
      expect(() => localStorageCallback(externalValue)).not.toThrow()
      expect(mockMemoryStore.set).toHaveBeenCalledWith(testKey, externalValue)
    })
  })

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      const testKey = 'test'
      const observer = vi.fn()

      storage.subscribe(testKey, observer)

      storage.set(testKey, null)
      expect(observer).toHaveBeenCalledWith(null)
      expect(mockLocalStore.set).toHaveBeenCalledWith(testKey, null)
      expect(mockMemoryStore.set).toHaveBeenCalledWith(testKey, null)

      storage.set(testKey, undefined)
      expect(observer).toHaveBeenCalledWith(undefined)
      expect(mockLocalStore.set).toHaveBeenCalledWith(testKey, undefined)
      expect(mockMemoryStore.set).toHaveBeenCalledWith(testKey, undefined)
    })

    it('should handle setting value before subscribing', () => {
      const testKey = 'test'
      const testValue = { early: true }
      const observer = vi.fn()

      storage.set(testKey, testValue)
      storage.subscribe(testKey, observer)

      // Subsequent set should notify observer
      storage.set(testKey, { updated: true })
      expect(observer).toHaveBeenCalledWith({ updated: true })
    })

    it('should handle localStorage fallback when memory returns null', () => {
      const testKey = 'test'
      const localValue = { fromLocal: true }

      // Memory storage returns null (not undefined)
      mockMemoryStore.get.mockReturnValue(null)
      mockLocalStore.get.mockReturnValue(localValue)

      const result = storage.get(testKey)

      // Should return null from memory, not fallback to local
      expect(result).toBeNull()
      expect(mockLocalStore.get).not.toHaveBeenCalled()
    })

    it('should handle both memory and localStorage returning undefined', () => {
      const testKey = 'test'

      mockMemoryStore.get.mockReturnValue(undefined)
      mockLocalStore.get.mockReturnValue(undefined)

      const result = storage.get(testKey)

      expect(result).toBeUndefined()
      expect(mockMemoryStore.get).toHaveBeenCalledWith(testKey)
      expect(mockLocalStore.get).toHaveBeenCalledWith(testKey)
    })
  })

  describe('GlobalStorage singleton', () => {
    it('should provide a singleton instance', async () => {
      expect(GlobalStorage).toBeInstanceOf(Storage)

      // Import the same module again using the same path used for mocking
      const { GlobalStorage: GlobalStorage2 } = await import('../../src/storage/Storage')

      expect(GlobalStorage).toBe(GlobalStorage2)
    })

    it('should work like a regular Storage instance', () => {
      const testKey = 'global'
      const testValue = { global: true }

      GlobalStorage.set(testKey, testValue)
      const result = GlobalStorage.get(testKey)

      expect(result).toEqual(testValue)
    })
  })
})
