import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type ApolloLink, gql } from '@apollo/client/core'
import { createConsumer } from '@rails/actioncable'
import { Observable } from 'rxjs'

import { ActionCableLink } from '@/api/graphql/links/ActionCableLink'
import { GlobalStorage } from '@/storage'

vi.mock('@/storage', () => ({
  GlobalStorage: {
    get: vi.fn(() => null as string | null),
    set: vi.fn(),
  },
}))

vi.mock('@/auth/json-web-token', () => ({
  JsonWebTokenParse: vi.fn(),
}))

vi.mock('@rails/actioncable', () => ({
  createConsumer: vi.fn(),
}))

vi.mock('graphql', () => {
  // Create a custom GraphQLError class for testing
  class MockGraphQLError extends Error {
    extensions?: Record<string, any>
    constructor(message: string, options?: { extensions?: Record<string, any> }) {
      super(message)
      this.name = 'GraphQLError'
      if (options?.extensions) {
        this.extensions = options.extensions
      }
    }
  }

  return {
    GraphQLError: MockGraphQLError,
    print: vi.fn().mockReturnValue('printed query'),
  }
})

describe('ActionCableLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(GlobalStorage.get).mockReturnValue('some_token')
  })

  it('should emit GraphQLError if no token is available', async () => {
    vi.mocked(GlobalStorage.get).mockReturnValue(null)
    const link = new ActionCableLink({})
    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })
    const mockQuery = gql`
      {
        mockField
      }
    `
    const operation = { query: mockQuery } as ApolloLink.Operation
    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve, reject) => {
      observable.subscribe({
        error: (error) => {
          try {
            expect(error.name).toBe('GraphQLError')
            expect(error.message).toBe('No session token available for subscription')
            expect(error.extensions?.code).toBe('UNAUTHENTICATED')
            expect(error.extensions?.reason).toBe('NO_TOKEN')
            expect(GlobalStorage.get).toHaveBeenCalledWith('session')
            resolve()
          } catch (e) {
            reject(e)
          }
        },
      })
    })
  })

  it('should authenticate the socket with the supplied session source, not the shared store', () => {
    vi.mocked(GlobalStorage.get).mockReturnValue('shared_token')
    vi.mocked(createConsumer).mockReturnValue({
      subscriptions: { create: vi.fn() },
    } as any)

    const link = new ActionCableLink({ session: { read: () => 'request_token' } })
    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })
    const mockQuery = gql`
      {
        mockField
      }
    `

    link.request({ query: mockQuery } as ApolloLink.Operation, dummyNextLink)

    expect(createConsumer).toHaveBeenCalledWith(expect.stringContaining('token=request_token'))
    expect(GlobalStorage.get).not.toHaveBeenCalled()
  })

  it('should report no token when the supplied session source is empty', async () => {
    vi.mocked(GlobalStorage.get).mockReturnValue('shared_token')

    const link = new ActionCableLink({ session: { read: () => null } })
    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })
    const mockQuery = gql`
      {
        mockField
      }
    `

    const observable = link.request({ query: mockQuery } as ApolloLink.Operation, dummyNextLink)

    await new Promise<void>((resolve, reject) => {
      observable.subscribe({
        error: (error) => {
          try {
            expect(error.extensions?.reason).toBe('NO_TOKEN')
            expect(createConsumer).not.toHaveBeenCalled()
            resolve()
          } catch (e) {
            reject(e)
          }
        },
      })
    })
  })

  it('should create a consumer and subscription when a token is present', () => {
    const link = new ActionCableLink({})
    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })
    const mockQuery = gql`
      {
        mockField
      }
    `
    const operation = { query: mockQuery } as ApolloLink.Operation
    const result = link.request(operation, dummyNextLink)

    expect(result).toBeInstanceOf(Observable)
    expect(GlobalStorage.get).toHaveBeenCalledWith('session')
  })

  it('should manage subscriptions correctly', async () => {
    const subscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const consumer = {
      subscriptions: {
        create: vi.fn(() => subscription),
      },
      disconnect: vi.fn(),
    }

    vi.mocked(createConsumer).mockReturnValue(consumer as any)

    const createdConsumer = createConsumer('ws://example.com')

    const createdSubscription = createdConsumer.subscriptions.create('TestChannel', {})

    createdSubscription.perform('action', { data: 'test' })

    expect(createdConsumer.subscriptions.create).toHaveBeenCalledWith('TestChannel', {})
    expect(createdSubscription.perform).toHaveBeenCalledWith('action', { data: 'test' })

    createdSubscription.unsubscribe()

    expect(createdSubscription.unsubscribe).toHaveBeenCalled()

    createdConsumer.disconnect()
    expect(createdConsumer.disconnect).toHaveBeenCalled()
  })

  it('should execute Observable callback and create ActionCable subscription when subscribed', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: { test: 'value' },
      operationName: 'TestQuery',
      extensions: {},
      setContext: () => {},
      getContext: () => ({}),
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    expect(observable).toBeInstanceOf(Observable)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(mockConsumer.subscriptions.create).toHaveBeenCalled()
          resolve()
        },
      })
    })
  })

  it('should handle connectionParams as a function', async () => {
    const connectionParamsFn = vi.fn((op: ApolloLink.Operation) => ({
      customParam: op.operationName,
    }))

    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      connectionParams: connectionParamsFn,
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(connectionParamsFn).toHaveBeenCalledWith(operation)
          resolve()
        },
      })
    })
  })

  it('should call channel.perform when connected callback is triggered', async () => {
    const mockPerform = vi.fn()
    const mockSubscription = {
      perform: mockPerform,
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.connected()
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: { var1: 'test' },
      operationName: 'TestQuery',
      extensions: {},
      setContext: () => {},
      getContext: () => ({}),
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(mockPerform).toHaveBeenCalledWith('execute', {
            query: 'printed query',
            variables: { var1: 'test' },
            operationId: undefined,
            operationName: 'TestQuery',
          })
          resolve()
        },
      })
    })
  })

  it('should handle received callback with data', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: { test: 'value' } }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        next: (result) => {
          expect(result).toEqual({ data: { test: 'value' } })
        },
        complete: () => {
          resolve()
        },
      })
    })
  })

  it('should handle received callback with errors', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({
              result: { errors: [{ message: 'Error occurred' }] },
              more: false,
            })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        next: (result) => {
          expect(result).toEqual({ errors: [{ message: 'Error occurred' }] })
        },
        complete: () => {
          resolve()
        },
      })
    })
  })

  it('should continue receiving when more: true', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    let callCount = 0
    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: { part1: 'data' } }, more: true })
            setTimeout(() => {
              handlers.received({ result: { data: { part2: 'data' } }, more: false })
            }, 10)
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        next: () => {
          callCount++
        },
        complete: () => {
          expect(callCount).toBe(2)
          resolve()
        },
      })
    })
  })

  it('should handle operation with null query', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.connected()
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const operation = {
      query: null,
      variables: {},
      operationName: 'TestQuery',
      extensions: {},
      setContext: () => {},
      getContext: () => ({}),
    } as any

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(mockSubscription.perform).toHaveBeenCalledWith('execute', {
            query: null,
            variables: {},
            operationId: undefined,
            operationName: 'TestQuery',
          })
          resolve()
        },
      })
    })
  })

  it('should handle operation with operationId for persisted queries', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.connected()
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
      operationId: 'abc123',
      extensions: {},
      setContext: () => {},
      getContext: () => ({}),
    } as any

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(mockSubscription.perform).toHaveBeenCalledWith('execute', {
            query: 'printed query',
            variables: {},
            operationId: 'abc123',
            operationName: 'TestQuery',
          })
          resolve()
        },
      })
    })
  })

  it('should skip observer.next when payload has no data or errors', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const nextSpy = vi.fn()

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: {}, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
      extensions: {},
      setContext: () => {},
      getContext: () => ({}),
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        next: nextSpy,
        complete: () => {
          expect(nextSpy).not.toHaveBeenCalled()
          resolve()
        },
      })
    })
  })

  it('should use custom channelName and actionName when provided', async () => {
    const mockPerform = vi.fn()
    const mockSubscription = {
      perform: mockPerform,
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((config, handlers) => {
          expect(config.channel).toBe('CustomChannel')
          setTimeout(() => {
            handlers.connected()
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      channelName: 'CustomChannel',
      actionName: 'customAction',
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
      extensions: {},
      setContext: () => {},
      getContext: () => ({}),
    } as unknown as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(mockPerform).toHaveBeenCalledWith('customAction', expect.any(Object))
          resolve()
        },
      })
    })
  })

  it('should invoke custom connected callback when connection is established', async () => {
    const connectedCallback = vi.fn()
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.connected({ reconnected: false })
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      callbacks: {
        connected: connectedCallback,
      },
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(connectedCallback).toHaveBeenCalledWith({ reconnected: false })
          resolve()
        },
      })
    })
  })

  it('should invoke custom disconnected callback when connection is lost', async () => {
    const disconnectedCallback = vi.fn()
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.disconnected()
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      callbacks: {
        disconnected: disconnectedCallback,
      },
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(disconnectedCallback).toHaveBeenCalled()
          resolve()
        },
      })
    })
  })

  it('should invoke custom received callback when data is received', async () => {
    const receivedCallback = vi.fn()
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            const payload = { result: { data: { test: 'value' } }, more: false }
            handlers.received(payload)
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      callbacks: {
        received: receivedCallback,
      },
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        next: () => {},
        complete: () => {
          setTimeout(() => {
            expect(receivedCallback).toHaveBeenCalledWith({
              result: { data: { test: 'value' } },
              more: false,
            })
            resolve()
          }, 10)
        },
      })
    })
  })

  it('should reuse existing consumer for the same token', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    // First subscription
    const observable1 = link.request(operation, dummyNextLink)
    await new Promise<void>((resolve) => {
      observable1?.subscribe({
        complete: () => {
          resolve()
        },
      })
    })

    // Second subscription with same token
    const observable2 = link.request(operation, dummyNextLink)
    await new Promise<void>((resolve) => {
      observable2?.subscribe({
        complete: () => {
          resolve()
        },
      })
    })

    // createConsumer should only be called once
    expect(createConsumer).toHaveBeenCalledTimes(1)
  })

  it('should create different consumers for different tokens', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    // First subscription with token1
    vi.mocked(GlobalStorage.get).mockReturnValue('token1')
    const observable1 = link.request(operation, dummyNextLink)
    await new Promise<void>((resolve) => {
      observable1?.subscribe({
        complete: () => {
          resolve()
        },
      })
    })

    // Second subscription with token2
    vi.mocked(GlobalStorage.get).mockReturnValue('token2')
    const observable2 = link.request(operation, dummyNextLink)
    await new Promise<void>((resolve) => {
      observable2?.subscribe({
        complete: () => {
          resolve()
        },
      })
    })

    // createConsumer should be called twice for different tokens
    expect(createConsumer).toHaveBeenCalledTimes(2)
  })

  it('should handle connectionParams as a static object', async () => {
    const staticParams = { apiKey: 'test-key', version: '1.0' }
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((config, handlers) => {
          expect(config).toMatchObject(staticParams)
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      connectionParams: staticParams,
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(mockConsumer.subscriptions.create).toHaveBeenCalledWith(
            expect.objectContaining(staticParams),
            expect.any(Object)
          )
          resolve()
        },
      })
    })
  })

  it('should return observable that wraps ActionCable channel with closed property', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
      closed: false,
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          // Trigger received to complete the test
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)
    expect(observable).toBeInstanceOf(Observable)

    // Subscribe to trigger the channel creation
    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          // Verify the mock subscription was created and has closed: false
          expect(mockConsumer.subscriptions.create).toHaveBeenCalled()
          const createdChannel = mockConsumer.subscriptions.create.mock.results[0].value
          expect(createdChannel).toHaveProperty('closed', false)
          resolve()
        },
      })
    })
  })

  it('should construct websocket URL with token parameter', async () => {
    const token = 'test-token-123'
    vi.mocked(GlobalStorage.get).mockReturnValue(token)

    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(createConsumer).toHaveBeenCalledWith(expect.stringContaining(`?token=${token}`))
          resolve()
        },
      })
    })
  })

  it('should invoke all custom callbacks when provided together', async () => {
    const connectedCallback = vi.fn()
    const disconnectedCallback = vi.fn()
    const receivedCallback = vi.fn()

    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.connected({ reconnected: true })
            const payload = { result: { data: { test: 'data' } }, more: false }
            handlers.received(payload)
            handlers.disconnected()
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      callbacks: {
        connected: connectedCallback,
        disconnected: disconnectedCallback,
        received: receivedCallback,
      },
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        next: () => {},
        complete: () => {
          setTimeout(() => {
            expect(connectedCallback).toHaveBeenCalledWith({ reconnected: true })
            expect(receivedCallback).toHaveBeenCalledWith({
              result: { data: { test: 'data' } },
              more: false,
            })
            expect(disconnectedCallback).toHaveBeenCalled()
            resolve()
          }, 10)
        },
      })
    })
  })

  it('should include channelId in subscription config', async () => {
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((config, handlers) => {
          expect(config).toHaveProperty('channelId')
          expect(typeof config.channelId).toBe('string')
          setTimeout(() => {
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          resolve()
        },
      })
    })
  })

  it('should handle connected callback without arguments', async () => {
    const connectedCallback = vi.fn()
    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn((_config, handlers) => {
          setTimeout(() => {
            handlers.connected()
            handlers.received({ result: { data: {} }, more: false })
          }, 0)
          return mockSubscription
        }),
      },
    }

    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({
      callbacks: {
        connected: connectedCallback,
      },
    })

    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve) => {
      observable?.subscribe({
        complete: () => {
          expect(connectedCallback).toHaveBeenCalledWith(undefined)
          resolve()
        },
      })
    })
  })

  it('should emit GraphQLError when attempting subscription without token', async () => {
    vi.mocked(GlobalStorage.get).mockReturnValue(null)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      query TestQuery {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestQuery',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve, reject) => {
      observable.subscribe({
        error: (error) => {
          try {
            expect(error.name).toBe('GraphQLError')
            expect(error.message).toBe('No session token available for subscription')
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

  it('should emit GraphQLError and clear storage when token is expired', async () => {
    const { JsonWebTokenParse } = await import('@/auth/json-web-token')
    const mockToken = 'expired.token.here'
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago

    vi.mocked(GlobalStorage.get).mockReturnValue(mockToken)
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

    const link = new ActionCableLink({})
    const mockQuery = gql`
      subscription TestSubscription {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestSubscription',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    await new Promise<void>((resolve, reject) => {
      observable.subscribe({
        error: (error) => {
          try {
            expect(error.name).toBe('GraphQLError')
            expect(error.message).toBe('Session token has expired')
            expect(error.extensions?.code).toBe('UNAUTHENTICATED')
            expect(error.extensions?.reason).toBe('TOKEN_EXPIRED')
            expect(error.extensions?.expiredAt).toBe(expiredTimestamp)
            expect(GlobalStorage.set).toHaveBeenCalledWith('session', null)
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

    vi.mocked(GlobalStorage.get).mockReturnValue(mockToken)
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

    const mockSubscription = {
      perform: vi.fn(),
      unsubscribe: vi.fn(),
    }

    const mockConsumer = {
      subscriptions: {
        create: vi.fn(() => mockSubscription),
      },
    }

    const { createConsumer } = await import('@rails/actioncable')
    vi.mocked(createConsumer).mockReturnValue(mockConsumer as any)

    const link = new ActionCableLink({})
    const mockQuery = gql`
      subscription TestSubscription {
        mockField
      }
    `
    const operation = {
      query: mockQuery,
      variables: {},
      operationName: 'TestSubscription',
    } as ApolloLink.Operation

    const dummyNextLink = (_operation: ApolloLink.Operation) =>
      new Observable<ApolloLink.Result>((subscriber) => {
        subscriber.next({})
        subscriber.complete()
      })

    const observable = link.request(operation, dummyNextLink)

    expect(observable).toBeInstanceOf(Observable)
    expect(GlobalStorage.set).not.toHaveBeenCalled()
    expect(createConsumer).toHaveBeenCalled()
  })
})
