import { useEffect } from 'react'

import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { GlobalStorage } from '@quiltt/core'

import { useSession } from '@/hooks/useSession'

/**
 * These run against the real `useStorage` and `GlobalStorage`, because the behaviour under test is
 * about a setter agreeing with the slot it writes — an agreement a mocked setter cannot break.
 */
const createToken = (expOffsetSeconds = 3600) => {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    exp: now + expOffsetSeconds,
    iat: now,
    iss: 'issuer',
    sub: 'subject',
    rol: 'manager' as const,
    nbf: now,
    aud: 'audience',
    jti: 'token-id',
    cid: 'client-id',
    oid: 'org-id',
    eid: 'entity-id',
    aid: 'app-id',
    ver: 1,
  }

  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('useSession controller against GlobalStorage', () => {
  let counter = 0
  const freshKey = () => `useSession-integration-${++counter}`

  it('writes through a controller kept from before that slot was cleared', () => {
    const key = freshKey()
    const token = createToken()
    GlobalStorage.set(key, token)

    const { result } = renderHook(() => useSession(key))
    // Held across renders, the way an in-flight import holds the controller it started with.
    const controller = result.current[2]

    act(() => controller.set(null))
    expect(GlobalStorage.get(key)).toBeFalsy()

    // Nothing else touched the slot, so adopting is legitimate — and it has to write. A setter
    // comparing against the token it closed over instead of the stored one skips the write here,
    // and reports a session that storage does not hold.
    let adopted = false
    act(() => {
      adopted = controller.adopt(token, controller.snapshot())
    })

    expect(adopted).toBe(true)
    expect(GlobalStorage.get(key)).toBe(token)
    expect(result.current[0]?.token).toBe(token)
  })

  it('clears through a controller kept from before that slot was cleared', () => {
    const key = freshKey()
    const token = createToken()
    GlobalStorage.set(key, token)

    const { result } = renderHook(() => useSession(key))
    const controller = result.current[2]

    // The slot moved on to another session without this controller being rebuilt.
    GlobalStorage.set(key, createToken(7200))
    expect(GlobalStorage.get(key)).not.toBe(token)

    act(() => controller.set(null))

    expect(GlobalStorage.get(key)).toBeFalsy()
    expect(result.current[0]).toBeFalsy()
  })

  it('resolves another updater against the stored token, not the render that created the setter', () => {
    const key = freshKey()
    const token = createToken()
    GlobalStorage.set(key, token)

    const { result } = renderHook(() => useSession(key))
    const setSession = result.current[1]

    GlobalStorage.set(key, null)

    // The stale render still holds `token`; the slot no longer does. An updater that saw the render
    // value would take the truthy branch and keep a session the user signed out of.
    act(() => setSession((previous) => (previous ? null : token)))

    expect(GlobalStorage.get(key)).toBe(token)
  })

  it('reports the stored session to an effect that runs on the first mount', async () => {
    const key = freshKey()
    GlobalStorage.set(key, createToken())

    const redirect = vi.fn()
    renderHook(() => {
      const [session] = useSession(key)

      // The shape an app uses to send a signed-out visitor to a login screen. A screen mounted in
      // the browser has the stored session on its first render, so this must not fire for one.
      useEffect(() => {
        if (!session) redirect()
      }, [session])

      return session
    })

    await act(async () => {})

    expect(redirect).not.toHaveBeenCalled()
  })

  it('sends a signed-out visitor to login on the first mount', async () => {
    const key = freshKey()
    GlobalStorage.set(key, null)

    const redirect = vi.fn()
    renderHook(() => {
      const [session] = useSession(key)

      useEffect(() => {
        if (!session) redirect()
      }, [session])

      return session
    })

    await act(async () => {})

    // The control for the test above: the redirect has to be wired up, or an effect that never runs
    // would pass that test just as well.
    expect(redirect).toHaveBeenCalled()
  })

  it('gives an updater the null a cleared slot holds', () => {
    const key = freshKey()
    GlobalStorage.set(key, null)

    const { result } = renderHook(() => useSession(key))
    const setSession = result.current[1]

    // Storage holds `null` here, and `useStorage` hands its own updaters that same `null`. A setter
    // reading `GlobalStorage.get(...) ?? undefined` reports `undefined` instead, so an updater that
    // branches on `null` — the value a clear actually writes — never writes at all.
    let captured: string | null | undefined
    act(() =>
      setSession((previous) => {
        captured = previous
        return previous
      })
    )

    expect(captured).toBe(null)
  })
})
