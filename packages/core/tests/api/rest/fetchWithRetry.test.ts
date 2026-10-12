import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockResponse = {
  status: number
  statusText: string
  headers: Headers
  json: () => Promise<unknown>
}

const createResponse = ({
  status,
  statusText = 'OK',
  data,
  shouldRejectJson = false,
}: {
  status: number
  statusText?: string
  data?: unknown
  shouldRejectJson?: boolean
}): MockResponse => ({
  status,
  statusText,
  headers: new Headers(),
  json: () =>
    shouldRejectJson ? Promise.reject(new Error('Invalid JSON')) : Promise.resolve(data),
})

describe('fetchWithRetry', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns parsed JSON for successful responses', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: 200, data: { hello: 'world' } }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const response = await fetchWithRetry<{ hello: string }>('/test', { method: 'GET' })

    expect(fetchMock).toHaveBeenCalledWith('/test', { method: 'GET' })
    expect(response).toMatchObject({
      data: { hello: 'world' },
      status: 200,
      statusText: 'OK',
      ok: true,
    })
  })

  it('returns null data when JSON parsing fails', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: 204, shouldRejectJson: true }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const response = await fetchWithRetry('/test')

    expect(response.data).toBeNull()
    expect(response.ok).toBe(true)
  })

  it('uses custom validateStatus for non-2xx responses', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse({ status: 404, statusText: 'Not Found', data: null })
    )

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const response = await fetchWithRetry('/test', {
      validateStatus: (status) => status < 500,
    })

    expect(response.status).toBe(404)
    expect(response.ok).toBe(true)
  })

  it('rejects non-retryable statuses when retry is disabled', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: 400, statusText: 'Bad Request' }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')

    await expect(fetchWithRetry('/test', { retry: false })).rejects.toThrow(
      'HTTP error with status 400'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry non-retryable statuses even when retry is enabled', async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: 400, statusText: 'Bad Request' }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')

    await expect(fetchWithRetry('/test', { retry: true, retriesRemaining: 3 })).rejects.toThrow(
      'HTTP error with status 400'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries 429 responses when retry is enabled', async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse({ status: 429, statusText: 'Too Many Requests' }))
      .mockResolvedValueOnce(createResponse({ status: 200, data: { success: true } }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const promise = fetchWithRetry<{ success: boolean }>('/test', {
      retry: true,
      retriesRemaining: 1,
    })

    await vi.runAllTimersAsync()
    await expect(promise).resolves.toMatchObject({
      status: 200,
      ok: true,
      data: { success: true },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('caps 429 retries independently of the general retry budget', async () => {
    fetchMock.mockResolvedValue(createResponse({ status: 429, statusText: 'Too Many Requests' }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const promise = fetchWithRetry('/test', { retry: true })
    const rejection = expect(promise).rejects.toThrow('HTTP error with status 429')

    await vi.runAllTimersAsync()
    await rejection
    // One initial attempt plus MAX_429_RETRIES (1), not the general RETRIES (10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not apply the 429 cap to server errors', async () => {
    fetchMock.mockResolvedValue(createResponse({ status: 503, statusText: 'Service Unavailable' }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const promise = fetchWithRetry('/test', { retry: true, retriesRemaining: 2 })
    const rejection = expect(promise).rejects.toThrow('HTTP error with status 503')

    await vi.runAllTimersAsync()
    await rejection
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries network errors and rejects after retries are exhausted', async () => {
    const networkError = new Error('Network down')
    fetchMock.mockRejectedValue(networkError)

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const promise = fetchWithRetry('/test', { retry: true, retriesRemaining: 1 })
    const rejection = expect(promise).rejects.toThrow('Network down')

    await vi.runAllTimersAsync()
    await rejection
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('uses exponential backoff delays (capped) between retries', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    fetchMock
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce(createResponse({ status: 200, data: { ok: true } }))

    const { fetchWithRetry } = await import('@/api/rest/fetchWithRetry')
    const promise = fetchWithRetry('/test', { retry: true, retriesRemaining: 2 })

    await vi.runAllTimersAsync()
    await expect(promise).resolves.toMatchObject({
      status: 200,
      ok: true,
      data: { ok: true },
    })

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1])
    expect(delays).toEqual([150, 300])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
