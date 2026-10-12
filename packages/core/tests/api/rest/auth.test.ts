import type { Mock, MockInstance } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PasscodePayload, UsernamePayload } from '@/api/rest/auth'
import { AuthAPI } from '@/api/rest/auth'
import { fetchWithRetry } from '@/api/rest/fetchWithRetry'
import { endpointIntrospectSessionToken } from '@/config'

vi.mock('@/api/rest/fetchWithRetry', () => ({
  fetchWithRetry: vi.fn(),
}))

describe('AuthAPI', () => {
  const clientId = 'test-client-id'
  const authAPI = new AuthAPI(clientId)
  const token = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const assertHeaders = (headers: Headers, includeAuth = true) => {
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Accept')).toBe('application/json')
    if (includeAuth) {
      expect(headers.get('Authorization')).toBe(`Bearer ${token}`)
    } else {
      expect(headers.has('Authorization')).toBe(false)
    }
  }

  const mockResponse = (body: any, status = 200, statusText = 'OK') => ({
    json: () => Promise.resolve(body),
    status,
    statusText,
    headers: new Headers(),
  })

  describe('initialization without clientId', () => {
    let errorSpy: MockInstance<any> | undefined

    beforeEach(() => {
      vi.resetAllMocks()
      errorSpy = vi.spyOn(console, 'error')
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ message: 'Mock response' }))
    })

    it('logs an error when clientId is not set and trying to identify', async () => {
      const authAPIWithoutClientId = new AuthAPI()
      const payload: UsernamePayload = { email: 'test@example.com' }
      await authAPIWithoutClientId.identify(payload)

      expect(errorSpy).toHaveBeenCalledWith(
        'Quiltt Client ID is not set. Unable to identify & authenticate'
      )
    })

    it('logs an error when clientId is not set and trying to authenticate', async () => {
      const authAPIWithoutClientId = new AuthAPI()
      const payload: PasscodePayload = { email: 'test@example.com', passcode: '123456' }
      await authAPIWithoutClientId.authenticate(payload)

      expect(errorSpy).toHaveBeenCalledWith(
        'Quiltt Client ID is not set. Unable to identify & authenticate'
      )
    })

    it('allows ping without clientId', async () => {
      const authAPIWithoutClientId = new AuthAPI()
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await authAPIWithoutClientId.ping(token)

      expect(errorSpy).not.toHaveBeenCalled()
      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      expect(fetchOptions.method).toBe('POST')
      expect(fetchOptions.headers.get('Authorization')).toBe(`Bearer ${token}`)
    })

    it('allows revoke without clientId', async () => {
      const authAPIWithoutClientId = new AuthAPI()
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse(null, 204, 'No Content'))

      await authAPIWithoutClientId.revoke(token)

      expect(errorSpy).not.toHaveBeenCalled()
      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      expect(fetchOptions.method).toBe('DELETE')
      expect(fetchOptions.headers.get('Authorization')).toBe(`Bearer ${token}`)
    })
  })

  describe('ping', () => {
    it('should call `fetchWithRetry` with correct parameters', async () => {
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await authAPI.ping(token)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      expect((fetchWithRetry as Mock).mock.calls[0][0]).toBe(endpointIntrospectSessionToken)
      expect(fetchOptions.method).toBe('POST')
      expect(fetchOptions.retry).toBe(true)
      assertHeaders(fetchOptions.headers)
    })
  })

  describe('identify', () => {
    it('should call `fetchWithRetry` with correct parameters', async () => {
      const payload: UsernamePayload = { email: 'test@example.com' }
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await authAPI.identify(payload)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      expect(fetchOptions.method).toBe('POST')
      // expect(fetchOptions.body).toBe(JSON.stringify(authAPI.body(payload)))
      expect(fetchOptions.retry).toBe(true)
      assertHeaders(fetchOptions.headers, false)
    })
  })

  describe('authenticate', () => {
    it('should call `fetchWithRetry` with correct parameters', async () => {
      const payload: PasscodePayload = { email: 'test@example.com', passcode: '123456' }
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await authAPI.authenticate(payload)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      expect(fetchOptions.method).toBe('PUT')
      expect(fetchOptions.body).toBe(
        JSON.stringify({
          session: {
            clientId: 'test-client-id',
            email: 'test@example.com',
            passcode: '123456',
          },
        })
      )
      expect(fetchOptions.retry).toBe(true)
      assertHeaders(fetchOptions.headers, false)
    })
  })

  describe('validateStatus method', () => {
    it('should validate status codes correctly', () => {
      // Access private method for testing
      const validateStatus = (authAPI as any).validateStatus

      // Should return true for status < 500 and not 429
      expect(validateStatus(200)).toBe(true)
      expect(validateStatus(201)).toBe(true)
      expect(validateStatus(202)).toBe(true)
      expect(validateStatus(204)).toBe(true)
      expect(validateStatus(400)).toBe(true)
      expect(validateStatus(401)).toBe(true)
      expect(validateStatus(404)).toBe(true)
      expect(validateStatus(422)).toBe(true)
      expect(validateStatus(499)).toBe(true)

      // Should return false for status >= 500 or 429
      expect(validateStatus(429)).toBe(false)
      expect(validateStatus(500)).toBe(false)
      expect(validateStatus(502)).toBe(false)
      expect(validateStatus(503)).toBe(false)
      expect(validateStatus(504)).toBe(false)
    })
  })

  describe('revoke', () => {
    it('should call `fetchWithRetry` with correct parameters', async () => {
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse(null, 204, 'No Content'))

      await authAPI.revoke(token)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      expect(fetchOptions.method).toBe('DELETE')
      expect(fetchOptions.retry).toBe(true)
      assertHeaders(fetchOptions.headers)
    })
  })

  describe('custom headers', () => {
    const customHeaders = {
      'Quiltt-Session-ID': 'session-123',
      'Quiltt-Anonymous-ID': 'anon-456',
      'X-Custom-Header': 'custom-value',
    }

    it('should store custom headers in constructor', () => {
      const apiWithHeaders = new AuthAPI(clientId, customHeaders)

      expect(apiWithHeaders.customHeaders).toEqual(customHeaders)
    })

    it('should include custom headers in ping request', async () => {
      const apiWithHeaders = new AuthAPI(clientId, customHeaders)
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await apiWithHeaders.ping(token)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      const headers = fetchOptions.headers as Headers

      expect(headers.get('Quiltt-Session-ID')).toBe('session-123')
      expect(headers.get('Quiltt-Anonymous-ID')).toBe('anon-456')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
    })

    it('should include custom headers in identify request', async () => {
      const apiWithHeaders = new AuthAPI(clientId, customHeaders)
      const payload: UsernamePayload = { email: 'test@example.com' }
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await apiWithHeaders.identify(payload)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      const headers = fetchOptions.headers as Headers

      expect(headers.get('Quiltt-Session-ID')).toBe('session-123')
      expect(headers.get('Quiltt-Anonymous-ID')).toBe('anon-456')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
    })

    it('should include custom headers in authenticate request', async () => {
      const apiWithHeaders = new AuthAPI(clientId, customHeaders)
      const payload: PasscodePayload = { email: 'test@example.com', passcode: '123456' }
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await apiWithHeaders.authenticate(payload)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      const headers = fetchOptions.headers as Headers

      expect(headers.get('Quiltt-Session-ID')).toBe('session-123')
      expect(headers.get('Quiltt-Anonymous-ID')).toBe('anon-456')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
    })

    it('should include custom headers in revoke request', async () => {
      const apiWithHeaders = new AuthAPI(clientId, customHeaders)
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse(null, 204, 'No Content'))

      await apiWithHeaders.revoke(token)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      const headers = fetchOptions.headers as Headers

      expect(headers.get('Quiltt-Session-ID')).toBe('session-123')
      expect(headers.get('Quiltt-Anonymous-ID')).toBe('anon-456')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
    })

    it('should not add custom headers when customHeaders is undefined', async () => {
      const apiWithoutHeaders = new AuthAPI(clientId)
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await apiWithoutHeaders.ping(token)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      const headers = fetchOptions.headers as Headers

      expect(headers.get('Quiltt-Session-ID')).toBeNull()
      expect(headers.get('Quiltt-Anonymous-ID')).toBeNull()
    })

    it('should allow custom headers to override default headers', async () => {
      const overrideHeaders = {
        Accept: 'text/plain',
      }
      const apiWithOverrides = new AuthAPI(clientId, overrideHeaders)
      ;(fetchWithRetry as Mock).mockResolvedValue(mockResponse({ token: 'new-token' }))

      await apiWithOverrides.ping(token)

      const fetchOptions = (fetchWithRetry as Mock).mock.calls[0][1]
      const headers = fetchOptions.headers as Headers

      expect(headers.get('Accept')).toBe('text/plain')
    })
  })
})
