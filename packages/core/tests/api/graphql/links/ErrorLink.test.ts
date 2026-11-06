import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApolloClient, ApolloLink, gql, InMemoryCache } from '@apollo/client/core'
import { Observable } from 'rxjs'

import { createErrorLink, ErrorLink } from '@/api/graphql/links/ErrorLink'
import { GlobalStorage } from '@/storage'

vi.mock('@/storage', () => ({
  GlobalStorage: {
    set: vi.fn(),
    get: vi.fn(),
  },
}))

describe('ErrorLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should log GraphQL errors', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'Field error',
              locations: [{ line: 1, column: 2 }],
              path: ['user', 'name'],
            },
          ],
        })
        observer.complete()
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            user {
              name
            }
          }
        `,
      })
    } catch (_e) {
      // Expected to throw due to GraphQL errors
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Quiltt][GraphQL Error]: Field error | Path: user.name')
    )
    consoleWarnSpy.mockRestore()
  })

  it('should handle 401 network errors and clear session', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const error = Object.assign(new Error('Unauthorized'), {
      statusCode: 401,
      bodyText: 'Unauthorized',
      response: new Response('Unauthorized', { status: 401 }),
    })

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.error(error)
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Quiltt][Authentication Error]:',
      expect.objectContaining({ statusCode: 401 })
    )
    expect(GlobalStorage.set).toHaveBeenCalledWith('session', null)
    consoleWarnSpy.mockRestore()
  })

  it('should clear the supplied session source, not the shared store, on 401', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clear = vi.fn()

    const error = Object.assign(new Error('Unauthorized'), {
      statusCode: 401,
      bodyText: 'Unauthorized',
      response: new Response('Unauthorized', { status: 401 }),
    })

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.error(error)
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: createErrorLink({ read: () => 'request_token', clear }).concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw
    }

    expect(clear).toHaveBeenCalledTimes(1)
    expect(GlobalStorage.set).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  // A `401` answers the token that sent the request. If the session has moved on by the time it
  // lands — a refresh, or a sign-in as someone else — clearing here would sign out the newer session.
  const queryWithToken = async (link: ApolloLink) => {
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw
    }
  }

  const withAuthorization = (token: string) =>
    new ApolloLink((operation, forward) => {
      operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
        headers: { ...headers, authorization: `Bearer ${token}` },
      }))

      return forward(operation)
    })

  const failWith401 = () =>
    new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.error(
            Object.assign(new Error('Unauthorized'), {
              statusCode: 401,
              bodyText: 'Unauthorized',
              response: new Response('Unauthorized', { status: 401 }),
            })
          )
        })
    )

  it('should clear the session the request authenticated with', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clear = vi.fn()

    await queryWithToken(
      withAuthorization('current_token')
        .concat(createErrorLink({ read: () => 'current_token', clear }))
        .concat(failWith401())
    )

    expect(clear).toHaveBeenCalledTimes(1)
    consoleWarnSpy.mockRestore()
  })

  it('should not clear a session the request did not authenticate with', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clear = vi.fn()

    // The request went out with `older_token`; the session holds `newer_token` by the time the
    // response lands, so the rejection says nothing about the session that is now active.
    await queryWithToken(
      withAuthorization('older_token')
        .concat(createErrorLink({ read: () => 'newer_token', clear }))
        .concat(failWith401())
    )

    expect(clear).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('should handle non-401 network errors without clearing session', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const error = Object.assign(new Error('Internal Server Error'), {
      statusCode: 500,
      bodyText: 'Internal Server Error',
      response: new Response('Internal Server Error', { status: 500 }),
    })

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.error(error)
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Quiltt][Server Error]:',
      expect.objectContaining({ statusCode: 500 })
    )
    expect(GlobalStorage.set).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('should handle both GraphQL and network errors together', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const error = Object.assign(new Error('Server Error'), {
      statusCode: 500,
      bodyText: 'Server Error',
      response: new Response('Server Error', { status: 500 }),
    })

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'Query error',
              locations: [{ line: 1, column: 1 }],
              path: ['data'],
            },
          ],
        })
        observer.error(error)
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Quiltt][GraphQL Error]: Query error | Path: data')
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Quiltt][Server Error]:', expect.any(Object))
    consoleWarnSpy.mockRestore()
  })

  it('should handle network errors without statusCode', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.error(new Error('Connection refused'))
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith('[Quiltt][Network Error]:', expect.any(Error))
    expect(GlobalStorage.set).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('should handle GraphQL errors without path', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'General error without path',
              locations: [{ line: 1, column: 1 }],
              // path is undefined
            },
          ],
        })
        observer.complete()
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw due to GraphQL errors
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Quiltt][GraphQL Error]: General error without path | Path: N/A')
    )
    consoleWarnSpy.mockRestore()
  })

  it('should handle GraphQL errors with extensions.code', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'Validation error',
              locations: [{ line: 1, column: 1 }],
              path: ['input'],
              extensions: {
                code: 'BAD_USER_INPUT',
              },
            },
          ],
        })
        observer.complete()
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw due to GraphQL errors
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Quiltt][GraphQL Error]: Validation error | Path: input | Code: BAD_USER_INPUT'
      )
    )
    consoleWarnSpy.mockRestore()
  })

  it('should handle GraphQL errors with extensions.errorId', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'Internal error',
              locations: [{ line: 1, column: 1 }],
              path: ['query'],
              extensions: {
                errorId: 'error-12345',
              },
            },
          ],
        })
        observer.complete()
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw due to GraphQL errors
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Quiltt][GraphQL Error]: Internal error | Path: query | Error ID: error-12345'
      )
    )
    consoleWarnSpy.mockRestore()
  })

  it('should handle GraphQL errors with extensions.instruction and documentationUrl', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'Auth error',
              locations: [{ line: 1, column: 1 }],
              path: ['session'],
              extensions: {
                instruction: 'Re-authenticate the user',
                documentationUrl: 'https://www.quiltt.dev/authentication#session-tokens',
              },
            },
          ],
        })
        observer.complete()
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw due to GraphQL errors
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Quiltt][GraphQL Error]: Auth error | Path: session | Instruction: Re-authenticate the user | Docs: https://www.quiltt.dev/authentication#session-tokens'
      )
    )
    consoleWarnSpy.mockRestore()
  })

  it('should handle GraphQL errors with both extensions.code and extensions.errorId', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mockLink = new ApolloLink(() => {
      return new Observable((observer) => {
        observer.next({
          errors: [
            {
              message: 'Complex error',
              locations: [{ line: 1, column: 1 }],
              path: ['mutation'],
              extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                errorId: 'error-67890',
              },
            },
          ],
        })
        observer.complete()
      })
    })

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ErrorLink.concat(mockLink),
    })

    try {
      await client.query({
        query: gql`
          query Test {
            data
          }
        `,
      })
    } catch (_e) {
      // Expected to throw due to GraphQL errors
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Quiltt][GraphQL Error]: Complex error | Path: mutation | Code: INTERNAL_SERVER_ERROR | Error ID: error-67890'
      )
    )
    consoleWarnSpy.mockRestore()
  })
})
