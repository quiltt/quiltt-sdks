import { nextTick } from 'vue'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GlobalStorage } from '@quiltt/core'

import {
  QuilttClientIdKey,
  QuilttSessionControllerKey,
  QuilttSessionKey,
  QuilttSetSessionKey,
} from '@/plugin/keys'
import { QuilttPlugin } from '@/plugin/QuilttPlugin'

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

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${header}.${body}.signature`
}

/** The session as stored, with an absent key and a cleared one both reading as `null`. */
const storedSession = () => JSON.parse(localStorage.getItem('quiltt.session') ?? 'null')

describe('QuilttPlugin', () => {
  beforeEach(() => {
    // `localStorage.clear()` does not touch the process-wide memory store, so a slot left behind by
    // the previous test would be read back in place of the one this test stores.
    GlobalStorage.set('session', undefined)
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('saves the token handed in through the option, so requests authenticate with it', () => {
    const provide = vi.fn()
    const app = { provide } as any
    const token = createToken()

    QuilttPlugin.install?.(app, { clientId: 'cid_test', token })

    // The session is rendered from the option, but everything outside this app reads the store: the
    // auth link authenticates with what is saved there, and another tab mirrors it. Saving only in
    // the ref left the app's own requests going out with no token at all.
    expect(storedSession()).toBe(token)
  })

  it('adopts its own installed token once it is confirmed', async () => {
    const provide = vi.fn()
    const app = { provide } as any
    const token = createToken()

    QuilttPlugin.install?.(app, { clientId: 'cid_test', token })

    const controller = provide.mock.calls.find(
      (call) => call[0] === QuilttSessionControllerKey
    )?.[1]

    // What an import does after a `200`: `adopt` reports success only when the store holds the token,
    // so an install that filled only the ref reported failure for its own token.
    expect(controller.adopt(token, controller.snapshot())).toBe(true)
    expect(storedSession()).toBe(token)
  })

  it('initializes session from localStorage when token option is not provided', () => {
    const token = createToken()
    localStorage.setItem('quiltt.session', JSON.stringify(token))

    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: { token?: string } | null | undefined }
    expect(sessionRef.value?.token).toBe(token)
  })

  it('provides clientId, session, and setSession keys', () => {
    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    expect(provide).toHaveBeenCalledWith(QuilttSessionKey, expect.any(Object))
    expect(provide).toHaveBeenCalledWith(QuilttSetSessionKey, expect.any(Function))
    expect(provide).toHaveBeenCalledWith(QuilttClientIdKey, expect.any(Object))
  })

  it('stores imported token through provided setSession function', () => {
    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    expect(setSessionCall).toBeDefined()

    const setSession = setSessionCall?.[1] as (token: string | null) => void
    const token = createToken()

    setSession(token)

    expect(localStorage.getItem('quiltt.session')).toBe(JSON.stringify(token))
  })

  it('clears session and storage when setSession is called with null', () => {
    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const setSession = setSessionCall?.[1] as (token: string | null) => void

    const token = createToken()
    setSession(token)
    expect(localStorage.getItem('quiltt.session')).toBe(JSON.stringify(token))

    setSession(null)
    expect(storedSession()).toBeNull()
  })

  it('mirrors a session written by another source into its own ref', async () => {
    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: { token: string } | null | undefined }
    expect(sessionRef.value).toBeFalsy()

    // Another tab, another Quiltt app on the page, or a core helper writes the token.
    const token = createToken()
    GlobalStorage.set('session', token)
    await nextTick()

    expect(sessionRef.value?.token).toBe(token)
  })

  it('keeps the session object it already holds when set to the same token', () => {
    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const setSession = setSessionCall?.[1] as (token: string | null) => void
    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: { token: string } | null | undefined }

    const token = createToken()
    setSession(token)
    const session = sessionRef.value

    // Setting the token this app already holds has to leave the session object alone: a new one
    // reads as a change to the watcher, which resets the Apollo cache. `adopt` reports success for a
    // token the slot already holds, so it writes this value too.
    setSession(token)

    expect(sessionRef.value).toBe(session)
  })

  it('does not follow the shared store without a browser', () => {
    vi.stubGlobal('window', undefined)
    try {
      // The store is a process-wide singleton, so anything left behind by an earlier test would be
      // adopted as this "request's" initial session.
      GlobalStorage.set('session', null)

      const provide = vi.fn()
      const app = { provide } as any
      QuilttPlugin.install?.(app, { clientId: 'cid_test' })

      const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
      const sessionRef = sessionCall?.[1] as { value: { token: string } | null | undefined }
      expect(sessionRef.value).toBeFalsy()

      // A second install, the way a second SSR request would, then a sign-in from it.
      const otherProvide = vi.fn()
      const otherApp = { provide: otherProvide } as any
      QuilttPlugin.install?.(otherApp, { clientId: 'cid_test' })

      const otherSetSessionCall = otherProvide.mock.calls.find(
        (call) => call[0] === QuilttSetSessionKey
      )
      const setSession = otherSetSessionCall?.[1] as (token: string | null) => void
      setSession(createToken())

      // Each request's ref belongs to that request; nothing may mirror a write from another one.
      expect(sessionRef.value).toBeFalsy()
    } finally {
      vi.unstubAllGlobals()
      GlobalStorage.set('session', null)
    }
  })

  it('expires session and clears storage when token timeout is reached', () => {
    vi.useFakeTimers()

    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)

    const setSession = setSessionCall?.[1] as (token: string | null) => void
    const sessionRef = sessionCall?.[1] as { value: any }
    const token = createToken(1)

    setSession(token)
    expect(localStorage.getItem('quiltt.session')).toBe(JSON.stringify(token))

    vi.advanceTimersByTime(1100)

    expect(sessionRef.value).toBeNull()
    expect(storedSession()).toBeNull()

    vi.useRealTimers()
  })

  it('clears already expired tokens immediately', () => {
    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)

    const setSession = setSessionCall?.[1] as (token: string | null) => void
    const sessionRef = sessionCall?.[1] as { value: any }

    setSession(createToken(-60))

    expect(sessionRef.value).toBeNull()
    expect(storedSession()).toBeNull()
  })

  it('handles storage access errors gracefully', () => {
    const provide = vi.fn()
    const app = { provide } as any

    expect(() => QuilttPlugin.install?.(app, { clientId: 'cid_test' })).not.toThrow()

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const setSession = setSessionCall?.[1] as (token: string | null) => void
    expect(() => setSession(createToken())).not.toThrow()
  })

  it('clears an expired initial token from options when it is the stored session', () => {
    const expired = createToken(-10)
    localStorage.setItem('quiltt.session', JSON.stringify(expired))

    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test', token: expired })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: any }

    expect(sessionRef.value).toBeNull()
    expect(storedSession()).toBeNull()
  })

  it('leaves a different stored session alone when the options token has expired', () => {
    const stored = createToken(300)
    localStorage.setItem('quiltt.session', JSON.stringify(stored))

    const provide = vi.fn()
    const app = { provide } as any

    // The options token is this app's own, and it is not what storage holds: expiring it says nothing
    // about the session another tab has saved, so the clear stays local.
    QuilttPlugin.install?.(app, { clientId: 'cid_test', token: createToken(-10) })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: any }

    expect(sessionRef.value).toBeNull()
    expect(storedSession()).toBe(stored)
  })

  it('does not sign out a newer stored session when an expired token arrives from another tab', async () => {
    const fresh = createToken(7200)
    const expired = createToken(-10)

    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: any }

    // A paused tab resumes: storage already holds a newer sign-in, and the event it receives late is
    // an older token that has since expired. Adopting it would expire it in this tab and write the
    // clear over that newer session everywhere.
    localStorage.setItem('quiltt.session', JSON.stringify(fresh))
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'quiltt.session', newValue: JSON.stringify(expired) })
    )
    await nextTick()

    expect(sessionRef.value).toBeNull()
    expect(storedSession()).toBe(fresh)
  })

  it('does not write an observed clear back over a newer token', () => {
    const newerToken = createToken(7200)
    localStorage.setItem('quiltt.session', JSON.stringify(newerToken))

    const provide = vi.fn()
    const app = { provide } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: { token?: string } | null | undefined }

    // A sign-out another tab broadcast before this one stored `newerToken`, delivered late.
    window.dispatchEvent(new StorageEvent('storage', { key: 'quiltt.session', newValue: null }))

    // This app mirrors the clear for itself, but storage still holds the sign-in that landed after
    // it — writing the clear through would delete that token for every tab.
    expect(sessionRef.value).toBeNull()
    expect(localStorage.getItem('quiltt.session')).toBe(JSON.stringify(newerToken))
  })

  it('expires initial valid token from options through watch timeout callback', () => {
    vi.useFakeTimers()

    const provide = vi.fn()
    const app = { provide } as any
    const expiringToken = createToken(1)

    QuilttPlugin.install?.(app, {
      clientId: 'cid_test',
      token: expiringToken,
    })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: any }

    expect(sessionRef.value?.token).toBe(expiringToken)
    vi.advanceTimersByTime(1100)
    expect(sessionRef.value).toBeNull()
  })

  it('handles environments without window/localStorage', () => {
    const originalWindow = globalThis.window
    const originalLocalStorage = globalThis.localStorage

    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    })

    const provide = vi.fn()
    const app = { provide } as any

    expect(() => QuilttPlugin.install?.(app, { clientId: 'cid_test' })).not.toThrow()

    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const setSession = setSessionCall?.[1] as (token: string | null) => void
    expect(() => setSession(createToken())).not.toThrow()

    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    })
  })

  it('cleans up listeners and timers via onUnmount callback', () => {
    vi.useFakeTimers()

    const provide = vi.fn()
    const onUnmount = vi.fn<(cb: () => void) => void>()

    const app = { provide, onUnmount } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const onUnmountCallback = onUnmount.mock.calls[0]?.[0] as (() => void) | undefined
    expect(onUnmountCallback).toBeTypeOf('function')

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: { token?: string } | null | undefined }
    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const setSession = setSessionCall?.[1] as (token: string | null) => void

    const token = createToken(1)
    setSession(token)

    onUnmountCallback?.()
    onUnmountCallback?.()

    // Cleanup cancels the expiration timer, so the session it was counting down on survives.
    vi.advanceTimersByTime(5000)

    expect(sessionRef.value?.token).toBe(token)

    vi.useRealTimers()
  })

  it('wraps app.unmount to run cleanup when onUnmount is unavailable', () => {
    const provide = vi.fn()
    const originalUnmount = vi.fn(() => 'unmounted')

    const app = {
      provide,
      unmount: originalUnmount,
    } as any

    QuilttPlugin.install?.(app, { clientId: 'cid_test' })

    const sessionCall = provide.mock.calls.find((call) => call[0] === QuilttSessionKey)
    const sessionRef = sessionCall?.[1] as { value: { token?: string } | null | undefined }
    const setSessionCall = provide.mock.calls.find((call) => call[0] === QuilttSetSessionKey)
    const setSession = setSessionCall?.[1] as (token: string | null) => void

    vi.useFakeTimers()
    const token = createToken(1)
    setSession(token)

    const result = app.unmount('arg1')

    expect(result).toBe('unmounted')
    expect(originalUnmount).toHaveBeenCalledWith('arg1')

    // The wrap has to run cleanup, not just pass the call through: the timer is gone afterwards.
    vi.advanceTimersByTime(5000)
    expect(sessionRef.value?.token).toBe(token)

    vi.useRealTimers()
  })
})
