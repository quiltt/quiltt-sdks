import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import type { AuthAPI } from '@quiltt/core'

import { useAuthenticateSession } from '@/hooks/session/useAuthenticateSession'
import type { SetSession } from '@/hooks/useSession'

// Helper to create mock AuthAPI
const createMockAuthAPI = () => ({
  authenticate: vi.fn(),
  ping: vi.fn(),
  identify: vi.fn(),
  revoke: vi.fn(),
  clientId: 'test-client-id',
})

describe('useAuthenticateSession', () => {
  let mockAuth: ReturnType<typeof createMockAuthAPI>
  let mockSetSession: SetSession

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth = createMockAuthAPI()
    mockSetSession = vi.fn() as SetSession
  })

  describe('successful authentication (201)', () => {
    it('sets session token and calls onSuccess callback', async () => {
      const mockToken = 'mock.jwt.token'
      const onSuccess = vi.fn()

      mockAuth.authenticate.mockResolvedValue({
        status: 201,
        data: { token: mockToken },
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'test@example.com', passcode: '123456' }, { onSuccess })
      })

      expect(mockAuth.authenticate).toHaveBeenCalledWith({
        email: 'test@example.com',
        passcode: '123456',
      })
      expect(mockSetSession).toHaveBeenCalledWith(mockToken)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('works with phone number authentication', async () => {
      const mockToken = 'mock.jwt.token'
      const onSuccess = vi.fn()

      mockAuth.authenticate.mockResolvedValue({
        status: 201,
        data: { token: mockToken },
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ phone: '+15551234567', passcode: '123456' }, { onSuccess })
      })

      expect(mockAuth.authenticate).toHaveBeenCalledWith({
        phone: '+15551234567',
        passcode: '123456',
      })
      expect(mockSetSession).toHaveBeenCalledWith(mockToken)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('sets session even when onSuccess callback is not provided', async () => {
      const mockToken = 'mock.jwt.token'

      mockAuth.authenticate.mockResolvedValue({
        status: 201,
        data: { token: mockToken },
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'test@example.com', passcode: '123456' }, {})
      })

      expect(mockSetSession).toHaveBeenCalledWith(mockToken)
    })
  })

  describe('failed authentication (401)', () => {
    it('does not set session and calls onFailure callback', async () => {
      const onFailure = vi.fn()

      mockAuth.authenticate.mockResolvedValue({
        status: 401,
        data: {},
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'test@example.com', passcode: 'wrong' }, { onFailure })
      })

      expect(mockAuth.authenticate).toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
      expect(onFailure).toHaveBeenCalled()
    })

    it('does not call onFailure when callback is not provided', async () => {
      mockAuth.authenticate.mockResolvedValue({
        status: 401,
        data: {},
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'test@example.com', passcode: 'wrong' }, {})
      })

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('validation errors (422)', () => {
    it('calls onError callback with error data', async () => {
      const mockErrors = {
        email: ['is invalid'],
        passcode: ['is too short'],
      }
      const onError = vi.fn()

      mockAuth.authenticate.mockResolvedValue({
        status: 422,
        data: mockErrors,
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'invalid', passcode: '123' }, { onError })
      })

      expect(mockAuth.authenticate).toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(mockErrors)
    })

    it('does not call onError when callback is not provided', async () => {
      mockAuth.authenticate.mockResolvedValue({
        status: 422,
        data: { email: ['is invalid'] },
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'invalid', passcode: '123' }, {})
      })

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('unexpected status codes', () => {
    it('throws error for unexpected response status', async () => {
      mockAuth.authenticate.mockResolvedValue({
        status: 500,
        data: {},
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current({ email: 'test@example.com', passcode: '123456' }, {})
        })
      ).rejects.toThrow('AuthAPI.authenticate: Unexpected response status 500')

      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('throws when a 201 response carries no session data', async () => {
      mockAuth.authenticate.mockResolvedValue({ status: 201, data: undefined })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current({ email: 'test@example.com', passcode: '123456' }, {})
        })
      ).rejects.toThrow('AuthAPI.authenticate: Missing data on 201')

      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('throws when a 422 response carries no error data', async () => {
      mockAuth.authenticate.mockResolvedValue({ status: 422, data: undefined })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current({ email: 'test@example.com', passcode: '123456' }, {})
        })
      ).rejects.toThrow('AuthAPI.authenticate: Missing data on 422')

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('memoization', () => {
    it('returns stable function reference when dependencies do not change', () => {
      const { result, rerender } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const firstReference = result.current

      rerender()

      expect(result.current).toBe(firstReference)
    })

    it('returns new function reference when auth changes', () => {
      const { result, rerender } = renderHook(
        ({ auth }) => useAuthenticateSession(auth as unknown as AuthAPI, mockSetSession),
        { initialProps: { auth: mockAuth } }
      )

      const firstReference = result.current

      const newMockAuth = createMockAuthAPI()
      rerender({ auth: newMockAuth })

      expect(result.current).not.toBe(firstReference)
    })

    it('returns new function reference when setSession changes', () => {
      const { result, rerender } = renderHook(
        ({ setSession }) => useAuthenticateSession(mockAuth as unknown as AuthAPI, setSession),
        { initialProps: { setSession: mockSetSession } }
      )

      const firstReference = result.current

      const newSetSession = vi.fn()
      rerender({ setSession: newSetSession })

      expect(result.current).not.toBe(firstReference)
    })
  })

  describe('callback return values', () => {
    it('returns the value from onSuccess callback', async () => {
      const expectedValue = { success: true }
      const onSuccess = vi.fn().mockReturnValue(expectedValue)

      mockAuth.authenticate.mockResolvedValue({
        status: 201,
        data: { token: 'token' },
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current(
          { email: 'test@example.com', passcode: '123456' },
          { onSuccess }
        )
      })

      expect(returnValue).toEqual(expectedValue)
    })

    it('returns the value from onFailure callback', async () => {
      const expectedValue = { failed: true }
      const onFailure = vi.fn().mockReturnValue(expectedValue)

      mockAuth.authenticate.mockResolvedValue({
        status: 401,
        data: {},
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current({ email: 'test@example.com', passcode: 'wrong' }, { onFailure })
      })

      expect(returnValue).toEqual(expectedValue)
    })

    it('returns the value from onError callback', async () => {
      const expectedValue = { errors: true }
      const onError = vi.fn().mockReturnValue(expectedValue)

      mockAuth.authenticate.mockResolvedValue({
        status: 422,
        data: { email: ['invalid'] },
      })

      const { result } = renderHook(() =>
        useAuthenticateSession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current({ email: 'invalid', passcode: '123' }, { onError })
      })

      expect(returnValue).toEqual(expectedValue)
    })
  })
})
