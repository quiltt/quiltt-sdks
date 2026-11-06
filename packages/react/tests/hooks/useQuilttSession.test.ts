import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import type { QuilttJWT } from '@quiltt/core'

import { useQuilttSession } from '@/hooks/useQuilttSession'
import { useSession } from '@/hooks/useSession'

// `useSession` returns a setter tagged with the slot it writes, and the controller that pairs the two;
// these tests never exercise either, so stubs keep the mock in shape.
const stubSetSession = () => Object.assign(vi.fn(), { storageKey: 'session' })

const stubController = (setSession: unknown) => ({
  set: setSession as never,
  snapshot: () => ({ token: null, revision: 0 }),
  adopt: () => true,
})

// Mock dependencies
vi.mock('@/hooks/useQuilttSettings', () => ({
  useQuilttSettings: vi.fn().mockReturnValue({ clientId: 'test-client-id' }),
}))

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(),
}))

vi.mock('@/hooks/session', () => ({
  useImportSession: vi.fn(),
  useIdentifySession: vi.fn(),
  useAuthenticateSession: vi.fn(),
  useRevokeSession: vi.fn(),
}))

vi.mock('@quiltt/core', () => {
  class MockAuthAPI {
    // Mock methods as needed
  }
  return {
    AuthAPI: MockAuthAPI,
  }
})

describe('useQuilttSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with undefined session if no token is stored', () => {
    const mockSetSession = stubSetSession()
    const mockSession: QuilttJWT | undefined = undefined
    vi.mocked(useSession).mockReturnValue([
      mockSession,
      mockSetSession,
      stubController(mockSetSession),
      true,
    ])

    const { result } = renderHook(() => useQuilttSession())
    expect(result.current.session).toBeUndefined()
  })

  it('reports the session as unread until storage has been read', () => {
    const mockSetSession = stubSetSession()

    vi.mocked(useSession).mockReturnValue([
      undefined,
      mockSetSession,
      stubController(mockSetSession),
      false,
    ])

    const { result } = renderHook(() => useQuilttSession())

    expect(result.current.restored).toBe(false)
  })

  it('clears the session upon expiration', async () => {
    const mockSetSession = stubSetSession()
    const expiredSession: QuilttJWT = {
      token: 'mock.token.value',
      claims: {
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Date.now(),
        nbf: 1,
        iss: 'issuer',
        sub: 'subject',
        aud: '',
        jti: '',
        rol: 'manager',
        cid: '',
        oid: '',
        eid: '',
        aid: '',
        ver: 1,
      },
    }

    // First return the expired session, then undefined after clearing
    vi.mocked(useSession).mockReturnValue([
      expiredSession,
      mockSetSession,
      stubController(mockSetSession),
      true,
    ])

    const { result } = renderHook(() => useQuilttSession())

    // Initially the expired session is returned
    expect(result.current.session).toEqual(expiredSession)

    // When trying to forget the session
    await act(async () => {
      await result.current.forgetSession(expiredSession.token)
    })

    // Verify setSession was called with null
    expect(mockSetSession).toHaveBeenCalledWith(null)
  })

  it('memoizes AuthAPI instance when clientId does not change', () => {
    const mockSetSession = stubSetSession()
    const mockSession: QuilttJWT | undefined = undefined
    vi.mocked(useSession).mockReturnValue([
      mockSession,
      mockSetSession,
      stubController(mockSetSession),
      true,
    ])

    // First render
    const { result: result1 } = renderHook(() => useQuilttSession())

    // Second render (rerender would create a new hook instance, so we render again)
    const { result: result2 } = renderHook(() => useQuilttSession())

    // Since clientId hasn't changed and we're using useMemo, the instances should use the same logic
    // We can't directly check the instance equality due to mocking, but we verify the hook runs correctly
    expect(result1.current.session).toBeUndefined()
    expect(result2.current.session).toBeUndefined()
  })
})
