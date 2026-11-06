import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gql } from '@apollo/client/core'

// `BatchHttpLink` resolves its `fetch` when its module loads, so the stub has to be installed before
// the client is imported — hence `vi.hoisted` and the dynamic import below.
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn()
  ;(globalThis as unknown as { fetch: unknown }).fetch = mock

  return mock
})

const { InMemoryCache, QuilttClient } = await import('@/api/graphql/client')
const { createVersionLink } = await import('@/api/graphql/links')

const query = gql`
  query Me {
    me {
      id
    }
  }
`

const otherQuery = gql`
  query Accounts {
    accounts {
      id
    }
  }
`

const createClient = (token: string) =>
  new QuilttClient({
    cache: new InMemoryCache(),
    versionLink: createVersionLink('test'),
    sessionToken: { read: () => token },
  })

const authorizationsOf = (calls: unknown[][]) =>
  calls.map(([, init]) => new Headers((init as RequestInit).headers).get('authorization'))

/**
 * A batch is one HTTP request with one set of headers, so anything that lands in it is answered as
 * whoever that header names. On a server each request renders its own client and its own session,
 * which makes sharing a batcher a cross-request data leak rather than a performance detail.
 */
describe('batch isolation', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    // A batch is answered with one result per operation, in order. Returning a single result makes
    // Apollo treat the response as unparseable and retry, which would inflate every request count.
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body))
      const operations: Array<{ operationName?: string }> = Array.isArray(body) ? body : [body]

      return new Response(
        JSON.stringify(
          operations.map(({ operationName }) => ({
            data: operationName === 'Accounts' ? { accounts: [] } : { me: { id: 'me' } },
          }))
        ),
        { headers: { 'content-type': 'application/json' } }
      )
    })
  })

  it('does not batch operations from clients that authenticate as different sessions', async () => {
    const first = createClient('token-a')
    const second = createClient('token-b')

    await Promise.all([
      first.query({ query, fetchPolicy: 'no-cache' }),
      second.query({ query, fetchPolicy: 'no-cache' }),
    ])

    // One request here would carry one `authorization` header and answer both clients as that user.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authorizationsOf(fetchMock.mock.calls)).toEqual(['Bearer token-a', 'Bearer token-b'])
  })

  it('batches operations that authenticate as the same session', async () => {
    const client = createClient('token-a')

    // Distinct documents: Apollo deduplicates two identical concurrent `no-cache` queries before
    // they reach the link chain, which would show one request whether or not batching works.
    await Promise.all([
      client.query({ query, fetchPolicy: 'no-cache' }),
      client.query({ query: otherQuery, fetchPolicy: 'no-cache' }),
    ])

    // Batching is the point of the link; a fix that just sent everything unbundled would pass the
    // test above, so this one checks the one request actually carries both operations.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(authorizationsOf(fetchMock.mock.calls)).toEqual(['Bearer token-a'])

    const [, init] = fetchMock.mock.calls[0] as [unknown, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.map((entry: { operationName: string }) => entry.operationName)).toEqual([
      'Me',
      'Accounts',
    ])
  })

  it('does not batch operations a single client authenticated with different sessions', async () => {
    const tokens = ['token-a', 'token-b']
    const client = new QuilttClient({
      cache: new InMemoryCache(),
      versionLink: createVersionLink('test'),
      // A sign-in landing between two queries queued in the same batch window.
      sessionToken: { read: () => tokens.shift() ?? 'token-b' },
    })

    // Distinct documents, because Apollo deduplicates two identical concurrent `no-cache` queries
    // before they reach the link chain.
    await Promise.all([
      client.query({ query, fetchPolicy: 'no-cache' }),
      client.query({ query: otherQuery, fetchPolicy: 'no-cache' }),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authorizationsOf(fetchMock.mock.calls)).toEqual(['Bearer token-a', 'Bearer token-b'])
  })
})
