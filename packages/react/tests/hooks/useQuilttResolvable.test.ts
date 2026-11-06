import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import type { QuilttJWT } from '@quiltt/core'

import { useQuilttResolvable } from '@/hooks/useQuilttResolvable'

// `useSession` returns a setter tagged with the slot it writes, and the controller that pairs the two;
// these tests never exercise either, so stubs keep the mock in shape.
const stubSetSession = () => Object.assign(vi.fn(), { storageKey: 'session' })

const stubController = (setSession: unknown) => ({
  set: setSession as never,
  snapshot: () => ({ token: null, revision: 0 }),
  adopt: () => true,
})

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

const mockCheckResolvable = vi.fn()
vi.mock('@quiltt/core', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  class MockConnectorsAPI {
    checkResolvable = mockCheckResolvable
  }
  return {
    ...actual,
    ConnectorsAPI: MockConnectorsAPI,
  }
})

const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('useQuilttResolvable', async () => {
  const { useSession } = await import('@/hooks/useSession')
  const mockUseSession = vi.mocked(useSession)

  const mockSession = {
    token: 'mock-token',
    claims: {
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  } as QuilttJWT

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleError.mockClear()

    mockUseSession.mockReturnValue([mockSession, stubSetSession(), stubController(vi.fn()), true])
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.checkResolvable).toBe('function')
    })
  })

  describe('checkResolvable function', () => {
    it('should return true when provider ID is resolvable', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(true)
      expect(result.current.isResolvable).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return false when provider ID is not resolvable', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: false },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_unknown' })
      })

      expect(resolvableResult).toBe(false)
      expect(result.current.isResolvable).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set isLoading to true while checking', async () => {
      mockCheckResolvable.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ status: 200, data: { resolvable: true } }), 100)
          )
      )

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      act(() => {
        result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should call ConnectorsAPI with correct parameters', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'test-connector', {
        plaid: 'ins_3',
      })
    })
  })

  describe('error handling', () => {
    it('should return null when session token is missing', async () => {
      mockUseSession.mockReturnValue([null, stubSetSession(), stubController(vi.fn()), true])

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(null)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe('Missing session token')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Connector Resolvable Error:',
        'Missing session token'
      )
    })

    it('should return null when connector ID is missing', async () => {
      const { result } = renderHook(() => useQuilttResolvable(''))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(null)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe('Missing connector ID')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Connector Resolvable Error:',
        'Missing connector ID'
      )
    })

    it('should return null when provider ID is missing', async () => {
      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({})
      })

      expect(resolvableResult).toBe(null)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe('No provider ID specified')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Connector Resolvable Error:',
        'No provider ID specified'
      )
    })

    it('should handle API error responses', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 404,
        data: {
          message: 'Connector not found',
          instruction: 'Is this the correct URL?',
        },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(null)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe('Connector not found')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Connector Resolvable Error:',
        'Connector not found'
      )
    })

    it('should handle API error without message', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 400,
        data: {},
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(null)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe('Failed to check resolvability')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Connector Resolvable Error:',
        'Failed to check resolvability'
      )
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network failure')
      mockCheckResolvable.mockRejectedValue(networkError)

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(null)
      expect(result.current.isResolvable).toBe(null)
      expect(result.current.error).toBe('Network failure')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Connector Resolvable Error:',
        'Network failure'
      )
    })

    it('should call onErrorCallback when provided', async () => {
      const onErrorCallback = vi.fn()
      mockCheckResolvable.mockResolvedValue({
        status: 404,
        data: {
          message: 'Not found',
        },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector', onErrorCallback))

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(onErrorCallback).toHaveBeenCalledWith('Not found')
    })

    it('should work without onErrorCallback', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 404,
        data: { message: 'Not found' },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      let resolvableResult: boolean | null = null
      await act(async () => {
        resolvableResult = await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(resolvableResult).toBe(null)
      expect(mockConsoleError).toHaveBeenCalled()
    })

    it('should clear error on successful call after error', async () => {
      mockCheckResolvable
        .mockResolvedValueOnce({
          status: 404,
          data: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { resolvable: true },
        })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })
      expect(result.current.error).toBe('Not found')

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })
      expect(result.current.error).toBe(null)
      expect(result.current.isResolvable).toBe(true)
    })

    it('should update onErrorCallback when it changes', async () => {
      const firstCallback = vi.fn()
      const secondCallback = vi.fn()

      mockCheckResolvable.mockResolvedValue({
        status: 404,
        data: { message: 'Not found' },
      })

      const { result, rerender } = renderHook(
        ({ callback }) => useQuilttResolvable('test-connector', callback),
        { initialProps: { callback: firstCallback } }
      )

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })
      expect(firstCallback).toHaveBeenCalledWith('Not found')
      expect(secondCallback).not.toHaveBeenCalled()

      firstCallback.mockClear()
      rerender({ callback: secondCallback })

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })
      expect(firstCallback).not.toHaveBeenCalled()
      expect(secondCallback).toHaveBeenCalledWith('Not found')
    })
  })

  describe('multiple calls', () => {
    it('should update data with each call', async () => {
      mockCheckResolvable
        .mockResolvedValueOnce({
          status: 200,
          data: { resolvable: true },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { resolvable: false },
        })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })
      expect(result.current.isResolvable).toBe(true)

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_unknown' })
      })
      expect(result.current.isResolvable).toBe(false)
    })

    it('should handle multiple simultaneous calls correctly', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      const [result1, result2, result3] = await act(async () => {
        return Promise.all([
          result.current.checkResolvable({ plaid: 'ins_1' }),
          result.current.checkResolvable({ plaid: 'ins_2' }),
          result.current.checkResolvable({ plaid: 'ins_3' }),
        ])
      })

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
      expect(mockCheckResolvable).toHaveBeenCalledTimes(3)
    })
  })

  describe('connector ID changes', () => {
    it('should create new ConnectorsAPI instance when connectorId changes', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result, rerender } = renderHook(
        ({ connectorId }) => useQuilttResolvable(connectorId),
        {
          initialProps: { connectorId: 'connector-1' },
        }
      )

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'connector-1', {
        plaid: 'ins_3',
      })

      rerender({ connectorId: 'connector-2' })

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3' })
      })

      expect(mockCheckResolvable).toHaveBeenLastCalledWith('mock-token', 'connector-2', {
        plaid: 'ins_3',
      })
    })
  })

  describe('provider ID variations', () => {
    it('should handle mx provider ID', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ mx: 'mx_bank_123' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'test-connector', {
        mx: 'mx_bank_123',
      })
    })

    it('should handle finicity provider ID', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ finicity: 'finicity_123' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'test-connector', {
        finicity: 'finicity_123',
      })
    })

    it('should handle akoya provider ID', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ akoya: 'akoya_123' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'test-connector', {
        akoya: 'akoya_123',
      })
    })

    it('should handle mock provider ID', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ mock: 'mock_123' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'test-connector', {
        mock: 'mock_123',
      })
    })

    it('should handle multiple provider IDs with only first valid one', async () => {
      mockCheckResolvable.mockResolvedValue({
        status: 200,
        data: { resolvable: true },
      })

      const { result } = renderHook(() => useQuilttResolvable('test-connector'))

      await act(async () => {
        await result.current.checkResolvable({ plaid: 'ins_3', mx: 'mx_123' })
      })

      expect(mockCheckResolvable).toHaveBeenCalledWith('mock-token', 'test-connector', {
        plaid: 'ins_3',
        mx: 'mx_123',
      })
    })
  })
})
