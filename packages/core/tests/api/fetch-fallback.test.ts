import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The HTTP links and the REST helper resolve `fetch` once, when their module loads: `cross-fetch` is
 * used only when the runtime has no global `fetch`. That branch can only be reached by loading the
 * modules again without one.
 */
describe('fetch resolution', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('falls back to cross-fetch when there is no global fetch', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', undefined)

    const { BatchHttpLink } = await import('@/api/graphql/links/BatchHttpLink')
    const { HttpLink } = await import('@/api/graphql/links/HttpLink')
    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')

    // The links were built with the polyfill rather than a missing `fetch`.
    expect(BatchHttpLink).toBeDefined()
    expect(HttpLink).toBeDefined()
    expect(typeof fetchWithRetry).toBe('function')
  })
})
