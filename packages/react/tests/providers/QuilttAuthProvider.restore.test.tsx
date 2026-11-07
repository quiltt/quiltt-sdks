import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'

import {
  createVersionLink,
  GlobalStorage,
  gql,
  InMemoryCache,
  QuilttClient,
  SESSION_STORAGE_KEY,
} from '@quiltt/core'

import { QuilttAuthProvider } from '@/providers/QuilttAuthProvider'

/**
 * These run against the real `useSession`, `useStorage`, and `GlobalStorage`, because the behaviour
 * under test is the provider telling a storage restore apart from a session change — a distinction a
 * mocked session cannot exercise.
 */
const createToken = (expOffsetSeconds = 3600) => {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    exp: now + expOffsetSeconds,
    iat: now,
    iss: 'issuer',
    sub: 'subject',
    rol: 'manager' as const,
    nbf: now,
    aud: 'audience',
    jti: 'token-id',
    cid: 'client-id',
    oid: 'org-id',
    eid: 'entity-id',
    aid: 'app-id',
    ver: 1,
  }

  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

const createClient = () =>
  new QuilttClient({
    cache: new InMemoryCache(),
    versionLink: createVersionLink('test'),
  })

const renderProviderWithClient = (client: QuilttClient) =>
  render(
    <QuilttAuthProvider graphqlClient={client}>
      <div>child</div>
    </QuilttAuthProvider>
  )

const renderProvider = () => {
  const client = createClient()
  const resetStore = vi.spyOn(client, 'resetStore')

  renderProviderWithClient(client)

  return resetStore
}

describe('QuilttAuthProvider store reset', () => {
  afterEach(() => {
    GlobalStorage.set(SESSION_STORAGE_KEY, null)
  })

  it('does not reset the store for the session it restores from storage', async () => {
    GlobalStorage.set(SESSION_STORAGE_KEY, createToken())

    const resetStore = renderProvider()
    // Let the layout-function restore and the effects that follow it run.
    await act(async () => {})

    expect(resetStore).not.toHaveBeenCalled()
  })

  it('resets the store when the session is cleared after the restore', async () => {
    GlobalStorage.set(SESSION_STORAGE_KEY, createToken())

    const resetStore = renderProvider()
    await act(async () => {})
    resetStore.mockClear()

    await act(async () => {
      GlobalStorage.set(SESSION_STORAGE_KEY, null)
    })

    expect(resetStore).toHaveBeenCalledTimes(1)
  })

  // A client passed in through `graphqlClient` outlives this provider, so remounting — a route
  // change does exactly that — must not assume the cache belongs to the session storage now holds.
  it("resets the store when a reused client's stored session changed while unmounted", async () => {
    const client = createClient()
    const resetStore = vi.spyOn(client, 'resetStore')

    GlobalStorage.set(SESSION_STORAGE_KEY, createToken())
    const { unmount } = renderProviderWithClient(client)
    await act(async () => {})
    // Nothing was cached for the first session yet, so its restore is still a restore.
    expect(resetStore).not.toHaveBeenCalled()

    unmount()
    // Written while nothing is mounted, so no provider observes it as a session change.
    GlobalStorage.set(SESSION_STORAGE_KEY, createToken(7200))

    renderProviderWithClient(client)
    await act(async () => {})

    expect(resetStore).toHaveBeenCalledTimes(1)
  })

  it('does not reset the store when a reused client is remounted with the same stored session', async () => {
    const client = createClient()
    const resetStore = vi.spyOn(client, 'resetStore')
    const token = createToken()

    GlobalStorage.set(SESSION_STORAGE_KEY, token)
    const { unmount } = renderProviderWithClient(client)
    await act(async () => {})

    unmount()
    GlobalStorage.set(SESSION_STORAGE_KEY, token)

    renderProviderWithClient(client)
    await act(async () => {})

    // The cache belongs to the session being restored, so the remount keeps it.
    expect(resetStore).not.toHaveBeenCalled()
  })

  // A client the app prefilled carries data from the session it was built for. That session ending is
  // a change the provider has to act on, even when it ends before the provider has read a session.
  it('drops a prefilled cache when the saved session expired before the first read', async () => {
    const client = createClient()

    client.cache.writeQuery({
      query: gql`
        query Me {
          me {
            id
          }
        }
      `,
      data: { me: { __typename: 'Me', id: 'prefilled' } },
    })

    // Expired, so `useSession` clears it during the first commit — before `restored` is true.
    GlobalStorage.set(SESSION_STORAGE_KEY, createToken(-10))

    renderProviderWithClient(client)
    await act(async () => {})

    expect(client.cache.extract()).toEqual({})
  })

  // A client attached after the provider mounted was built by the app around the session it has at
  // that point, so its cache belongs to that session — not to whatever storage held when the provider
  // started, which was nothing.
  it('keeps the cache of a client attached after the session was established', async () => {
    const { rerender } = render(<QuilttAuthProvider>{null}</QuilttAuthProvider>)
    await act(async () => {})

    const token = createToken()
    await act(async () => {
      GlobalStorage.set(SESSION_STORAGE_KEY, token)
    })

    const client = createClient()
    const resetStore = vi.spyOn(client, 'resetStore')
    client.cache.writeQuery({
      query: gql`
        query Me {
          me {
            id
          }
        }
      `,
      data: { me: { __typename: 'Me', id: 'prefilled-for-the-current-session' } },
    })

    rerender(<QuilttAuthProvider graphqlClient={client}>{null}</QuilttAuthProvider>)
    await act(async () => {})

    expect(resetStore).not.toHaveBeenCalled()
    expect(client.cache.extract()).not.toEqual({})
  })

  // The assertions above observe `resetStore` itself; this one observes the data it would throw
  // away, so it fails if the reset stops reaching the cache.
  it('drops the cached data of a session a reused client is no longer mounted under', async () => {
    const client = createClient()

    GlobalStorage.set(SESSION_STORAGE_KEY, createToken())
    const { unmount } = renderProviderWithClient(client)
    await act(async () => {})

    client.cache.writeQuery({
      query: gql`
        query Me {
          me {
            id
          }
        }
      `,
      data: { me: { __typename: 'Me', id: 'cached-for-the-previous-session' } },
    })

    unmount()
    GlobalStorage.set(SESSION_STORAGE_KEY, createToken(7200))

    renderProviderWithClient(client)
    await act(async () => {})

    // Serving this to the new session would show one user another user's data.
    expect(client.cache.extract()).toEqual({})
  })

  it('does not reset the store for the session it restores while hydrating under StrictMode', async () => {
    GlobalStorage.set(SESSION_STORAGE_KEY, createToken())

    const client = createClient()
    const resetStore = vi.spyOn(client, 'resetStore')

    const tree = (
      <QuilttAuthProvider graphqlClient={client}>
        <div>child</div>
      </QuilttAuthProvider>
    )

    const container = document.createElement('div')
    container.innerHTML = renderToString(tree)
    document.body.appendChild(container)

    let root: Root
    await act(async () => {
      root = hydrateRoot(container, <StrictMode>{tree}</StrictMode>)
    })
    await act(async () => {})

    // StrictMode runs the mount effect twice. The second run still has the default session, because
    // the stored one is adopted after it, so the effect must keep counting the restore as a restore
    // rather than reading the empty session as a sign-in.
    expect(resetStore).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
