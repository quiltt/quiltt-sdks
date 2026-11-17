import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import type { AuthAPI } from '@quiltt/core'

import { useIdentifySession } from '@/hooks/session/useIdentifySession'
import type { SetSession } from '@/hooks/useSession'

// Helper to create mock AuthAPI
const createMockAuthAPI = () => ({
  authenticate: vi.fn(),
  ping: vi.fn(),
  identify: vi.fn(),
  revoke: vi.fn(),
  clientId: 'test-client-id',
})

describe('useIdentifySession', () => {
  let mockAuth: ReturnType<typeof createMockAuthAPI>
  let mockSetSession: SetSession

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth = createMockAuthAPI()
    mockSetSession = vi.fn() as SetSession
  })

  describe('profile created (201)', () => {
    it('sets session token and calls onSuccess callback', async () => {
      const mockToken = 'mock.jwt.token'
      const onSuccess = vi.fn()

      mockAuth.identify.mockResolvedValue({
        status: 201,
        data: { token: mockToken },
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'newuser@example.com' }, { onSuccess })
      })

      expect(mockAuth.identify).toHaveBeenCalledWith({
        email: 'newuser@example.com',
      })
      expect(mockSetSession).toHaveBeenCalledWith(mockToken)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('works with phone number identification', async () => {
      const mockToken = 'mock.jwt.token'
      const onSuccess = vi.fn()

      mockAuth.identify.mockResolvedValue({
        status: 201,
        data: { token: mockToken },
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ phone: '+15551234567' }, { onSuccess })
      })

      expect(mockAuth.identify).toHaveBeenCalledWith({
        phone: '+15551234567',
      })
      expect(mockSetSession).toHaveBeenCalledWith(mockToken)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('sets session even when onSuccess callback is not provided', async () => {
      const mockToken = 'mock.jwt.token'

      mockAuth.identify.mockResolvedValue({
        status: 201,
        data: { token: mockToken },
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'newuser@example.com' }, {})
      })

      expect(mockSetSession).toHaveBeenCalledWith(mockToken)
    })
  })

  describe('profile found - MFA challenge (202)', () => {
    it('does not set session and calls onChallenged callback', async () => {
      const onChallenged = vi.fn()

      mockAuth.identify.mockResolvedValue({
        status: 202,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'existing@example.com' }, { onChallenged })
      })

      expect(mockAuth.identify).toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
      expect(onChallenged).toHaveBeenCalled()
    })

    it('does not call onChallenged when callback is not provided', async () => {
      mockAuth.identify.mockResolvedValue({
        status: 202,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'existing@example.com' }, {})
      })

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('signups disabled (403)', () => {
    it('does not set session and calls onForbidden callback', async () => {
      const onForbidden = vi.fn()

      mockAuth.identify.mockResolvedValue({
        status: 403,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'test@example.com' }, { onForbidden })
      })

      expect(mockAuth.identify).toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
      expect(onForbidden).toHaveBeenCalled()
    })

    it('does not call onForbidden when callback is not provided', async () => {
      mockAuth.identify.mockResolvedValue({
        status: 403,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'test@example.com' }, {})
      })

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('validation errors (422)', () => {
    it('calls onError callback with error data', async () => {
      const mockErrors = {
        email: ['is invalid', 'must be unique'],
      }
      const onError = vi.fn()

      mockAuth.identify.mockResolvedValue({
        status: 422,
        data: mockErrors,
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'invalid-email' }, { onError })
      })

      expect(mockAuth.identify).toHaveBeenCalled()
      expect(mockSetSession).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(mockErrors)
    })

    it('handles phone validation errors', async () => {
      const mockErrors = {
        phone: ['is invalid'],
      }
      const onError = vi.fn()

      mockAuth.identify.mockResolvedValue({
        status: 422,
        data: mockErrors,
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ phone: 'not-a-phone' }, { onError })
      })

      expect(onError).toHaveBeenCalledWith(mockErrors)
    })

    it('does not call onError when callback is not provided', async () => {
      mockAuth.identify.mockResolvedValue({
        status: 422,
        data: { email: ['is invalid'] },
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await act(async () => {
        await result.current({ email: 'invalid' }, {})
      })

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('unexpected status codes', () => {
    it('throws error for unexpected response status', async () => {
      mockAuth.identify.mockResolvedValue({
        status: 500,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current({ email: 'test@example.com' }, {})
        })
      ).rejects.toThrow('AuthAPI.identify: Unexpected response status 500')

      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('throws when a 201 response carries no session data', async () => {
      mockAuth.identify.mockResolvedValue({ status: 201, data: undefined })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current({ email: 'test@example.com' }, {})
        })
      ).rejects.toThrow('AuthAPI.identify: Missing data on 201')

      expect(mockSetSession).not.toHaveBeenCalled()
    })

    it('throws when a 422 response carries no error data', async () => {
      mockAuth.identify.mockResolvedValue({ status: 422, data: undefined })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      await expect(
        act(async () => {
          await result.current({ email: 'test@example.com' }, {})
        })
      ).rejects.toThrow('AuthAPI.identify: Missing data on 422')

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('memoization', () => {
    it('returns stable function reference when dependencies do not change', () => {
      const { result, rerender } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const firstReference = result.current

      rerender()

      expect(result.current).toBe(firstReference)
    })

    it('returns new function reference when auth changes', () => {
      const { result, rerender } = renderHook(
        ({ auth }) => useIdentifySession(auth as unknown as AuthAPI, mockSetSession),
        { initialProps: { auth: mockAuth } }
      )

      const firstReference = result.current

      const newMockAuth = createMockAuthAPI()
      rerender({ auth: newMockAuth })

      expect(result.current).not.toBe(firstReference)
    })

    it('returns new function reference when setSession changes', () => {
      const { result, rerender } = renderHook(
        ({ setSession }) => useIdentifySession(mockAuth as unknown as AuthAPI, setSession),
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

      mockAuth.identify.mockResolvedValue({
        status: 201,
        data: { token: 'token' },
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current({ email: 'newuser@example.com' }, { onSuccess })
      })

      expect(returnValue).toEqual(expectedValue)
    })

    it('returns the value from onChallenged callback', async () => {
      const expectedValue = { challenged: true }
      const onChallenged = vi.fn().mockReturnValue(expectedValue)

      mockAuth.identify.mockResolvedValue({
        status: 202,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current({ email: 'existing@example.com' }, { onChallenged })
      })

      expect(returnValue).toEqual(expectedValue)
    })

    it('returns the value from onForbidden callback', async () => {
      const expectedValue = { forbidden: true }
      const onForbidden = vi.fn().mockReturnValue(expectedValue)

      mockAuth.identify.mockResolvedValue({
        status: 403,
        data: {},
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current({ email: 'test@example.com' }, { onForbidden })
      })

      expect(returnValue).toEqual(expectedValue)
    })

    it('returns the value from onError callback', async () => {
      const expectedValue = { errors: true }
      const onError = vi.fn().mockReturnValue(expectedValue)

      mockAuth.identify.mockResolvedValue({
        status: 422,
        data: { email: ['invalid'] },
      })

      const { result } = renderHook(() =>
        useIdentifySession(mockAuth as unknown as AuthAPI, mockSetSession)
      )

      const returnValue = await act(async () => {
        return await result.current({ email: 'invalid' }, { onError })
      })

      expect(returnValue).toEqual(expectedValue)
    })
  })
})
