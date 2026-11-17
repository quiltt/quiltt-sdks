import { createApp, nextTick } from 'vue'

import { describe, expect, it, vi } from 'vitest'

import { GlobalStorage, SESSION_STORAGE_KEY } from '@quiltt/core'

import { useSession } from '@/composables/useSession'

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

describe('useSession', () => {
  it('defaults to the shared session slot', async () => {
    const { result, unmount } = mountComposable(() => useSession())
    const token = createToken()

    result.setSession(token)
    await nextTick()

    expect(result.session.value?.token).toBe(token)
    expect(GlobalStorage.get(SESSION_STORAGE_KEY)).toBe(token)

    unmount()
  })

  it('sets and clears parsed session from JWT token', async () => {
    const { result, unmount } = mountComposable(() => useSession('session:test'))
    const token = createToken()

    result.setSession(token)
    await nextTick()

    expect(result.session.value?.token).toBe(token)

    result.setSession(null)
    await nextTick()

    expect(result.session.value).toBeNull()

    unmount()
  })

  it('ignores invalid token values and supports functional state updates', async () => {
    const { result, unmount } = mountComposable(() => useSession('session:test:fn'))
    const token = createToken()

    result.setSession(token)
    await nextTick()
    expect(result.session.value?.token).toBe(token)

    result.setSession('invalid-token')
    await nextTick()
    expect(result.session.value?.token).toBe(token)

    result.setSession(() => null)
    await nextTick()
    expect(result.session.value).toBeNull()

    unmount()
  })

  it('clears already expired tokens immediately', async () => {
    const { result, unmount } = mountComposable(() => useSession('session:test:expired'))

    result.setSession(createToken(-60))
    await nextTick()

    expect(result.session.value).toBeNull()

    unmount()
  })

  it('does not update when updater returns the same token', async () => {
    const { result, unmount } = mountComposable(() => useSession('session:test:same'))
    const token = createToken()

    result.setSession(token)
    await nextTick()
    expect(result.session.value?.token).toBe(token)

    const previousSession = result.session.value
    result.setSession((prev) => prev)
    await nextTick()

    expect(result.session.value).toBe(previousSession)

    unmount()
  })

  it('clears active timeout on unmount', async () => {
    vi.useFakeTimers()

    const { result, unmount } = mountComposable(() => useSession('session:test:unmount'))
    const token = createToken(1)

    result.setSession(token)
    await nextTick()
    expect(result.session.value?.token).toBe(token)

    unmount()
    vi.advanceTimersByTime(1100)

    vi.useRealTimers()
  })
})
