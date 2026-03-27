import { createApp, ref } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pingMock: vi.fn(),
  identifyMock: vi.fn(),
  authenticateMock: vi.fn(),
  revokeMock: vi.fn(),
}))

vi.mock('@quiltt/core', async () => {
  const actual = await vi.importActual<typeof import('@quiltt/core')>('@quiltt/core')

  class MockAuthAPI {
    ping = mocks.pingMock
    identify = mocks.identifyMock
    authenticate = mocks.authenticateMock
    revoke = mocks.revokeMock
  }

  return {
    ...actual,
    AuthAPI: MockAuthAPI,
  }
})

import { useQuilttSession } from '@/composables/useQuilttSession'
import { QuilttClientIdKey, QuilttSessionKey, QuilttSetSessionKey } from '@/plugin/keys'

const createToken = (expOffsetSeconds = 3600, eid = 'entity-id') => {
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
    eid,
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

const mountComposable = <T>(factory: () => T, provide: Array<[symbol, unknown]>) => {
  let result!: T
  const root = document.createElement('div')
  document.body.appendChild(root)

  const app = createApp({
    setup() {
      result = factory()
      return () => null
    },
  })

  provide.forEach(([key, value]) => {
    app.provide(key, value)
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

describe('useQuilttSession', () => {
  afterEach(() => {
    mocks.pingMock.mockReset()
    mocks.identifyMock.mockReset()
    mocks.authenticateMock.mockReset()
    mocks.revokeMock.mockReset()
  })

  it('imports valid session token and stores via injected setter', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const sessionRef = ref(null)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession('env_1'),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    const token = createToken(3600, 'env_1')
    const imported = await result.importSession(token)

    expect(imported).toBe(true)
    expect(mocks.pingMock).toHaveBeenCalledWith(token)
    expect(setSession).toHaveBeenCalledWith(token)

    unmount()
  })

  it('returns false when importing invalid token or wrong environment', async () => {
    const sessionRef = ref(null)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    expect(await result.importSession('not-a-jwt')).toBe(false)
    unmount()

    const setSession2 = vi.fn()
    const { result: result2, unmount: unmount2 } = mountComposable(
      () => useQuilttSession('env_2'),
      [
        [QuilttSessionKey as unknown as symbol, ref(null)],
        [QuilttSetSessionKey as unknown as symbol, setSession2],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    const token = createToken(3600, 'env_1')
    expect(await result2.importSession(token)).toBe(false)

    expect(setSession).not.toHaveBeenCalled()
    expect(setSession2).not.toHaveBeenCalled()

    unmount2()
  })

  it('handles ping status branches during import', async () => {
    const sessionRef = ref(null)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    const token = createToken()

    mocks.pingMock.mockResolvedValueOnce({ status: 401 } as any)
    expect(await result.importSession(token)).toBe(false)

    mocks.pingMock.mockResolvedValueOnce({ status: 500 } as any)
    await expect(result.importSession(token)).rejects.toThrow(/Unexpected response status 500/)

    unmount()
  })

  it('handles identify and authenticate status callbacks', async () => {
    const sessionRef = ref(null)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    const onSuccess = vi.fn()
    const onChallenged = vi.fn()
    const onForbidden = vi.fn()
    const onError = vi.fn()
    const onFailure = vi.fn()

    mocks.identifyMock.mockResolvedValueOnce({
      status: 201,
      data: { token: 'identify_token' },
    } as any)
    await result.identifySession({ email: 'test@example.com' } as any, {
      onSuccess,
      onChallenged,
      onForbidden,
      onError,
    })
    expect(setSession).toHaveBeenCalledWith('identify_token')
    expect(onSuccess).toHaveBeenCalledTimes(1)

    mocks.identifyMock.mockResolvedValueOnce({ status: 202 } as any)
    await result.identifySession({ email: 'test@example.com' } as any, {
      onSuccess,
      onChallenged,
      onForbidden,
      onError,
    })
    expect(onChallenged).toHaveBeenCalledTimes(1)

    mocks.identifyMock.mockResolvedValueOnce({ status: 403 } as any)
    await result.identifySession({ email: 'test@example.com' } as any, {
      onSuccess,
      onChallenged,
      onForbidden,
      onError,
    })
    expect(onForbidden).toHaveBeenCalledTimes(1)

    mocks.identifyMock.mockResolvedValueOnce({ status: 422, data: { errors: [] } } as any)
    await result.identifySession({ email: 'test@example.com' } as any, {
      onSuccess,
      onChallenged,
      onForbidden,
      onError,
    })
    expect(onError).toHaveBeenCalledTimes(1)

    mocks.authenticateMock.mockResolvedValueOnce({
      status: 201,
      data: { token: 'auth_token' },
    } as any)
    await result.authenticateSession({ passcode: '123456' } as any, {
      onSuccess,
      onFailure,
      onError,
    })
    expect(setSession).toHaveBeenCalledWith('auth_token')

    mocks.authenticateMock.mockResolvedValueOnce({ status: 401 } as any)
    await result.authenticateSession({ passcode: '123456' } as any, {
      onSuccess,
      onFailure,
      onError,
    })
    expect(onFailure).toHaveBeenCalledTimes(1)

    mocks.authenticateMock.mockResolvedValueOnce({ status: 422, data: { errors: [] } } as any)
    await result.authenticateSession({ passcode: '123456' } as any, {
      onSuccess,
      onFailure,
      onError,
    })
    expect(onError).toHaveBeenCalledTimes(2)

    unmount()
  })

  it('throws on unexpected identify/authenticate statuses and handles revoke', async () => {
    const sessionRef = ref({ token: 'session_token' } as any)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    mocks.identifyMock.mockResolvedValueOnce({ status: 500 } as any)
    await expect(result.identifySession({ email: 'test@example.com' } as any, {})).rejects.toThrow(
      /Unexpected response status 500/
    )

    mocks.authenticateMock.mockResolvedValueOnce({ status: 500 } as any)
    await expect(result.authenticateSession({ passcode: '123456' } as any, {})).rejects.toThrow(
      /Unexpected response status 500/
    )

    mocks.revokeMock.mockResolvedValueOnce(undefined)
    await result.revokeSession()
    expect(mocks.revokeMock).toHaveBeenCalledWith('session_token')
    expect(setSession).toHaveBeenCalledWith(null)

    unmount()
  })

  it('forgets session only when token matches current session', () => {
    const sessionRef = ref({ token: 'token_current' } as any)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    result.forgetSession('token_other')
    expect(setSession).not.toHaveBeenCalled()

    result.forgetSession('token_current')
    expect(setSession).toHaveBeenCalledWith(null)

    unmount()
  })

  it('always pings a storage-restored token that was never explicitly imported', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const token = createToken(3600, 'env_1')
    // Session is pre-populated (as if restored from localStorage) but importSession
    // has never been called for this token, so validatedToken is not set.
    const sessionRef = ref({ token } as any)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    const imported = await result.importSession(token)

    expect(imported).toBe(true)
    // Must have pinged the server — cannot trust an unvalidated storage-restored token
    expect(mocks.pingMock).toHaveBeenCalledWith(token)

    unmount()
  })

  it('short-circuits after explicit import while session remains active', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const token = createToken(3600, 'env_1')
    const sessionRef = ref(null as any)
    const setSession = vi.fn((t: string | null) => {
      sessionRef.value = t ? { token: t } : null
    })

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // First import — goes through ping
    await result.importSession(token)
    expect(mocks.pingMock).toHaveBeenCalledTimes(1)

    // Second import with same token — short-circuit, no ping
    mocks.pingMock.mockClear()
    const imported = await result.importSession(token)
    expect(imported).toBe(true)
    expect(mocks.pingMock).not.toHaveBeenCalled()

    unmount()
  })

  it('re-pings after session is cleared externally while validatedToken is still set', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const token = createToken(3600, 'env_1')
    const sessionRef = ref(null as any)
    const setSession = vi.fn((t: string | null) => {
      sessionRef.value = t ? { token: t } : null
    })

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // First import validates the token
    await result.importSession(token)

    // Session cleared externally (e.g. expiration timer directly sets sessionRef to null)
    sessionRef.value = null

    // Re-import must go through ping again
    mocks.pingMock.mockClear()
    await result.importSession(token)
    expect(mocks.pingMock).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('forgets session and clears validatedToken even when session is already null', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const token = createToken(3600, 'env_1')
    const sessionRef = ref(null as any)
    const setSession = vi.fn((t: string | null) => {
      sessionRef.value = t ? { token: t } : null
    })

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // Validate and set token
    await result.importSession(token)

    // Session is cleared externally — sessionRef is already null
    sessionRef.value = null

    // forgetSession(token) should still clear validatedToken even though sessionRef is null
    result.forgetSession(token)

    // Now re-import must ping again (validatedToken was cleared by forgetSession)
    mocks.pingMock.mockClear()
    await result.importSession(token)
    expect(mocks.pingMock).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('re-pings when environmentId changes even if token and session are unchanged', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const token = createToken(3600, 'env_1')
    const sessionRef = ref(null as any)
    const setSession = vi.fn((t: string | null) => {
      sessionRef.value = t ? { token: t } : null
    })

    // First composable instance: validated for env_1
    const { result: result1, unmount: unmount1 } = mountComposable(
      () => useQuilttSession('env_1'),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    await result1.importSession(token)
    expect(mocks.pingMock).toHaveBeenCalledTimes(1)

    // Second composable instance with a different environmentId shares the same
    // sessionRef but must NOT short-circuit — the token hasn't been validated
    // against env_2 yet.
    mocks.pingMock.mockClear()
    const { result: result2, unmount: unmount2 } = mountComposable(
      () => useQuilttSession('env_2'),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // Token was minted for env_1, so env_2 check fails — returns false without ping
    const imported = await result2.importSession(token)
    expect(imported).toBe(false)
    expect(mocks.pingMock).not.toHaveBeenCalled()

    unmount1()
    unmount2()
  })

  it('exposes reactive session via computed ref', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200 } as any)

    const token = createToken(3600, 'env_1')
    const sessionRef = ref(null as any)
    const setSession = vi.fn((t: string | null) => {
      sessionRef.value = t ? { token: t } : null
    })

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // Access session.value to cover the computed getter body
    expect(result.session.value).toBeNull()

    await result.importSession(token)
    expect(result.session.value).toEqual({ token })

    unmount()
  })

  it('returns sessionRef truthiness when token is empty string', async () => {
    const token = createToken(3600, 'env_1')
    const sessionRef = ref({ token } as any)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // With an active session, empty token returns true (session is truthy)
    expect(await result.importSession('')).toBe(true)

    // With no session, empty token returns false
    sessionRef.value = null
    expect(await result.importSession('')).toBe(false)

    unmount()
  })

  it('hits break when identify/authenticate callbacks are not provided', async () => {
    const sessionRef = ref(null as any)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    // identifySession: each case when no callback is given → hits break
    mocks.identifyMock.mockResolvedValueOnce({ status: 201, data: { token: 'tok_1' } } as any)
    await result.identifySession({ email: 'a@b.com' } as any, {})

    mocks.identifyMock.mockResolvedValueOnce({ status: 202 } as any)
    await result.identifySession({ email: 'a@b.com' } as any, {})

    mocks.identifyMock.mockResolvedValueOnce({ status: 403 } as any)
    await result.identifySession({ email: 'a@b.com' } as any, {})

    mocks.identifyMock.mockResolvedValueOnce({ status: 422, data: { errors: [] } } as any)
    await result.identifySession({ email: 'a@b.com' } as any, {})

    // authenticateSession: each case when no callback is given → hits break
    mocks.authenticateMock.mockResolvedValueOnce({ status: 201, data: { token: 'tok_2' } } as any)
    await result.authenticateSession({ passcode: '0000' } as any, {})

    mocks.authenticateMock.mockResolvedValueOnce({ status: 401 } as any)
    await result.authenticateSession({ passcode: '0000' } as any, {})

    mocks.authenticateMock.mockResolvedValueOnce({ status: 422, data: { errors: [] } } as any)
    await result.authenticateSession({ passcode: '0000' } as any, {})

    expect(setSession).toHaveBeenCalledWith('tok_1')
    expect(setSession).toHaveBeenCalledWith('tok_2')

    unmount()
  })

  it('returns early from revokeSession when session is null', async () => {
    const sessionRef = ref(null as any)
    const setSession = vi.fn()

    const { result, unmount } = mountComposable(
      () => useQuilttSession(),
      [
        [QuilttSessionKey as unknown as symbol, sessionRef],
        [QuilttSetSessionKey as unknown as symbol, setSession],
        [QuilttClientIdKey as unknown as symbol, ref('cid_test')],
      ]
    )

    await result.revokeSession()

    expect(mocks.revokeMock).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()

    unmount()
  })
})
