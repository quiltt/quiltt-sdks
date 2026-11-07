import { createApp, inject, nextTick } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pingMock: vi.fn() }))

// `@quiltt/core` takes the `fetch` it finds on the global when its HTTP links load, so a request has
// to be replaced before that happens — during import — not inside a test.
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn()
  ;(globalThis as unknown as { fetch: unknown }).fetch = mock
  return mock
})

// A server render has no browser, and that is the only difference this file needs: `install()` runs
// once per request, while `GlobalStorage` stays the process-wide singleton it is in production.
vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils')

  return { ...actual, isBrowser: () => false }
})

vi.mock('@quiltt/core', async () => {
  const actual = await vi.importActual<typeof import('@quiltt/core')>('@quiltt/core')

  class MockAuthAPI {
    ping = mocks.pingMock
  }

  return { ...actual, AuthAPI: MockAuthAPI }
})

import { GlobalStorage, gql, type QuilttClient, type SessionController } from '@quiltt/core'
import { DefaultApolloClient } from '@vue/apollo-composable'

import type { UseQuilttSessionReturn } from '@/composables/useQuilttSession'
import { useQuilttSession } from '@/composables/useQuilttSession'
import { QuilttSessionControllerKey } from '@/plugin/keys'
import { QuilttPlugin } from '@/plugin/QuilttPlugin'

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

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${header}.${body}.signature`
}

/** One server request: its own app, its own plugin install, its own session. */
const mountRequest = () => {
  let session!: UseQuilttSessionReturn
  let client!: QuilttClient
  let controller!: SessionController
  const root = document.createElement('div')
  document.body.appendChild(root)

  const app = createApp({
    setup() {
      session = useQuilttSession()
      client = inject(DefaultApolloClient) as QuilttClient
      controller = inject(QuilttSessionControllerKey) as SessionController
      return () => null
    },
  })
  app.use(QuilttPlugin, { clientId: 'cid_test' })
  app.mount(root)

  return {
    client,
    controller,
    session,
    unmount: () => {
      app.unmount()
      root.remove()
    },
  }
}

describe('QuilttPlugin on a server', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("does not let one request's import adopt over another's", async () => {
    const pings: Array<(value: unknown) => void> = []
    mocks.pingMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          pings.push(resolve)
        })
    )

    const requestA = mountRequest()
    const requestB = mountRequest()

    const tokenA = createToken()
    const tokenB = createToken(7200)

    const importA = requestA.session.importSession(tokenA)
    const importB = requestB.session.importSession(tokenB)
    await nextTick()

    // Both requests are waiting on their own token check; the first to finish must not change the
    // session the other one is about to adopt.
    pings[0]({ status: 200, data: {} })
    pings[1]({ status: 200, data: {} })

    expect(await importA).toBe(true)
    expect(await importB).toBe(true)
    expect(requestA.session.session.value?.token).toBe(tokenA)
    expect(requestB.session.session.value?.token).toBe(tokenB)

    requestA.unmount()
    requestB.unmount()
  })

  it("does not let one request's sign-out cancel another's import", async () => {
    const pings: Array<(value: unknown) => void> = []
    mocks.pingMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          pings.push(resolve)
        })
    )

    const requestA = mountRequest()
    const requestB = mountRequest()
    const token = createToken()

    const imported = requestB.session.importSession(token)
    await nextTick()

    // Another request signs out while this one is waiting. Clearing an already-empty session leaves
    // no trace in a request's own state, so nothing about request B's session changed.
    requestA.session.forgetSession()

    pings[0]({ status: 200, data: {} })

    expect(await imported).toBe(true)
    expect(requestB.session.session.value?.token).toBe(token)

    requestA.unmount()
    requestB.unmount()
  })

  it('does not adopt a token signed out while its ping was in flight', async () => {
    const pings: Array<(value: unknown) => void> = []
    mocks.pingMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          pings.push(resolve)
        })
    )

    const request = mountRequest()
    const token = createToken()

    const imported = request.session.importSession(token)
    await nextTick()

    // The app signs out through its own setter while the check is still outstanding. A server keeps
    // that in the request's own state, so the clear has to be seen there.
    request.session.forgetSession()

    pings[0]({ status: 200, data: {} })

    expect(await imported).toBe(false)
    expect(request.session.session.value).toBeFalsy()

    request.unmount()
  })

  it("guards the request's own session, not the shared store", async () => {
    mocks.pingMock.mockResolvedValue({ status: 200, data: {} })

    // A session another request left in the process-wide store, in place before this one renders.
    const otherRequestToken = createToken()
    GlobalStorage.set('session', otherRequestToken)

    const request = mountRequest()
    const token = createToken(7200)

    // The request does not render that session.
    expect(request.session.session.value).toBeFalsy()

    // A controller that read the store would snapshot that other token, then read it back after
    // writing this request's session, and report the adoption as failed.
    expect(await request.session.importSession(token)).toBe(true)

    expect(request.controller.snapshot().token).toBe(token)
    // And it left the other request's session untouched, rather than writing this one over it.
    expect(GlobalStorage.get('session')).toBe(otherRequestToken)

    GlobalStorage.set('session', null)
    request.unmount()
  })

  it('keeps its session out of the shared store', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200, data: {} })

    const request = mountRequest()
    const token = createToken()

    expect(await request.session.importSession(token)).toBe(true)
    expect(request.session.session.value?.token).toBe(token)

    // The request renders this session; no other request may find it waiting in the store.
    expect(GlobalStorage.get('session')).toBeFalsy()

    request.unmount()
  })

  it('authenticates the requests it renders with its own session', async () => {
    mocks.pingMock.mockResolvedValue({ status: 200, data: {} })

    const requests: RequestInit[] = []
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      requests.push(init)

      return new Response(JSON.stringify({ data: { me: { id: 'me' } } }), {
        headers: { 'content-type': 'application/json' },
      })
    })

    const request = mountRequest()
    const token = createToken()

    expect(await request.session.importSession(token)).toBe(true)

    // A query rendered by this request goes out while it is rendering, using the session this request
    // imported — not the shared store, which holds nothing for it.
    const result = await request.client.query({
      query: gql`
        query Me {
          me {
            id
          }
        }
      `,
      fetchPolicy: 'no-cache',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual({ me: { id: 'me' } })
    expect(new Headers(requests[0]?.headers).get('authorization')).toContain(token)

    request.unmount()
  })
})
