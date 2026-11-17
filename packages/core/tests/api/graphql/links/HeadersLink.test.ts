import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApolloLink } from '@apollo/client/core'
import { Observable } from 'rxjs'

import HeadersLink from '@/api/graphql/links/HeadersLink'

describe('HeadersLink', () => {
  let mockOperation: ApolloLink.Operation
  let mockForward: ApolloLink.ForwardFunction
  let mockSetContext: ReturnType<typeof vi.fn>
  let capturedContextFn: ((context: any) => any) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    capturedContextFn = undefined

    // Create properly typed mock function that captures the context function
    mockSetContext = vi.fn((fn: (context: any) => any) => {
      capturedContextFn = fn
    })

    // Mock operation
    mockOperation = {
      query: {} as any,
      variables: {},
      operationName: 'TestQuery',
      extensions: {},
      setContext: mockSetContext as any,
      getContext: vi.fn().mockReturnValue({}),
    } as any
  })

  const createMockForward = (result: any = { data: { test: true } }) => {
    return vi.fn().mockReturnValue(
      new Observable((observer) => {
        observer.next(result)
        observer.complete()
      })
    ) as unknown as ApolloLink.ForwardFunction
  }

  describe('static headers', () => {
    it('should add static headers to the request context', () => {
      const headers = { 'X-Custom-Header': 'test-value' }
      const link = new HeadersLink({ headers })
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      expect(mockSetContext).toHaveBeenCalledWith(expect.any(Function))

      // Test the context function
      const result = capturedContextFn!({ headers: {} })
      expect(result).toEqual({
        headers: {
          'X-Custom-Header': 'test-value',
        },
      })
    })

    it('should merge with existing headers', () => {
      const headers = { 'X-New-Header': 'new-value' }
      const link = new HeadersLink({ headers })
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      const result = capturedContextFn!({ headers: { 'X-Existing': 'existing-value' } })
      expect(result).toEqual({
        headers: {
          'X-Existing': 'existing-value',
          'X-New-Header': 'new-value',
        },
      })
    })

    it('should override existing headers with same key', () => {
      const headers = { 'X-Header': 'new-value' }
      const link = new HeadersLink({ headers })
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      const result = capturedContextFn!({ headers: { 'X-Header': 'old-value' } })
      expect(result).toEqual({
        headers: {
          'X-Header': 'new-value',
        },
      })
    })

    it('should handle undefined existing headers', () => {
      const headers = { 'X-Header': 'value' }
      const link = new HeadersLink({ headers })
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      const result = capturedContextFn!({})
      expect(result).toEqual({
        headers: {
          'X-Header': 'value',
        },
      })
    })

    it('should call forward with the operation', () => {
      const link = new HeadersLink({ headers: { 'X-Header': 'value' } })
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      expect(mockForward).toHaveBeenCalledWith(mockOperation)
    })

    it('should return the forward observable directly for static headers', () => {
      const link = new HeadersLink({ headers: { 'X-Header': 'value' } })
      const expectedResult = { data: { static: true } }
      mockForward = createMockForward(expectedResult)

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve) => {
        result.subscribe({
          next: (value) => {
            expect(value).toEqual(expectedResult)
          },
          complete: () => {
            resolve()
          },
        })
      })
    })
  })

  describe('dynamic headers (getHeaders)', () => {
    it('should call getHeaders and add returned headers', async () => {
      const getHeaders = vi.fn().mockReturnValue({ 'X-Dynamic': 'dynamic-value' })
      const link = new HeadersLink({ getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve) => {
        result.subscribe({
          complete: () => {
            expect(getHeaders).toHaveBeenCalled()
            const contextResult = capturedContextFn!({ headers: {} })
            expect(contextResult.headers['X-Dynamic']).toBe('dynamic-value')
            resolve()
          },
        })
      })
    })

    it('should add dynamic headers when the context carries none', async () => {
      const getHeaders = vi.fn().mockReturnValue({ 'X-Dynamic': 'dynamic-value' })
      const link = new HeadersLink({ headers: { 'X-Static': 'static-value' }, getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve) => {
        result.subscribe({
          complete: () => {
            const contextResult = capturedContextFn!({})
            expect(contextResult.headers).toEqual({
              'X-Static': 'static-value',
              'X-Dynamic': 'dynamic-value',
            })
            resolve()
          },
        })
      })
    })

    it('should handle async getHeaders', async () => {
      const getHeaders = vi.fn().mockResolvedValue({ 'X-Async': 'async-value' })
      const link = new HeadersLink({ getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve) => {
        result.subscribe({
          complete: () => {
            expect(getHeaders).toHaveBeenCalled()
            const contextResult = capturedContextFn!({ headers: {} })
            expect(contextResult.headers['X-Async']).toBe('async-value')
            resolve()
          },
        })
      })
    })

    it('should merge static and dynamic headers (dynamic takes precedence)', async () => {
      const headers = { 'X-Static': 'static', 'X-Override': 'static-override' }
      const getHeaders = vi
        .fn()
        .mockResolvedValue({ 'X-Dynamic': 'dynamic', 'X-Override': 'dynamic-override' })
      const link = new HeadersLink({ headers, getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve) => {
        result.subscribe({
          complete: () => {
            const contextResult = capturedContextFn!({ headers: { 'X-Existing': 'existing' } })
            expect(contextResult.headers).toEqual({
              'X-Existing': 'existing',
              'X-Static': 'static',
              'X-Dynamic': 'dynamic',
              'X-Override': 'dynamic-override', // dynamic wins
            })
            resolve()
          },
        })
      })
    })

    it('should propagate errors from getHeaders', async () => {
      const error = new Error('Failed to get headers')
      const getHeaders = vi.fn().mockRejectedValue(error)
      const link = new HeadersLink({ getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve, reject) => {
        result.subscribe({
          error: (err) => {
            expect(err).toBe(error)
            resolve()
          },
          complete: () => {
            reject(new Error('Should have errored'))
          },
        })
      })
    })

    it('should forward results from downstream link', async () => {
      const getHeaders = vi.fn().mockResolvedValue({ 'X-Header': 'value' })
      const link = new HeadersLink({ getHeaders })
      const expectedResult = { data: { forwarded: true } }
      mockForward = createMockForward(expectedResult)

      const result = link.request(mockOperation, mockForward)
      const receivedValues: any[] = []

      return new Promise<void>((resolve) => {
        result.subscribe({
          next: (value) => {
            receivedValues.push(value)
          },
          complete: () => {
            expect(receivedValues).toHaveLength(1)
            expect(receivedValues[0]).toEqual(expectedResult)
            resolve()
          },
        })
      })
    })

    it('should propagate errors from downstream link', async () => {
      const getHeaders = vi.fn().mockResolvedValue({ 'X-Header': 'value' })
      const link = new HeadersLink({ getHeaders })
      const downstreamError = new Error('Downstream error')

      mockForward = vi.fn().mockReturnValue(
        new Observable((observer) => {
          observer.error(downstreamError)
        })
      ) as unknown as ApolloLink.ForwardFunction

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve, reject) => {
        result.subscribe({
          error: (err) => {
            expect(err).toBe(downstreamError)
            resolve()
          },
          complete: () => {
            reject(new Error('Should have errored'))
          },
        })
      })
    })

    it('should handle sync getHeaders that throws', async () => {
      const syncError = new Error('Sync getHeaders error')
      const getHeaders = vi.fn().mockImplementation(() => {
        throw syncError
      })
      const link = new HeadersLink({ getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)

      return new Promise<void>((resolve, reject) => {
        result.subscribe({
          error: (err) => {
            expect(err).toBe(syncError)
            resolve()
          },
          complete: () => {
            reject(new Error('Should have errored'))
          },
        })
      })
    })
  })

  describe('cancellation and teardown', () => {
    it('should not forward operation after unsubscribe', async () => {
      let resolveHeaders: (value: Record<string, string>) => void
      const headersPromise = new Promise<Record<string, string>>((resolve) => {
        resolveHeaders = resolve
      })
      const getHeaders = vi.fn().mockReturnValue(headersPromise)
      const link = new HeadersLink({ getHeaders })
      mockForward = vi.fn().mockReturnValue(
        new Observable((observer) => {
          observer.next({ data: { test: true } })
          observer.complete()
        })
      ) as unknown as ApolloLink.ForwardFunction

      const result = link.request(mockOperation, mockForward)

      const subscription = result.subscribe({
        next: () => {},
        error: () => {},
      })

      // Unsubscribe before headers resolve
      subscription.unsubscribe()

      // Now resolve headers
      resolveHeaders!({ 'X-Header': 'value' })

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 10))

      // forward should not have been called
      expect(mockForward).not.toHaveBeenCalled()
    })

    it('should unsubscribe from inner subscription on teardown', async () => {
      const innerUnsubscribe = vi.fn()
      const getHeaders = vi.fn().mockResolvedValue({ 'X-Header': 'value' })
      const link = new HeadersLink({ getHeaders })

      mockForward = vi.fn().mockReturnValue(
        new Observable(() => {
          // Return teardown function
          return innerUnsubscribe
        })
      ) as unknown as ApolloLink.ForwardFunction

      const result = link.request(mockOperation, mockForward)

      const subscription = result.subscribe({
        next: () => {},
      })

      // Wait for headers to resolve and inner subscription to be created
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Now unsubscribe
      subscription.unsubscribe()

      expect(innerUnsubscribe).toHaveBeenCalled()
    })

    it('should not emit after unsubscribe even if inner emits', async () => {
      let innerObserver: any
      const getHeaders = vi.fn().mockResolvedValue({ 'X-Header': 'value' })
      const link = new HeadersLink({ getHeaders })

      mockForward = vi.fn().mockReturnValue(
        new Observable((observer) => {
          innerObserver = observer
        })
      ) as unknown as ApolloLink.ForwardFunction

      const result = link.request(mockOperation, mockForward)
      const nextFn = vi.fn()

      const subscription = result.subscribe({
        next: nextFn,
      })

      // Wait for headers and inner subscription
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Unsubscribe
      subscription.unsubscribe()

      // Try to emit from inner - should be ignored
      innerObserver?.next({ data: { late: true } })

      expect(nextFn).not.toHaveBeenCalled()
    })

    it('should not emit error after unsubscribe', async () => {
      let resolveHeaders: (value: Record<string, string>) => void
      const headersPromise = new Promise<Record<string, string>>((_, reject) => {
        resolveHeaders = () => reject(new Error('late error'))
      })
      const getHeaders = vi.fn().mockReturnValue(headersPromise)
      const link = new HeadersLink({ getHeaders })
      mockForward = createMockForward()

      const result = link.request(mockOperation, mockForward)
      const errorFn = vi.fn()

      const subscription = result.subscribe({
        error: errorFn,
      })

      // Unsubscribe first
      subscription.unsubscribe()

      // Then reject
      resolveHeaders!(null as any) // This triggers the catch

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Error should not have been called
      expect(errorFn).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty options', () => {
      const link = new HeadersLink()
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      const result = capturedContextFn!({ headers: { 'X-Existing': 'value' } })
      expect(result.headers).toEqual({ 'X-Existing': 'value' })
    })

    it('should handle empty headers object', () => {
      const link = new HeadersLink({ headers: {} })
      mockForward = createMockForward()

      link.request(mockOperation, mockForward)

      const result = capturedContextFn!({ headers: { 'X-Existing': 'value' } })
      expect(result.headers).toEqual({ 'X-Existing': 'value' })
    })
  })
})
