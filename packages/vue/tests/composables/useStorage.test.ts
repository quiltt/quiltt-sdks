import { createApp } from 'vue'

import { describe, expect, it, vi } from 'vitest'

import { GlobalStorage } from '@quiltt/core'

import { useStorage } from '@/composables/useStorage'

// Vue cannot mount without a `window`, so the server case is simulated by the helper itself.
const isBrowserMock = vi.hoisted(() => ({ value: true }))
vi.mock('@/utils/isBrowser', () => ({ isBrowser: () => isBrowserMock.value }))

const mountComposable = <T>(factory: () => T) => {
  let result!: T
  const root = document.createElement('div')
  document.body.appendChild(root)

  const app = createApp({
    setup() {
      result = factory()
      return () => null
    },
  })

  app.mount(root)

  return {
    result,
    unmount: () => {
      app.unmount()
      root.remove()
    },
  }
}

describe('useStorage', () => {
  it('initializes from GlobalStorage and updates via setStorage', () => {
    GlobalStorage.set('test:key', 'initial')

    const { result, unmount } = mountComposable(() => useStorage<string>('test:key'))

    expect(result.storage.value).toBe('initial')

    result.setStorage('next')

    expect(result.storage.value).toBe('next')
    expect(GlobalStorage.get('test:key')).toBe('next')

    unmount()
  })

  it('uses the initial value for a key that was never written', () => {
    const missingKey = `test:missing:${Date.now()}:${Math.random()}`

    const { result, unmount } = mountComposable(() => useStorage<number>(missingKey, 10))

    expect(result.storage.value).toBe(10)

    result.setStorage((previous) => (previous ?? 0) + 5)
    expect(result.storage.value).toBe(15)
    expect(GlobalStorage.get(missingKey)).toBe(15)

    unmount()
  })

  it('saves the initial value when it is set explicitly', () => {
    const key = `test:explicit-default:${Date.now()}:${Math.random()}`

    const { result, unmount } = mountComposable(() => useStorage<string>(key, 'dark'))

    // The rendered value is the default; setting the same value has to store it.
    expect(result.storage.value).toBe('dark')

    result.setStorage('dark')

    expect(GlobalStorage.get(key)).toBe('dark')

    const second = mountComposable(() => useStorage<string>(key))
    expect(second.result.storage.value).toBe('dark')

    second.unmount()
    unmount()
  })

  it('does not write when setting to the same value', () => {
    const key = `test:same:${Date.now()}:${Math.random()}`
    GlobalStorage.set(key, 'same')

    const setSpy = vi.spyOn(GlobalStorage, 'set')
    const { result, unmount } = mountComposable(() => useStorage<string>(key))

    expect(result.storage.value).toBe('same')
    result.setStorage('same')

    expect(setSpy).not.toHaveBeenCalled()

    setSpy.mockRestore()
    unmount()
  })

  it('unsubscribes from GlobalStorage on unmount', () => {
    const key = `test:unsubscribe:${Date.now()}:${Math.random()}`
    const unsubscribeSpy = vi.spyOn(GlobalStorage, 'unsubscribe')

    const { unmount } = mountComposable(() => useStorage<string>(key))
    unmount()

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
    expect(unsubscribeSpy.mock.calls[0]?.[0]).toBe(key)

    unsubscribeSpy.mockRestore()
  })

  it('falls back to initialState when GlobalStorage.get returns undefined', () => {
    const key = `test:undefined:${Date.now()}:${Math.random()}`
    const getSpy = vi.spyOn(GlobalStorage, 'get').mockReturnValueOnce(undefined)

    const { result, unmount } = mountComposable(() => useStorage<string>(key, 'fallback'))

    expect(result.storage.value).toBe('fallback')

    getSpy.mockRestore()
    unmount()
  })

  it('works when called outside a Vue scope', () => {
    const key = `test:noscope:${Date.now()}:${Math.random()}`
    GlobalStorage.set(key, 'value')

    // Called directly, without a component context — `getCurrentScope()` is null, so there is no
    // scope to register cleanup on. Reading and writing still have to work.
    const { storage, setStorage } = useStorage<string>(key)

    expect(storage.value).toBe('value')

    setStorage('next')

    expect(storage.value).toBe('next')
    expect(GlobalStorage.get(key)).toBe('next')
  })

  it('does not follow the shared store without a browser', () => {
    isBrowserMock.value = false

    const key = `test:ssr:${Date.now()}:${Math.random()}`

    try {
      const { result, unmount } = mountComposable(() => useStorage<string>(key))
      expect(result.storage.value).toBeUndefined()

      // Another request writes the key on the same process-wide store.
      GlobalStorage.set(key, 'other-request')

      expect(result.storage.value).toBeUndefined()
      unmount()
    } finally {
      isBrowserMock.value = true
    }
  })

  it('keeps server writes out of the shared store', () => {
    isBrowserMock.value = false

    const key = `test:ssr-write:${Date.now()}:${Math.random()}`

    try {
      const { result, unmount } = mountComposable(() => useStorage<number>(key, 1))
      const setSpy = vi.spyOn(GlobalStorage, 'set')

      expect(result.storage.value).toBe(1)

      result.setStorage(2)

      // Visible to the render that made the write, invisible to the next request.
      expect(result.storage.value).toBe(2)
      expect(setSpy).not.toHaveBeenCalled()
      expect(GlobalStorage.get(key)).toBeUndefined()

      setSpy.mockRestore()
      unmount()
    } finally {
      isBrowserMock.value = true
    }
  })
})
