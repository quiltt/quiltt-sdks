import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import type { QuilttJWT } from '@quiltt/core'

import { useQuilttInstitutions } from '@/hooks/useQuilttInstitutions'

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

const mockSearchInstitutions = vi.fn()
vi.mock('@quiltt/core', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  class MockConnectorsAPI {
    searchInstitutions = mockSearchInstitutions
  }
  return {
    ...actual,
    ConnectorsAPI: MockConnectorsAPI,
  }
})

vi.mock('use-debounce', () => ({
  useDebounce: vi.fn((value) => [value]),
}))

const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('useQuilttInstitutions', async () => {
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
    mockSearchInstitutions.mockResolvedValue({
      status: 200,
      data: [],
    })
  })

  it('initializes with empty search results if no search term is provided', () => {
    const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

    expect(result.current.searchResults).toEqual([])
    expect(result.current.isSearching).toBe(false)
    expect(result.current.searchTerm).toBe('')
  })

  describe('search term validation', () => {
    it('clears search results and stops searching when term is less than 2 characters', () => {
      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('a')
      })

      expect(result.current.searchResults).toEqual([])
      expect(result.current.isSearching).toBe(false)
    })

    it('clears search results when term is only whitespace', () => {
      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('   ')
      })

      expect(result.current.searchResults).toEqual([])
      expect(result.current.isSearching).toBe(false)
    })

    it('sets isSearching to true and updates search term when term is 2+ characters', () => {
      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('ab')
      })

      expect(result.current.isSearching).toBe(true)
      expect(result.current.searchTerm).toBe('ab')
    })

    it('preserves whitespace in valid search terms', () => {
      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('  ab  ')
      })

      expect(result.current.isSearching).toBe(true)
      expect(result.current.searchTerm).toBe('  ab  ')
    })
  })

  describe('error handling', () => {
    it('logs error to console and calls onErrorCallback when API returns non-200 status', async () => {
      const mockErrorCallback = vi.fn()
      mockSearchInstitutions.mockResolvedValue({
        status: 400,
        data: { message: 'API Error' },
      })

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'API Error'
      )
      expect(mockErrorCallback).toHaveBeenCalledWith('API Error')
    })

    it('uses default error message when no message provided', async () => {
      const mockErrorCallback = vi.fn()
      mockSearchInstitutions.mockResolvedValue({
        status: 400,
        data: { message: '' },
      })

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'Failed to fetch institutions'
      )
      expect(mockErrorCallback).toHaveBeenCalledWith('Failed to fetch institutions')
    })

    it('uses fallback error message when message is undefined', async () => {
      const mockErrorCallback = vi.fn()
      mockSearchInstitutions.mockResolvedValue({
        status: 400,
        data: {},
      })

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'Failed to fetch institutions'
      )
      expect(mockErrorCallback).toHaveBeenCalledWith('Failed to fetch institutions')
    })

    it('works without onErrorCallback', async () => {
      mockSearchInstitutions.mockResolvedValue({
        status: 400,
        data: { message: 'API Error' },
      })

      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId'))

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'API Error'
      )
    })

    it('handles network errors thrown by search method', async () => {
      const mockErrorCallback = vi.fn()
      const mockError = new Error('Network Error')
      mockSearchInstitutions.mockRejectedValue(mockError)

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockErrorCallback).toHaveBeenCalledWith('Network Error')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'Network Error'
      )
    })

    /**
     * Tests abort controller behavior when search terms change rapidly
     * Ensures previous requests are cancelled to prevent race conditions
     */
    it('ignores errors from aborted requests', async () => {
      const mockErrorCallback = vi.fn()

      mockSearchInstitutions.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ status: 200, data: [] })
          }, 1000)
        })
      })

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      act(() => {
        result.current.setSearchTerm('testing')
      })

      await waitFor(() => {
        expect(mockSearchInstitutions).toHaveBeenCalledTimes(2)
      })

      expect(mockErrorCallback).not.toHaveBeenCalled()
      expect(result.current.isSearching).toBe(true)
    })
  })

  describe('API integration', () => {
    it('sets search results when API returns success', async () => {
      const mockInstitutions = [{ id: '1', name: 'Test Bank' }]
      mockSearchInstitutions.mockResolvedValue({
        status: 200,
        data: mockInstitutions,
      })

      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(result.current.searchResults).toEqual(mockInstitutions)
    })

    it('treats a 200 response with null data as an error, not empty results', async () => {
      const mockErrorCallback = vi.fn()
      mockSearchInstitutions.mockResolvedValue({
        status: 200,
        data: null,
      })

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockErrorCallback).toHaveBeenCalledWith('Failed to fetch institutions')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'Failed to fetch institutions'
      )
      expect(result.current.searchResults).toEqual([])
    })

    it('calls error handler when API returns non-200 status', async () => {
      const mockErrorCallback = vi.fn()
      mockSearchInstitutions.mockResolvedValue({
        status: 400,
        data: { message: 'Bad Request' },
      })

      const { result } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', mockErrorCallback)
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockErrorCallback).toHaveBeenCalledWith('Bad Request')
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Quiltt Institutions Search Error:',
        'Bad Request'
      )
    })

    it('stops searching after API call completes', async () => {
      mockSearchInstitutions.mockResolvedValue({
        status: 200,
        data: [],
      })

      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('test')
      })

      expect(result.current.isSearching).toBe(true)

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })
    })

    /**
     * Verifies guard condition prevents API calls without valid session
     */
    it('does not make API call when session token is null', async () => {
      mockUseSession.mockReturnValue([null, stubSetSession(), stubController(vi.fn()), true])

      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('test')
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockSearchInstitutions).not.toHaveBeenCalled()
      expect(result.current.isSearching).toBe(true)
    })

    /**
     * Verifies guard condition prevents API calls without valid connector
     */
    it('does not make API call when connectorId is empty', async () => {
      const { result } = renderHook(() => useQuilttInstitutions('', vi.fn()))

      act(() => {
        result.current.setSearchTerm('test')
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockSearchInstitutions).not.toHaveBeenCalled()
    })

    it('makes API call with correct parameters when conditions are met', async () => {
      const { result } = renderHook(() => useQuilttInstitutions('mockConnectorId', vi.fn()))

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(mockSearchInstitutions).toHaveBeenCalledWith(
          'mock-token',
          'mockConnectorId',
          'test',
          expect.any(AbortSignal)
        )
      })
    })

    it('aborts pending request on unmount', async () => {
      let capturedAbortSignal: AbortSignal | undefined

      mockSearchInstitutions.mockImplementation((_token, _connectorId, _searchTerm, signal) => {
        capturedAbortSignal = signal
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ status: 200, data: [] })
          }, 1000)
        })
      })

      const { result, unmount } = renderHook(() =>
        useQuilttInstitutions('mockConnectorId', vi.fn())
      )

      act(() => {
        result.current.setSearchTerm('test')
      })

      await waitFor(() => {
        expect(mockSearchInstitutions).toHaveBeenCalled()
        expect(capturedAbortSignal).toBeDefined()
      })

      // Verify signal is not aborted yet
      expect(capturedAbortSignal?.aborted).toBe(false)

      // Unmount the hook
      unmount()

      // Verify signal is now aborted (cleanup ran)
      expect(capturedAbortSignal?.aborted).toBe(true)
    })
  })
})
