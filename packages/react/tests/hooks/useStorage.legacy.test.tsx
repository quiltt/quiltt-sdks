import { useLayoutEffect } from 'react'

import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from '@testing-library/react'

import { GlobalStorage } from '@quiltt/core'

import { useStorage } from '@/hooks/useStorage'

// React 17 ships no `useSyncExternalStore`, and hiding it from the real module is the only way to
// exercise the fallback `useStorage` keeps for those versions: a snapshot read during render, then a
// subscription that has to catch up on its own.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return { ...actual, useSyncExternalStore: undefined }
})

describe('useStorage without useSyncExternalStore', () => {
  let counter = 0
  const freshKey = () => `useStorage-legacy-${++counter}`

  it("renders the new key's value when the key changes", () => {
    const first = freshKey()
    const second = freshKey()
    GlobalStorage.set(first, 'first')
    GlobalStorage.set(second, 'second')

    const { result, rerender } = renderHook(
      ({ storageKey }) => useStorage<string>(storageKey, 'default'),
      { initialProps: { storageKey: first } }
    )

    expect(result.current[0]).toBe('first')

    rerender({ storageKey: second })

    // The subscription moved to the new key, so the value it reads has to replace the old one instead
    // of staying on screen until something else writes.
    expect(result.current[0]).toBe('second')
  })

  it('picks up a write made before the subscription existed', () => {
    const key = freshKey()
    const seen: (string | null | undefined)[] = []

    const Writer = () => {
      useLayoutEffect(() => {
        GlobalStorage.set(key, 'written')
      }, [])

      return null
    }

    const Reader = () => {
      const [value] = useStorage<string>(key, 'default')
      seen.push(value)

      return null
    }

    render(
      <>
        <Writer />
        <Reader />
      </>
    )

    // The writer's layout effect lands before the reader subscribes, so nothing notifies it: reading
    // once on the way in is what keeps the value from staying at the pre-write default. No commit may
    // render the default after the write landed.
    expect(seen.at(-1)).toBe('written')
    expect(seen.slice(1)).not.toContain('default')
  })
})
