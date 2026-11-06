import type { MockedFunction } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApolloLink } from '@apollo/client/core'
import { GraphQLError } from 'graphql'
import { Observable } from 'rxjs'

import { AuthLink } from '@/api/graphql/links/AuthLink'
import { JsonWebTokenParse } from '@/auth/json-web-token'
import { GlobalStorage } from '@/storage'

// Mock GlobalStorage
vi.mock('@/storage', () => ({
  GlobalStorage: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

// Mock JsonWebTokenParse
vi.mock('@/auth/json-web-token', () => ({
  JsonWebTokenParse: vi.fn(),
}))

const mockGlobalStorage = vi.mocked(GlobalStorage)

describe('AuthLink', () => {
  let authLink: AuthLink
  let mockOperation: ApolloLink.Operation
  let mockForward: ApolloLink.ForwardFunction
  let mockSetContext: MockedFunction<any>

  beforeEach(() => {
    vi.clearAllMocks()

    authLink = new AuthLink()

    // Create properly typed mock function
    mockSetContext = vi.fn()

    // Mock operation
    mockOperation = {
      query: {} as any,
      variables: {},
      operationName: 'TestQuery',
      extensions: {},
      setContext: mockSetContext as any,
      getContext: vi.fn().mockReturnValue({}),
    } as any

    // Mock forward function that returns an observable
    const mockObservable = {
      subscribe: vi.fn(),
    } as any

    mockForward = vi.fn().mockReturnValue(mockObservable) as any

    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('request method with token', () => {
    it('should add authorization header when token exists', () => {
      const mockToken = 'test-jwt-token-123'
      mockGlobalStorage.get.mockReturnValue(mockToken)

      const result = authLink.request(mockOperation, mockForward)

      expect(mockGlobalStorage.get).toHaveBeenCalledWith('session')
      expect(mockSetContext).toHaveBeenCalledWith(expect.any(Function))

      // Test the context function that was passed to setContext
      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      const contextResult = contextFunction({ headers: {} })

      expect(contextResult).toEqual({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      })

      expect(mockForward).toHaveBeenCalledWith(mockOperation)
      expect(result).toBe((mockForward as any).mock.results[0].value)
    })

    it('should preserve existing headers when adding authorization', () => {
      const mockToken = 'test-jwt-token-456'
      const existingHeaders = {
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      }

      mockGlobalStorage.get.mockReturnValue(mockToken)

      authLink.request(mockOperation, mockForward)

      // Test the context function with existing headers
      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      const result = contextFunction({ headers: existingHeaders })

      expect(result).toEqual({
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
          authorization: `Bearer ${mockToken}`,
        },
      })

      expect(mockForward).toHaveBeenCalledWith(mockOperation)
    })

    it('should handle context function with undefined headers', () => {
      const mockToken = 'test-jwt-token-789'
      mockGlobalStorage.get.mockReturnValue(mockToken)

      authLink.request(mockOperation, mockForward)

      // Test the context function with no headers property
      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      const result = contextFunction({})

      expect(result).toEqual({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      })
    })

    it('should work with various token formats', () => {
      const tokenFormats = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'simple-token',
        'bearer-token-123',
        'complex.token.with.dots',
      ]

      tokenFormats.forEach((token) => {
        vi.clearAllMocks()
        mockGlobalStorage.get.mockReturnValue(token)

        authLink.request(mockOperation, mockForward)

        const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
        const result = contextFunction({ headers: {} })

        expect(result.headers.authorization).toBe(`Bearer ${token}`)
        expect(mockForward).toHaveBeenCalledWith(mockOperation)
      })
    })

    it('should authorize with the token the store holds when the request is made', () => {
      mockGlobalStorage.get.mockReturnValue('first-token')

      authLink.request(mockOperation, mockForward)

      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any

      expect(contextFunction({ headers: {} }).headers.authorization).toContain('first-token')
    })
  })

  describe('request method without token', () => {
    it('should emit GraphQLError when no token exists', async () => {
      mockGlobalStorage.get.mockReturnValue(null)

      const observable = authLink.request(mockOperation, mockForward)

      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          error: (error) => {
            try {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.message).toBe('No session token available')
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(error.extensions?.reason).toBe('NO_TOKEN')
              expect(mockGlobalStorage.get).toHaveBeenCalledWith('session')
              expect(mockSetContext).not.toHaveBeenCalled()
              expect(mockForward).not.toHaveBeenCalled()
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })

    it('should emit GraphQLError when token is undefined', async () => {
      mockGlobalStorage.get.mockReturnValue(undefined)

      const observable = authLink.request(mockOperation, mockForward)

      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          error: (error) => {
            try {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(error.extensions?.reason).toBe('NO_TOKEN')
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })

    it('should emit GraphQLError when token is empty string', async () => {
      mockGlobalStorage.get.mockReturnValue('')

      const observable = authLink.request(mockOperation, mockForward)

      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          error: (error) => {
            try {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(error.extensions?.reason).toBe('NO_TOKEN')
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })

    it('should handle falsy values correctly', async () => {
      const falsyValues = [null, undefined, '', 0, false]

      for (const falsyValue of falsyValues) {
        vi.clearAllMocks()
        mockGlobalStorage.get.mockReturnValue(falsyValue)

        await new Promise<void>((resolve) => {
          const observable = authLink.request(mockOperation, mockForward)
          observable.subscribe({
            error: (error) => {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(error.extensions?.reason).toBe('NO_TOKEN')
              resolve()
            },
          })
        })
      }
    })
  })

  describe('integration scenarios', () => {
    it('should work in a typical authentication flow', () => {
      const sessionToken = 'valid-session-token-abc123'
      mockGlobalStorage.get.mockReturnValue(sessionToken)

      // Simulate a GraphQL query operation
      const queryOperation = {
        ...mockOperation,
        operationName: 'GetUserProfile',
        variables: { userId: '123' },
      }

      const result = authLink.request(queryOperation, mockForward)

      expect(result).not.toBeNull()
      expect(mockGlobalStorage.get).toHaveBeenCalledWith('session')
      expect(mockSetContext).toHaveBeenCalled()
      expect(mockForward).toHaveBeenCalledWith(queryOperation)

      // Verify the context was set correctly
      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      const contextResult = contextFunction({
        headers: { accept: 'application/json' },
      })

      expect(contextResult).toEqual({
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${sessionToken}`,
        },
      })
    })

    it('should prevent unauthenticated requests from proceeding', async () => {
      mockGlobalStorage.get.mockReturnValue(null)

      // Simulate a protected query
      const protectedOperation = {
        ...mockOperation,
        operationName: 'GetSensitiveData',
      }

      const observable = authLink.request(protectedOperation, mockForward)

      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          error: (error) => {
            try {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.message).toBe('No session token available')
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(mockSetContext).not.toHaveBeenCalled()
              expect(mockForward).not.toHaveBeenCalled()
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })
  })

  describe('token management scenarios', () => {
    it('should handle token rotation scenarios', () => {
      // First request with old token
      const oldToken = 'old-token-123'
      mockGlobalStorage.get.mockReturnValue(oldToken)

      authLink.request(mockOperation, mockForward)

      let contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      let result = contextFunction({ headers: {} })

      expect(result.headers.authorization).toBe(`Bearer ${oldToken}`)

      // Clear mocks for second request
      vi.clearAllMocks()
      // Re-assign the mock since we cleared it
      mockOperation.setContext = mockSetContext as any

      // Second request with new token (simulating token refresh)
      const newToken = 'new-token-456'
      mockGlobalStorage.get.mockReturnValue(newToken)

      authLink.request(mockOperation, mockForward)

      contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      result = contextFunction({ headers: {} })

      expect(result.headers.authorization).toBe(`Bearer ${newToken}`)
    })

    it('should handle session expiry scenarios', async () => {
      // First request succeeds
      mockGlobalStorage.get.mockReturnValue('valid-token')
      const result = authLink.request(mockOperation, mockForward)
      expect(result).not.toBeNull()

      // Clear mocks
      vi.clearAllMocks()
      // Re-assign the mock since we cleared it
      mockOperation.setContext = mockSetContext as any

      // Second request fails due to expired/cleared session
      mockGlobalStorage.get.mockReturnValue(null)
      const observable = authLink.request(mockOperation, mockForward)

      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          error: (error) => {
            try {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.message).toBe('No session token available')
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })
  })

  describe('error handling', () => {
    it('should propagate an error thrown by the store', () => {
      mockGlobalStorage.get.mockImplementation(() => {
        throw new Error('Storage not available')
      })

      expect(() => authLink.request(mockOperation, mockForward)).toThrow('Storage not available')
    })

    it('should handle setContext throwing errors', () => {
      const mockToken = 'test-token'
      mockGlobalStorage.get.mockReturnValue(mockToken)
      mockSetContext.mockImplementation(() => {
        throw new Error('SetContext failed')
      })

      expect(() => authLink.request(mockOperation, mockForward)).toThrow('SetContext failed')
    })

    it('should handle forward function errors', () => {
      const mockToken = 'test-token'
      mockGlobalStorage.get.mockReturnValue(mockToken)
      ;(mockForward as any).mockImplementation(() => {
        throw new Error('Forward failed')
      })

      expect(() => authLink.request(mockOperation, mockForward)).toThrow('Forward failed')
    })
  })

  describe('token expiration handling', () => {
    it('should emit GraphQLError and clear storage when token is expired', async () => {
      const { JsonWebTokenParse } = await import('@/auth/json-web-token')
      const mockToken = 'expired.token.here'
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago

      mockGlobalStorage.get.mockReturnValue(mockToken)
      vi.mocked(JsonWebTokenParse).mockReturnValue({
        token: mockToken,
        claims: {
          exp: expiredTimestamp,
          iat: expiredTimestamp - 7200,
          iss: 'test',
          sub: 'test',
          aud: 'test',
          nbf: expiredTimestamp - 7200,
          jti: 'test',
          oid: 'test',
          eid: 'test',
          cid: 'test',
          aid: 'test',
          ver: 1,
          rol: 'manager',
        } as any,
      })

      const observable = authLink.request(mockOperation, mockForward)

      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          error: (error) => {
            try {
              expect(error).toBeInstanceOf(GraphQLError)
              expect(error.message).toBe('Session token has expired')
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(error.extensions?.reason).toBe('TOKEN_EXPIRED')
              expect(error.extensions?.expiredAt).toBe(expiredTimestamp)
              expect(mockGlobalStorage.set).toHaveBeenCalledWith('session', null)
              expect(mockSetContext).not.toHaveBeenCalled()
              expect(mockForward).not.toHaveBeenCalled()
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })

    it('should allow valid non-expired tokens through', async () => {
      const { JsonWebTokenParse } = await import('@/auth/json-web-token')
      const mockToken = 'valid.token.here'
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

      mockGlobalStorage.get.mockReturnValue(mockToken)
      vi.mocked(JsonWebTokenParse).mockReturnValue({
        token: mockToken,
        claims: {
          exp: futureTimestamp,
          iat: Math.floor(Date.now() / 1000),
          iss: 'test',
          sub: 'test',
          aud: 'test',
          nbf: Math.floor(Date.now() / 1000),
          jti: 'test',
          oid: 'test',
          eid: 'test',
          cid: 'test',
          aid: 'test',
          ver: 1,
          rol: 'manager',
        } as any,
      })

      const result = authLink.request(mockOperation, mockForward)

      expect(result).not.toBeNull()
      expect(mockGlobalStorage.set).not.toHaveBeenCalled()
      expect(mockForward).toHaveBeenCalled()

      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any

      expect(contextFunction({ headers: {} }).headers.authorization).toContain(mockToken)
    })

    it('should allow tokens without exp claim', async () => {
      const { JsonWebTokenParse } = await import('@/auth/json-web-token')
      const mockToken = 'token.without.exp'

      mockGlobalStorage.get.mockReturnValue(mockToken)
      vi.mocked(JsonWebTokenParse).mockReturnValue({
        token: mockToken,
        claims: {
          exp: undefined as any,
          iat: Math.floor(Date.now() / 1000),
          iss: 'test',
          sub: 'test',
          aud: 'test',
          nbf: Math.floor(Date.now() / 1000),
          jti: 'test',
          oid: 'test',
          eid: 'test',
          cid: 'test',
          aid: 'test',
          ver: 1,
          rol: 'manager',
        } as any,
      })

      const result = authLink.request(mockOperation, mockForward)

      expect(result).not.toBeNull()
      expect(mockGlobalStorage.set).not.toHaveBeenCalled()
      expect(mockForward).toHaveBeenCalled()

      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any

      expect(contextFunction({ headers: {} }).headers.authorization).toContain(mockToken)
    })
  })

  describe('inheritance and Apollo Link compatibility', () => {
    it('should be usable where Apollo expects a link', () => {
      expect(authLink).toBeInstanceOf(ApolloLink)

      // a link chain accepts it, which a stub of `request` alone would not imply
      expect(() => ApolloLink.from([authLink])).not.toThrow()
    })

    it('should return the correct type from forward', () => {
      const mockToken = 'valid.token.here'
      const mockObservable = new Observable((subscriber) => {
        subscriber.next({ data: { test: 'value' } })
        subscriber.complete()
      })

      mockGlobalStorage.get.mockReturnValue(mockToken)
      ;(mockForward as any).mockReturnValue(mockObservable)

      const result = authLink.request(mockOperation, mockForward)

      expect(result).toBeInstanceOf(Observable)
      expect(mockForward).toHaveBeenCalledWith(mockOperation)
    })
  })

  describe('with a session token source', () => {
    it('reads the token from the source instead of the store', () => {
      // The store holds nothing: on a server there is no shared slot to hold it.
      mockGlobalStorage.get.mockReturnValue(undefined)

      const source = { read: vi.fn().mockReturnValue('request-token'), clear: vi.fn() }
      const link = new AuthLink(source)

      link.request(mockOperation, mockForward)

      const contextFunction = mockSetContext.mock.calls[0][0] as (context: any) => any
      const result = contextFunction({ headers: {} })

      expect(source.read).toHaveBeenCalled()
      expect(result.headers.authorization).toContain('request-token')
      expect(mockGlobalStorage.get).not.toHaveBeenCalled()
      expect(mockForward).toHaveBeenCalledWith(mockOperation)
    })

    it('reports NO_TOKEN for an empty source even when the store holds a session', async () => {
      // Falling back to the store would authenticate with another request's session.
      mockGlobalStorage.get.mockReturnValue('stored-token')

      const link = new AuthLink({ read: () => null })

      await new Promise<void>((resolve, reject) => {
        link.request(mockOperation, mockForward).subscribe({
          error: (error) => {
            try {
              expect(error.extensions?.code).toBe('UNAUTHENTICATED')
              expect(error.extensions?.reason).toBe('NO_TOKEN')
              expect(mockForward).not.toHaveBeenCalled()
              resolve()
            } catch (e) {
              reject(e)
            }
          },
        })
      })
    })

    it('drops an expired token through the source, leaving the store alone', () => {
      mockGlobalStorage.get.mockReturnValue(undefined)
      vi.mocked(JsonWebTokenParse).mockReturnValue({
        claims: { exp: Math.floor(Date.now() / 1000) - 60 },
      } as any)

      const source = { read: vi.fn().mockReturnValue('expired-token'), clear: vi.fn() }
      const link = new AuthLink(source)

      link.request(mockOperation, mockForward)

      expect(source.clear).toHaveBeenCalled()
      expect(mockGlobalStorage.set).not.toHaveBeenCalled()
    })
  })
})
