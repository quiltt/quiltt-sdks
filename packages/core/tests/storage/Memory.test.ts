import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MemoryStorage } from '@/storage/Memory'

describe('MemoryStorage', () => {
  let storage: MemoryStorage<any>

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  describe('basic functionality', () => {
    it('should return undefined for unset keys', () => {
      expect(storage.get('unknown')).toBeUndefined()
    })

    it('should set and get values correctly', () => {
      const testKey = 'test'
      const testValue = { a: 1 }
      storage.set(testKey, testValue)
      expect(storage.get(testKey)).toEqual(testValue)
    })

    it('should report a key that was never written as absent', () => {
      expect(storage.has('unknown')).toBe(false)
    })

    it('should not report a key as written when it was only subscribed to', () => {
      storage.subscribe('watched', () => {})

      expect(storage.get('watched')).toBeUndefined()
      expect(storage.has('watched')).toBe(false)
    })

    it('should report a key written with an empty value as present', () => {
      storage.set('cleared', undefined)

      expect(storage.get('cleared')).toBeUndefined()
      expect(storage.has('cleared')).toBe(true)
    })
  })

  describe('subscription behavior', () => {
    it('should allow subscribing to and receiving updates', () => {
      const testKey = 'test'
      const initialValue = { a: 1 }
      const updatedValue = { a: 2 }
      const observer = vi.fn()

      storage.set(testKey, initialValue)
      storage.subscribe(testKey, observer)

      // Trigger an update
      storage.set(testKey, updatedValue)

      expect(observer).toHaveBeenCalledWith(updatedValue)
    })

    it('should not notify unsubscribed observers', () => {
      const testKey = 'test'
      const initialValue = { a: 1 }
      const updatedValue = { a: 2 }
      const observer = vi.fn()

      storage.set(testKey, initialValue)
      storage.subscribe(testKey, observer)
      storage.unsubscribe(testKey, observer)

      // Attempt to trigger an update
      storage.set(testKey, updatedValue)

      expect(observer).not.toHaveBeenCalled()
    })

    it('should create observable when subscribing to non-existent key', () => {
      const testKey = 'newKey'
      const observer = vi.fn()

      // Subscribe to a key that doesn't exist yet - this should create the observable
      storage.subscribe(testKey, observer)

      // Now set a value - observer should be notified
      storage.set(testKey, { value: 'test' })

      expect(observer).toHaveBeenCalledWith({ value: 'test' })
    })

    it('should handle unsubscribing from non-existent key', () => {
      const observer = vi.fn()

      // This should not throw an error
      expect(() => storage.unsubscribe('nonExistentKey', observer)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      const testKey = 'test'

      storage.set(testKey, null)
      expect(storage.get(testKey)).toBeNull()

      storage.set(testKey, undefined)
      expect(storage.get(testKey)).toBeUndefined()
    })

    it('should update existing observable when setting new value', () => {
      const testKey = 'test'
      const observer = vi.fn()

      storage.set(testKey, 'initial')
      storage.subscribe(testKey, observer)

      // Set a new value - should update existing observable
      storage.set(testKey, 'updated')

      expect(observer).toHaveBeenCalledWith('updated')
      expect(storage.get(testKey)).toBe('updated')
    })

    it('should handle multiple observers on the same key', () => {
      const testKey = 'test'
      const observer1 = vi.fn()
      const observer2 = vi.fn()

      storage.subscribe(testKey, observer1)
      storage.subscribe(testKey, observer2)

      storage.set(testKey, 'broadcast')

      expect(observer1).toHaveBeenCalledWith('broadcast')
      expect(observer2).toHaveBeenCalledWith('broadcast')
    })

    it('should handle multiple keys independently', () => {
      const observer1 = vi.fn()
      const observer2 = vi.fn()

      storage.subscribe('key1', observer1)
      storage.subscribe('key2', observer2)

      storage.set('key1', 'value1')
      storage.set('key2', 'value2')

      expect(observer1).toHaveBeenCalledWith('value1')
      expect(observer2).toHaveBeenCalledWith('value2')
      expect(storage.get('key1')).toBe('value1')
      expect(storage.get('key2')).toBe('value2')
    })

    it('should allow re-subscribing after unsubscribing', () => {
      const testKey = 'test'
      const observer = vi.fn()

      storage.subscribe(testKey, observer)
      storage.set(testKey, 'first')
      expect(observer).toHaveBeenCalledWith('first')

      storage.unsubscribe(testKey, observer)
      observer.mockClear()

      storage.set(testKey, 'second')
      expect(observer).not.toHaveBeenCalled()

      // Re-subscribe
      storage.subscribe(testKey, observer)
      storage.set(testKey, 'third')
      expect(observer).toHaveBeenCalledWith('third')
    })

    it('should handle setting initial value during observable creation', () => {
      const testKey = 'test'
      const initialValue = { initial: true }

      // Set initial value (creates observable with initial state)
      storage.set(testKey, initialValue)

      // Get should return the initial value
      expect(storage.get(testKey)).toEqual(initialValue)

      // Subscribe to existing observable
      const observer = vi.fn()
      storage.subscribe(testKey, observer)

      // Update should notify observer
      storage.set(testKey, { updated: true })
      expect(observer).toHaveBeenCalledWith({ updated: true })
    })
  })
})
