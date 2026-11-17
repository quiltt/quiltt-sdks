import { createApp, nextTick, ref } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  searchInstitutionsMock: vi.fn(),
}))

vi.mock('@quiltt/core', async () => {
  const actual = await vi.importActual<typeof import('@quiltt/core')>('@quiltt/core')

  class MockConnectorsAPI {
    searchInstitutions = mocks.searchInstitutionsMock
  }

  return {
    ...actual,
    ConnectorsAPI: MockConnectorsAPI,
  }
})

const sessionRef = ref<{ token?: string } | null>({ token: 'session_token' })

vi.mock('@/composables/useQuilttSession', () => ({
  useQuilttSession: () => ({
    session: sessionRef,
  }),
}))

import { useQuilttInstitutions } from '@/composables/useQuilttInstitutions'

const mountComposable = <T>(factory: () => T) => {
  let result!: T
  const root = document.createElement('div')
  document.body.appendChild(root)

  const app = createApp({
    setup() {
      result = factory()
      return () => null
    },
  })

  app.mount(root)

  return {
    result,
    unmount: () => {
      app.unmount()
      root.remove()
    },
  }
}

describe('useQuilttInstitutions', () => {
  afterEach(() => {
    vi.useRealTimers()
    mocks.searchInstitutionsMock.mockReset()
  })

  it('searches institutions after debounce and updates results', async () => {
    vi.useFakeTimers()

    mocks.searchInstitutionsMock.mockResolvedValue({
      status: 200,
      data: [{ id: 'inst_1', name: 'Demo Bank' }],
    } as any)

    const { result, unmount } = mountComposable(() => useQuilttInstitutions('connector_test'))

    result.setSearchTerm('de')

    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()

    expect(mocks.searchInstitutionsMock).toHaveBeenCalledTimes(1)

    expect(result.searchTerm.value).toBe('de')
    expect(result.isSearching.value).toBe(false)
    expect(result.searchResults.value).toEqual([{ id: 'inst_1', name: 'Demo Bank' }])

    unmount()
  })

  it('resets state for short search terms', () => {
    const { result, unmount } = mountComposable(() => useQuilttInstitutions('connector_test'))

    result.setSearchTerm('a')

    expect(result.searchTerm.value).toBe('')
    expect(result.searchResults.value).toEqual([])
    expect(result.isSearching.value).toBe(false)

    unmount()
  })

  it('handles non-200 and thrown API errors', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()

    mocks.searchInstitutionsMock.mockResolvedValueOnce({
      status: 500,
      data: { message: 'request failed' },
    } as any)

    const { result, unmount } = mountComposable(() =>
      useQuilttInstitutions('connector_test', onError)
    )

    result.setSearchTerm('de')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()

    expect(mocks.searchInstitutionsMock).toHaveBeenCalledTimes(1)

    expect(onError).toHaveBeenCalledWith('request failed')
    expect(result.isSearching.value).toBe(false)

    mocks.searchInstitutionsMock.mockRejectedValueOnce(new Error('network down'))

    result.setSearchTerm('bank')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()

    expect(mocks.searchInstitutionsMock).toHaveBeenCalledTimes(2)

    expect(onError).toHaveBeenCalledWith('network down')
    expect(result.isSearching.value).toBe(false)

    unmount()
  })

  it('does not search while there is no session', async () => {
    vi.useFakeTimers()

    sessionRef.value = null

    const { result, unmount } = mountComposable(() => useQuilttInstitutions('connector_test'))

    result.setSearchTerm('de')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()

    expect(mocks.searchInstitutionsMock).not.toHaveBeenCalled()

    sessionRef.value = { token: 'session_token' }
    unmount()
  })

  it('falls back to a generic message for failures without one', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()

    mocks.searchInstitutionsMock.mockResolvedValueOnce({ status: 500, data: null } as any)

    const { result, unmount } = mountComposable(() =>
      useQuilttInstitutions('connector_test', onError)
    )

    result.setSearchTerm('de')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledWith('Failed to fetch institutions')

    mocks.searchInstitutionsMock.mockRejectedValueOnce({})

    result.setSearchTerm('bank')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledWith('Unknown error occurred while searching institutions')

    unmount()
  })

  it('ignores a response that a newer search superseded', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()

    let resolveFirst: (value: unknown) => void = () => {}
    mocks.searchInstitutionsMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        })
    )

    const { result, unmount } = mountComposable(() =>
      useQuilttInstitutions('connector_test', onError)
    )

    result.setSearchTerm('de')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()

    mocks.searchInstitutionsMock.mockResolvedValueOnce({
      status: 200,
      data: [{ id: 'second' }],
    } as any)

    result.setSearchTerm('bank')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()

    resolveFirst({ status: 200, data: [{ id: 'stale' }] })
    await nextTick()
    await Promise.resolve()

    expect(result.searchResults.value).toEqual([{ id: 'second' }])
    expect(onError).not.toHaveBeenCalled()

    unmount()
  })

  it('ignores a rejection that a newer search superseded', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()

    let rejectFirst: (reason: unknown) => void = () => {}
    mocks.searchInstitutionsMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject
        })
    )

    const { result, unmount } = mountComposable(() =>
      useQuilttInstitutions('connector_test', onError)
    )

    result.setSearchTerm('de')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()

    mocks.searchInstitutionsMock.mockResolvedValueOnce({
      status: 200,
      data: [{ id: 'second' }],
    } as any)

    result.setSearchTerm('bank')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()

    rejectFirst(new Error('late failure'))
    await nextTick()
    await Promise.resolve()

    expect(onError).not.toHaveBeenCalled()
    expect(result.searchResults.value).toEqual([{ id: 'second' }])
    expect(result.isSearching.value).toBe(false)

    unmount()
  })

  it('treats a 200 response with null data as an error, not empty results', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()

    mocks.searchInstitutionsMock.mockResolvedValueOnce({
      status: 200,
      data: null,
    } as any)

    const { result, unmount } = mountComposable(() =>
      useQuilttInstitutions('connector_test', onError)
    )

    result.setSearchTerm('de')
    await vi.advanceTimersByTimeAsync(350)
    await nextTick()
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()

    expect(mocks.searchInstitutionsMock).toHaveBeenCalledTimes(1)

    expect(onError).toHaveBeenCalledWith('Failed to fetch institutions')
    expect(result.searchResults.value).toEqual([])
    expect(result.isSearching.value).toBe(false)

    unmount()
  })
})
