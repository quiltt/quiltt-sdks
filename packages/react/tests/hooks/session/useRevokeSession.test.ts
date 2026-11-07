import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import type { AuthAPI, QuilttJWT } from '@quiltt/core'
import { createSessionController, GlobalStorage } from '@quiltt/core'

import { useRevokeSession } from '@/hooks/session/useRevokeSession'
import type { SetSession } from '@/hooks/useSession'

// Helper to create mock AuthAPI
const createMockAuthAPI = () => ({
  authenticate: vi.fn(),
  ping: vi.fn(),
  identify: vi.fn(),
  revoke: vi.fn(),
  clientId: 'test-client-id',
})

// Helper to create test JWT
const createTestJWT = (overrides?: Partial<QuilttJWT>): QuilttJWT => ({
  token: 'test.jwt.token',
  claims: {
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    iss: 'issuer',
    sub: 'subject',
    aud: 'audience',
    jti: 'jwt-id',
    rol: 'manager',
    cid: 'client-id',
    oid: 'org-id',
    eid: 'environment-id',
    aid: 'app-id',
    ver: 1,
  },
  ...overrides,
})

/** A slot a controller can be bound to, standing in for the slot a `useSession` holds. */
const createTestSlot = (token: string | null) => {
  const slot = {
    token,
    read: () => slot.token,
    clearCount: () => 0,
  }

  return slot
}

/** A setter for a test slot, tagged the way `useSession`'s setter is. */
const createTestSetSession = (slot: { token: string | null }, storageKey = 'session') =>
  Object.assign(
    vi.fn((next: string | null) => {
      slot.token = next ?? null
    }),
    { storageKey }
  ) as unknown as SetSession

describe('useRevokeSession', () => {
  let mockAuth: ReturnType<typeof createMockAuthAPI>
  let mockSetSession: SetSession

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth = createMockAuthAPI()
    mockSetSession = vi.fn() as SetSession
  })

  describe('with active session', () => {
    it('revokes session and clears local state', async () => {
      const testSession = createTestJWT()
      mockAuth.revoke.mockResolvedValue({ status: 204, data: {} })

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, testSession, mockSetSession)
      )

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).toHaveBeenCalledWith(testSession.token)
      expect(mockSetSession).toHaveBeenCalledWith(null)
    })

    it('clears session even when API call fails', async () => {
      const testSession = createTestJWT()
      mockAuth.revoke.mockResolvedValue({ status: 401, data: {} })

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, testSession, mockSetSession)
      )

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).toHaveBeenCalledWith(testSession.token)
      expect(mockSetSession).toHaveBeenCalledWith(null)
    })

    it('handles API errors gracefully', async () => {
      const testSession = createTestJWT()
      mockAuth.revoke.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, testSession, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current()
        })
      ).rejects.toThrow('Network error')

      expect(mockAuth.revoke).toHaveBeenCalledWith(testSession.token)
    })

    it('does not clear a session adopted while the revoke was in flight', async () => {
      const revoked = createTestJWT({ token: 'header.revoked.signature' })
      const newer = createTestJWT({ token: 'header.newer.signature' })

      let answerRevoke: (value: { status: number }) => void = () => {}
      mockAuth.revoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            answerRevoke = resolve
          })
      )

      const slot = createTestSlot(revoked.token)
      // The hook clears through this setter, and the controller reads back the slot it writes, so the
      // slot below is what a regression would change.
      const setSession = createTestSetSession(slot)
      const controller = createSessionController(setSession, 'revoke-race-session', slot)

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, revoked, setSession, controller)
      )

      const revokedCall = result.current()

      // A sign-in with a different token lands while the revoke request is in flight.
      slot.token = newer.token
      answerRevoke({ status: 204 })
      await act(async () => {
        await revokedCall
      })

      // The session this call revoked is no longer the one in place, so it is not this call's to end.
      expect(setSession).not.toHaveBeenCalled()
      expect(slot.token).toBe(newer.token)
    })

    it('clears a session that is still the one it revoked', async () => {
      const revoked = createTestJWT({ token: 'header.still.current.signature' })

      let answerRevoke: (value: { status: number }) => void = () => {}
      mockAuth.revoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            answerRevoke = resolve
          })
      )

      const slot = createTestSlot(revoked.token)
      const setSession = createTestSetSession(slot)
      const controller = createSessionController(setSession, 'revoke-current-session', slot)

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, revoked, setSession, controller)
      )

      const revokedCall = result.current()

      answerRevoke({ status: 204 })
      await act(async () => {
        await revokedCall
      })

      // Nothing replaced it, so the revoke ends it.
      expect(setSession).toHaveBeenCalledWith(null)
      expect(slot.token).toBeNull()
    })

    it('does not write a clear when the session was already gone', async () => {
      const revoked = createTestJWT({ token: 'header.already.gone.signature' })
      mockAuth.revoke.mockResolvedValue({ status: 204 })

      const slot = createTestSlot(null)
      const setSession = createTestSetSession(slot)
      const controller = createSessionController(setSession, 'revoke-gone-session', slot)

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, revoked, setSession, controller)
      )

      await act(async () => {
        await result.current()
      })

      // Clearing here would record a sign-out, cancelling an import waiting on another token.
      expect(setSession).not.toHaveBeenCalled()
    })

    it('does not clear a session adopted while the revoke was in flight, given only the setter', async () => {
      const revoked = createTestJWT({ token: 'header.revoked.by.setter.signature' })
      const newer = createTestJWT({ token: 'header.newer.by.setter.signature' })
      const key = 'revoke-setter-race-session'

      let answerRevoke: (value: { status: number }) => void = () => {}
      mockAuth.revoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            answerRevoke = resolve
          })
      )

      // `useSession`'s setter reports the slot it writes, so a caller passing only the setter gets the
      // guard without having to pass the controller too. The controller derived from it reads the
      // shared slot for that key, so that is where the stand-in setter writes.
      GlobalStorage.set(key, revoked.token)
      const setSession = Object.assign(
        vi.fn((next: string | null) => {
          GlobalStorage.set(key, next)
        }),
        { storageKey: key }
      ) as unknown as SetSession

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, revoked, setSession)
      )

      const revokedCall = result.current()

      // A sign-in with a different token lands while the revoke request is in flight.
      GlobalStorage.set(key, newer.token)
      answerRevoke({ status: 204 })
      await act(async () => {
        await revokedCall
      })

      expect(setSession).not.toHaveBeenCalled()
      expect(GlobalStorage.get(key)).toBe(newer.token)

      GlobalStorage.set(key, null)
    })

    it('clears a session that is still the one it revoked, given only the setter', async () => {
      const revoked = createTestJWT({ token: 'header.still.current.by.setter.signature' })
      const key = 'revoke-setter-current-session'

      mockAuth.revoke.mockResolvedValue({ status: 204 })
      GlobalStorage.set(key, revoked.token)
      const setSession = Object.assign(
        vi.fn((next: string | null) => {
          GlobalStorage.set(key, next)
        }),
        { storageKey: key }
      ) as unknown as SetSession

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, revoked, setSession)
      )

      await act(async () => {
        await result.current()
      })

      expect(setSession).toHaveBeenCalledWith(null)
      expect(GlobalStorage.get(key)).toBeNull()
    })
  })

  describe('with no active session', () => {
    it('does nothing when session is undefined', async () => {
      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).not.toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('does nothing when session is null', async () => {
      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, null, mockSetSession)
      )

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).not.toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('memoization', () => {
    it('returns stable function reference when dependencies do not change', () => {
      const testSession = createTestJWT()

      const { result, rerender } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, testSession, mockSetSession)
      )

      const firstReference = result.current

      rerender()

      expect(result.current).toBe(firstReference)
    })

    it('returns new function reference when auth changes', () => {
      const testSession = createTestJWT()

      const { result, rerender } = renderHook(
        ({ auth }) => useRevokeSession(auth as unknown as AuthAPI, testSession, mockSetSession),
        { initialProps: { auth: mockAuth } }
      )

      const firstReference = result.current

      const newMockAuth = createMockAuthAPI()
      rerender({ auth: newMockAuth })

      expect(result.current).not.toBe(firstReference)
    })

    it('returns new function reference when session changes', () => {
      const session1 = createTestJWT({ token: 'token1' })
      const session2 = createTestJWT({ token: 'token2' })

      const { result, rerender } = renderHook(
        ({ session }) => useRevokeSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: session1 } }
      )

      const firstReference = result.current

      rerender({ session: session2 })

      expect(result.current).not.toBe(firstReference)
    })

    it('returns new function reference when setSession changes', () => {
      const testSession = createTestJWT()

      const { result, rerender } = renderHook(
        ({ setSession }) =>
          useRevokeSession(mockAuth as unknown as AuthAPI, testSession, setSession),
        { initialProps: { setSession: mockSetSession } }
      )

      const firstReference = result.current

      const newSetSession = vi.fn()
      rerender({ setSession: newSetSession })

      expect(result.current).not.toBe(firstReference)
    })
  })

  describe('multiple revocations', () => {
    it('handles multiple calls correctly when session changes', async () => {
      const testSession = createTestJWT()
      mockAuth.revoke.mockResolvedValue({ status: 204, data: {} })

      const { result, rerender } = renderHook(
        ({ session }: { session: QuilttJWT | undefined }) =>
          useRevokeSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: testSession as QuilttJWT | undefined } }
      )

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).toHaveBeenCalledTimes(1)
      expect(mockSetSession).toHaveBeenCalledWith(null)

      // Update to undefined session (simulating what would happen after setSession(null))
      rerender({ session: undefined })

      // Second call should not do anything since session is now undefined
      await act(async () => {
        await result.current()
      })

      // Still only called once since session is now undefined
      expect(mockAuth.revoke).toHaveBeenCalledTimes(1)
      expect(mockSetSession).toHaveBeenCalledTimes(1)
    })

    it('can revoke a new session after previous revocation', async () => {
      const session1 = createTestJWT({ token: 'token1' })
      const session2 = createTestJWT({ token: 'token2' })

      mockAuth.revoke.mockResolvedValue({ status: 204, data: {} })

      const { result, rerender } = renderHook(
        ({ session }) => useRevokeSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: session1 } }
      )

      // Revoke first session
      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).toHaveBeenCalledWith(session1.token)
      expect(mockSetSession).toHaveBeenCalledWith(null)

      // Update to new session
      rerender({ session: session2 })

      // Revoke second session
      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).toHaveBeenCalledWith(session2.token)
      expect(mockSetSession).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('handles transition from session to undefined', async () => {
      const testSession = createTestJWT()

      const { result, rerender } = renderHook(
        ({ session }: { session: QuilttJWT | undefined }) =>
          useRevokeSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: testSession as QuilttJWT | undefined } }
      )

      // Change to undefined session before revoking
      rerender({ session: undefined })

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).not.toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('handles transition from session to null', async () => {
      const testSession = createTestJWT()

      const { result, rerender } = renderHook(
        ({ session }: { session: QuilttJWT | null }) =>
          useRevokeSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: testSession as QuilttJWT | null } }
      )

      // Change to null session before revoking
      rerender({ session: null })

      await act(async () => {
        await result.current()
      })

      expect(mockAuth.revoke).not.toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('uses current session at time of revocation', async () => {
      const session1 = createTestJWT({ token: 'token1' })
      const session2 = createTestJWT({ token: 'token2' })

      mockAuth.revoke.mockResolvedValue({ status: 204, data: {} })

      const { result, rerender } = renderHook(
        ({ session }) => useRevokeSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: session1 } }
      )

      // Change session before revoking
      rerender({ session: session2 })

      await act(async () => {
        await result.current()
      })

      // Should revoke the current session (session2), not the initial one
      expect(mockAuth.revoke).toHaveBeenCalledWith(session2.token)
      expect(mockSetSession).toHaveBeenCalledWith(null)
    })
  })

  describe('return value', () => {
    it('returns void/undefined', async () => {
      const testSession = createTestJWT()
      mockAuth.revoke.mockResolvedValue({ status: 204, data: {} })

      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, testSession, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current()
      })

      expect(returnValue).toBeUndefined()
    })

    it('returns void when no session exists', async () => {
      const { result } = renderHook(() =>
        useRevokeSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current()
      })

      expect(returnValue).toBeUndefined()
    })
  })
})
