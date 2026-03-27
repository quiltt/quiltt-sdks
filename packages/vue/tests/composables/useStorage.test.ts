import { createApp } from 'vue'

import { describe, expect, it, vi } from 'vitest'

import { GlobalStorage } from '@quiltt/core'

import { useStorage } from '@/composables/useStorage'

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

  it('handles missing-key null state and supports updater fn', () => {
    const missingKey = `test:missing:${Date.now()}:${Math.random()}`

    const { result, unmount } = mountComposable(() => useStorage<number>(missingKey, 10))

    expect(result.storage.value).toBeNull()

    result.setStorage((previous) => (previous ?? 0) + 5)
    expect(result.storage.value).toBe(5)
    expect(GlobalStorage.get(missingKey)).toBe(5)

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

  it('skips scope cleanup registration when called outside a Vue scope', () => {
    const key = `test:noscope:${Date.now()}:${Math.random()}`
    GlobalStorage.set(key, 'value')

    // Call directly without a Vue component context — getCurrentScope() is null
    const { storage } = useStorage<string>(key)

    expect(storage.value).toBe('value')
  })
})
