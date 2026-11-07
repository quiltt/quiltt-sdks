import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSessionController, markSessionCleared } from '@/session'
import { GlobalStorage } from '@/storage'

describe('createSessionController', () => {
  const key = 'controller-test'

  beforeEach(() => {
    GlobalStorage.set(key, null)
  })

  it('snapshots the slot and reports it unchanged as adoptable', () => {
    GlobalStorage.set(key, 'header.current.signature')
    // A real setter writes the slot; `adopt` reads it back before reporting success.
    const set = vi.fn((token: string | null) => GlobalStorage.set(key, token))
    const controller = createSessionController(set, key)

    const at = controller.snapshot()

    expect(at.token).toBe('header.current.signature')
    expect(controller.adopt('header.next.signature', at)).toBe(true)
    expect(set).toHaveBeenCalledWith('header.next.signature')
  })

  it('reports success for a token the slot already holds, and notifies the setter', () => {
    GlobalStorage.set(key, 'header.current.signature')
    const set = vi.fn()
    const controller = createSessionController(set, key)

    // A concurrent import may already have stored the token, and the session the caller asked for is
    // active either way. The setter still runs so a wrapper around it is notified.
    expect(controller.adopt('header.current.signature', controller.snapshot())).toBe(true)
    expect(set).toHaveBeenCalledWith('header.current.signature')
  })

  it('reports failure when the setter does not store the token', () => {
    GlobalStorage.set(key, null)
    // A setter that rejects the token, as `useSession`'s does for one that does not parse.
    const set = vi.fn()
    const controller = createSessionController(set, key)

    expect(controller.adopt('not-a-token', controller.snapshot())).toBe(false)
    expect(GlobalStorage.get(key)).toBeNull()
  })

  it('refuses when another session took the slot', () => {
    GlobalStorage.set(key, null)
    const set = vi.fn()
    const controller = createSessionController(set, key)
    const at = controller.snapshot()

    GlobalStorage.set(key, 'header.other-user.signature')

    expect(controller.adopt('header.mine.signature', at)).toBe(false)
    expect(set).not.toHaveBeenCalled()
  })

  it('refuses when the slot was cleared to the same empty value', () => {
    GlobalStorage.set(key, null)
    const set = vi.fn()
    const controller = createSessionController(set, key)
    const at = controller.snapshot()

    // A clear of an already-empty slot leaves storage identical; only the revision shows it.
    markSessionCleared(key)

    expect(controller.adopt('header.late.signature', at)).toBe(false)
    expect(set).not.toHaveBeenCalled()
  })

  it('ignores clears of other slots', () => {
    GlobalStorage.set(key, null)
    const set = vi.fn((token: string | null) => GlobalStorage.set(key, token))
    const controller = createSessionController(set, key)
    const at = controller.snapshot()

    markSessionCleared('another-session')

    expect(controller.adopt('header.mine.signature', at)).toBe(true)
  })
})
