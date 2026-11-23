import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ApolloLink } from '@apollo/client/core'
import { gql } from '@apollo/client/core'

// `@quiltt/core` imports `cross-fetch` as its transport when the runtime has no global `fetch`.
// Mocking it is the only way to observe whether that fallback is actually wired up.
const crossFetchMock = vi.hoisted(() => vi.fn())

vi.mock('cross-fetch', () => ({ default: crossFetchMock }))

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

// Apollo's `HttpLink` wraps a `ClientAwarenessLink`, which reads `client.queryManager` and
// `operation.getContext()` while building the request. A stub operation is enough to let the
// request reach the transport.
const stubOperation = () => {
  const client = { queryManager: { clientOptions: {} } }

  return {
    query: gql`query { __typename }`,
    variables: {},
    operationName: 'FetchFallback',
    operationType: 'query',
    extensions: {},
    client,
    getContext: () => ({ client }),
    setContext: () => {},
  } as unknown as ApolloLink.Operation
}

const send = (link: ApolloLink) =>
  new Promise((resolve, reject) => {
    link
      .request(
        stubOperation(),
        // These links terminate the chain, but Apollo's signature still requires the argument.
        undefined as unknown as ApolloLink.ForwardFunction
      )
      ?.subscribe({ next: resolve, error: reject })
  })

/**
 * The HTTP links and the REST helper resolve `fetch` once, when their module loads: cross-fetch is
 * used only when the runtime has no global fetch. That branch can only be reached by loading the
 * modules again without one.
 */
describe('fetch resolution', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    crossFetchMock.mockReset()
  })

  it('falls back to cross-fetch when there is no global fetch', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', undefined)

    const { HttpLink } = await import('@/api/graphql/links/HttpLink')
    const { createBatchHttpLink } = await import('@/api/graphql/links/BatchHttpLink')
    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')

    // A module that merely loaded proves nothing about the transport, so make each caller send a
    // request and check that the polyfill is what carried it.
    crossFetchMock.mockResolvedValue(jsonResponse({ data: { __typename: 'Query' } }))
    await send(HttpLink)
    expect(crossFetchMock).toHaveBeenCalledTimes(1)

    crossFetchMock.mockClear()
    crossFetchMock.mockResolvedValue(jsonResponse([{ data: { __typename: 'Query' } }]))
    await send(createBatchHttpLink())
    expect(crossFetchMock).toHaveBeenCalledTimes(1)

    crossFetchMock.mockClear()
    crossFetchMock.mockResolvedValue(jsonResponse({ data: { __typename: 'Query' } }))
    await fetchWithRetry('https://api.example.com/v1', { method: 'POST' })
    expect(crossFetchMock).toHaveBeenCalledTimes(1)
  })
})
