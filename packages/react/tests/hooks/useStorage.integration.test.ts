import { createElement, useEffect } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { GlobalStorage } from '@quiltt/core'

import { useStorage } from '@/hooks/useStorage'

/**
 * These run against the real `GlobalStorage` rather than a mock, because the behaviour under test
 * is about what the store reports back after a write — something a `vi.fn()` cannot model. Storage
 * reports a missing key as `undefined` and a cleared one as `null`, and that distinction is what
 * keeps `initialState` from coming back after a clear.
 */
describe('useStorage against GlobalStorage', () => {
  let counter = 0
  const freshKey = () => `useStorage-integration-${++counter}`

  it('renders the default on the first pass even when the store holds a value', () => {
    const key = freshKey()
    GlobalStorage.set(key, 'stored')

    const Probe = () => {
      const [value] = useStorage<string>(key, 'default')
      return createElement('span', null, value)
    }

    // Server rendering never reads storage, so the first pass must not either — otherwise the
    // client hydrates different markup. The stored value is adopted in a layout effect after.
    expect(renderToString(createElement(Probe))).toContain('default')
  })

  it('reads the stored value on the first client render', () => {
    const key = freshKey()
    GlobalStorage.set(key, 'stored')

    const seen: (string | null | undefined)[] = []
    renderHook(() => {
      const [value] = useStorage<string>(key, 'default')
      seen.push(value)
      return value
    })

    // A screen mounted straight into the browser has no server markup to agree with, so the first
    // render must already hold the stored value: an effect that runs after it — a redirect on an
    // empty session, say — would otherwise act on a value the user never had.
    expect(seen[0]).toBe('stored')
  })

  it('reports the value as unread until the hook has taken over from the server', () => {
    const key = freshKey()
    GlobalStorage.set(key, 'stored')

    const seen: boolean[] = []
    const { result } = renderHook(() => {
      const [value, , restored] = useStorage<string>(key)
      seen.push(restored)
      return { value, restored }
    })

    // The render that has to match the server's markup cannot know whether a session was stored, so
    // it is not a state a caller may act on.
    expect(seen[0]).toBe(false)
    expect(result.current.restored).toBe(true)
    expect(result.current.value).toBe('stored')
  })

  it('reports a server render as unread', () => {
    const key = freshKey()
    GlobalStorage.set(key, 'stored')

    const Probe = () => {
      const [value, , restored] = useStorage<string>(key)
      return createElement('span', null, `${restored}:${value}`)
    }

    expect(renderToString(createElement(Probe))).toBe('<span>false:undefined</span>')
  })

  it('never reports a stored value as read while it is still the default', async () => {
    const key = freshKey()
    GlobalStorage.set(key, 'stored')

    const observations: Array<[string | null | undefined, boolean]> = []
    const Probe = () => {
      const [value, , restored] = useStorage<string>(key)
      useEffect(() => {
        observations.push([value, restored])
      }, [value, restored])
      return createElement('span', null, value ?? 'none')
    }

    const container = document.createElement('div')
    container.innerHTML = renderToString(createElement(Probe))
    document.body.appendChild(container)

    let root: Root
    await act(async () => {
      root = hydrateRoot(container, createElement(Probe))
    })
    await act(async () => {})

    // The guarantee callers redirect on: `restored` never marks an empty value as final, so a
    // decision made only once it is `true` cannot sign a signed-in user out.
    expect(observations.filter(([value, restored]) => restored && !value)).toEqual([])
    expect(observations.at(-1)).toEqual(['stored', true])

    await act(async () => root.unmount())
    container.remove()
  })

  it('saves the initial value when it is set explicitly', () => {
    const key = freshKey()
    const { result } = renderHook(() => useStorage<string>(key, 'dark'))

    expect(result.current[0]).toBe('dark')

    // The rendered value is the default, not a stored one. Setting the same value has to store it,
    // or nothing is saved and another reader sees nothing.
    act(() => result.current[1]('dark'))

    expect(GlobalStorage.get(key)).toBe('dark')
    expect(renderHook(() => useStorage<string>(key)).result.current[0]).toBe('dark')
  })

  it('applies the initial value to a key that was never written', () => {
    const { result } = renderHook(() => useStorage<number>(freshKey(), 5))

    expect(result.current[0]).toBe(5)
  })

  it('resolves an updater against the initial value of an unwritten key', () => {
    const key = freshKey()
    const { result } = renderHook(() => useStorage<number>(key, 5))

    act(() => {
      result.current[1]((prev) => (prev ?? 0) + 1)
    })

    expect(GlobalStorage.get(key)).toBe(6)
  })

  it('does not bring the initial value back after this hook clears it', () => {
    const key = freshKey()
    const { result } = renderHook(() => useStorage<number>(key, 5))

    act(() => {
      result.current[1](undefined)
    })
    act(() => {
      result.current[1]((prev) => (prev ?? 0) + 1)
    })

    expect(GlobalStorage.get(key)).toBe(1)
  })

  it('does not bring the initial value back after another instance clears it', () => {
    const key = freshKey()
    const first = renderHook(() => useStorage<number>(key, 5))
    const second = renderHook(() => useStorage<number>(key, 5))

    act(() => {
      second.result.current[1](undefined)
    })
    act(() => {
      first.result.current[1]((prev) => (prev ?? 0) + 1)
    })

    expect(GlobalStorage.get(key)).toBe(1)
  })

  it('gives each key its own initial value when the hook switches keys', () => {
    const first = freshKey()
    const second = freshKey()
    const { result, rerender } = renderHook(({ key }) => useStorage<number>(key, 5), {
      initialProps: { key: first },
    })

    act(() => {
      result.current[1](7)
    })
    rerender({ key: second })
    act(() => {
      result.current[1]((prev) => (prev ?? 0) + 1)
    })

    expect(GlobalStorage.get(first)).toBe(7)
    expect(GlobalStorage.get(second)).toBe(6)
  })

  it('keeps the first default for a key when the default changes on rerender', () => {
    const key = freshKey()
    const { result, rerender } = renderHook(({ initial }) => useStorage<number>(key, initial), {
      initialProps: { initial: 5 },
    })

    expect(result.current[0]).toBe(5)

    rerender({ initial: 10 })

    // The hook still renders the first default, so the updater has to see 5 — not the 10 that
    // arrived later, which would write 11 for a value the user never saw.
    expect(result.current[0]).toBe(5)

    act(() => {
      result.current[1]((prev) => (prev ?? 0) + 1)
    })

    expect(GlobalStorage.get(key)).toBe(6)
  })

  it('does not re-render forever when the default is an inline object', () => {
    const key = freshKey()
    // Write behind the store's back so, as after a reload, memory is cold and every read parses a
    // fresh object out of localStorage.
    window.localStorage.setItem(`quiltt.${key}`, JSON.stringify({ theme: 'dark' }))

    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useStorage<{ theme?: string }>(key, {})
    })

    expect(result.current[0]).toEqual({ theme: 'dark' })

    // An inline default is a new object each render. If the adoption effect depended on it, every
    // read would look like a change, queue another render, and end in "Maximum update depth exceeded".
    expect(renders).toBeLessThan(5)
  })

  it('does not reapply the initial value on remount after being cleared', () => {
    const key = freshKey()
    const first = renderHook(() => useStorage<number>(key, 5))

    act(() => {
      first.result.current[1](undefined)
    })
    first.unmount()

    const second = renderHook(() => useStorage<number>(key, 5))

    // The clear is persisted, so it reads back as `null` — still not the default, which is the point.
    expect(second.result.current[0]).toBeNull()
  })
})
