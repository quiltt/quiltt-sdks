import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import type { AuthAPI, QuilttJWT } from '@quiltt/core'
import { JsonWebTokenParse } from '@quiltt/core'

import { useImportSession } from '@/hooks/session/useImportSession'
import type { SetSession } from '@/hooks/useSession'

// Mock the JsonWebTokenParse function
vi.mock('@quiltt/core', async () => {
  const actual = await vi.importActual('@quiltt/core')
  return {
    ...actual,
    JsonWebTokenParse: vi.fn(),
  }
})

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

describe('useImportSession', () => {
  let mockAuth: ReturnType<typeof createMockAuthAPI>
  let mockSetSession: SetSession

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth = createMockAuthAPI()
    mockSetSession = vi.fn() as SetSession
  })

  describe('with no token provided', () => {
    it('returns false when no current session exists', async () => {
      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current('')
      })

      expect(imported).toBe(false)
      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('returns true when current session exists', async () => {
      const currentSession = createTestJWT()

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, currentSession, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current('')
      })

      expect(imported).toBe(true)
      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('with token already imported via explicit import', () => {
    it('returns true without making API calls on repeat import', async () => {
      const testJWT = createTestJWT()
      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testJWT.token } })

      // Use a session ref that we update to simulate setSession
      let currentSession: QuilttJWT | undefined
      const captureSetSession = vi.fn((token: unknown) => {
        if (token) currentSession = testJWT
      }) as unknown as SetSession

      const { result, rerender } = renderHook(
        ({ session }) =>
          useImportSession(mockAuth as unknown as AuthAPI, session, captureSetSession),
        { initialProps: { session: undefined as QuilttJWT | undefined } }
      )

      // First import — goes through ping
      await act(async () => {
        await result.current(testJWT.token)
      })
      expect(mockAuth.ping).toHaveBeenCalledTimes(1)

      // Simulate session being set after successful import
      rerender({ session: currentSession })

      // Second import with same token — should short-circuit
      mockAuth.ping.mockClear()
      const imported = await act(async () => result.current(testJWT.token))
      expect(imported).toBe(true)
      expect(mockAuth.ping).not.toHaveBeenCalled()
    })

    it('re-pings when session was cleared externally after successful import', async () => {
      const testJWT = createTestJWT()
      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testJWT.token } })

      let currentSession: QuilttJWT | undefined
      const captureSetSession = vi.fn((token: unknown) => {
        if (token) currentSession = testJWT
        else currentSession = undefined
      }) as unknown as SetSession

      const { result, rerender } = renderHook(
        ({ session }) =>
          useImportSession(mockAuth as unknown as AuthAPI, session, captureSetSession),
        { initialProps: { session: undefined as QuilttJWT | undefined } }
      )

      // First import
      await act(async () => result.current(testJWT.token))
      rerender({ session: currentSession })

      // Session cleared externally (expiration timer)
      currentSession = undefined
      rerender({ session: undefined })

      // Re-import should go through ping again
      mockAuth.ping.mockClear()
      await act(async () => result.current(testJWT.token))
      expect(mockAuth.ping).toHaveBeenCalledTimes(1)
    })
  })

  describe('with token matching storage-restored session (not explicitly imported)', () => {
    it('calls ping even though session already has the same token', async () => {
      const testToken = 'test.jwt.token'
      // Session was restored from localStorage — same token, but never went through importSession
      const storedSession = createTestJWT({ token: testToken })

      vi.mocked(JsonWebTokenParse).mockReturnValue(storedSession)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testToken } })

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, storedSession, mockSetSession)
      )

      const imported = await act(async () => result.current(testToken))

      expect(imported).toBe(true)
      // Must hit the server — cannot trust a storage-restored token without validation
      expect(mockAuth.ping).toHaveBeenCalledWith(testToken)
    })
  })

  describe('with invalid JWT', () => {
    it('returns false when token is not a valid JWT', async () => {
      vi.mocked(JsonWebTokenParse).mockReturnValue(null)

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current('invalid-token')
      })

      expect(imported).toBe(false)
      expect(mockAuth.ping).not.toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('with environment validation', () => {
    it('returns false when token environment does not match', async () => {
      const testJWT = createTestJWT()
      testJWT.claims.eid = 'different-environment'

      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)

      const { result } = renderHook(() =>
        useImportSession(
          mockAuth as unknown as AuthAPI,
          undefined,
          mockSetSession,
          'expected-environment'
        )
      )

      const imported = await act(async () => {
        return await result.current('test.jwt.token')
      })

      expect(imported).toBe(false)
      expect(mockAuth.ping).not.toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('continues when token environment matches', async () => {
      const testJWT = createTestJWT()
      testJWT.claims.eid = 'expected-environment'

      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testJWT.token } })

      const { result } = renderHook(() =>
        useImportSession(
          mockAuth as unknown as AuthAPI,
          undefined,
          mockSetSession,
          'expected-environment'
        )
      )

      const imported = await act(async () => {
        return await result.current(testJWT.token)
      })

      expect(imported).toBe(true)
      expect(mockAuth.ping).toHaveBeenCalledWith(testJWT.token)
      expect(mockSetSession).toHaveBeenCalledWith(testJWT.token)
    })

    it('skips environment validation when environmentId is not provided', async () => {
      const testJWT = createTestJWT()
      testJWT.claims.eid = 'any-environment'

      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testJWT.token } })

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current(testJWT.token)
      })

      expect(imported).toBe(true)
      expect(mockAuth.ping).toHaveBeenCalledWith(testJWT.token)
      expect(mockSetSession).toHaveBeenCalledWith(testJWT.token)
    })
  })

  describe('with active token (200)', () => {
    it('imports token and sets session', async () => {
      const testJWT = createTestJWT()

      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testJWT.token } })

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current(testJWT.token)
      })

      expect(imported).toBe(true)
      expect(mockAuth.ping).toHaveBeenCalledWith(testJWT.token)
      expect(mockSetSession).toHaveBeenCalledWith(testJWT.token)
    })
  })

  describe('with inactive token (401)', () => {
    it('returns false and clears local session state', async () => {
      const testJWT = createTestJWT()

      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 401, data: {} })

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current(testJWT.token)
      })

      expect(imported).toBe(false)
      expect(mockAuth.ping).toHaveBeenCalledWith(testJWT.token)
      expect(mockSetSession).toHaveBeenCalledWith(null)
    })
  })

  describe('with unexpected status codes', () => {
    it('throws error for unexpected response status', async () => {
      const testJWT = createTestJWT()

      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 500, data: {} })

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current(testJWT.token)
        })
      ).rejects.toThrow('AuthAPI.ping: Unexpected response status 500')

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('memoization', () => {
    it('returns stable function reference when dependencies do not change', () => {
      const { result, rerender } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const firstReference = result.current

      rerender()

      expect(result.current).toBe(firstReference)
    })

    it('returns new function reference when auth changes', () => {
      const { result, rerender } = renderHook(
        ({ auth }) => useImportSession(auth as unknown as AuthAPI, undefined, mockSetSession),
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
        ({ session }) => useImportSession(mockAuth as unknown as AuthAPI, session, mockSetSession),
        { initialProps: { session: session1 } }
      )

      const firstReference = result.current

      rerender({ session: session2 })

      expect(result.current).not.toBe(firstReference)
    })

    it('returns new function reference when setSession changes', () => {
      const { result, rerender } = renderHook(
        ({ setSession }) => useImportSession(mockAuth as unknown as AuthAPI, undefined, setSession),
        { initialProps: { setSession: mockSetSession } }
      )

      const firstReference = result.current

      const newSetSession = vi.fn()
      rerender({ setSession: newSetSession })

      expect(result.current).not.toBe(firstReference)
    })

    it('returns new function reference when environmentId changes', () => {
      const { result, rerender } = renderHook(
        ({ environmentId }) =>
          useImportSession(
            mockAuth as unknown as AuthAPI,
            undefined,
            mockSetSession,
            environmentId
          ),
        { initialProps: { environmentId: 'env1' } }
      )

      const firstReference = result.current

      rerender({ environmentId: 'env2' })

      expect(result.current).not.toBe(firstReference)
    })
  })

  describe('edge cases', () => {
    it('handles null session correctly', async () => {
      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, null, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current('')
      })

      expect(imported).toBe(false)
    })

    it('handles session with null token', async () => {
      const testJWT = createTestJWT()
      vi.mocked(JsonWebTokenParse).mockReturnValue(testJWT)
      mockAuth.ping.mockResolvedValue({ status: 200, data: { token: testJWT.token } })

      const { result } = renderHook(() =>
        useImportSession(mockAuth as unknown as AuthAPI, undefined, mockSetSession)
      )

      const imported = await act(async () => {
        return await result.current(testJWT.token)
      })

      expect(imported).toBe(true)
    })
  })
})
