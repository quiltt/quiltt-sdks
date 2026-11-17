import { createApp, ref } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkResolvableMock: vi.fn(),
}))

vi.mock('@quiltt/core', async () => {
  const actual = await vi.importActual<typeof import('@quiltt/core')>('@quiltt/core')

  class MockConnectorsAPI {
    checkResolvable = mocks.checkResolvableMock
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

import { useQuilttResolvable } from '@/composables/useQuilttResolvable'

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

describe('useQuilttResolvable', () => {
  afterEach(() => {
    mocks.checkResolvableMock.mockReset()
  })

  it('checks resolvability and updates state', async () => {
    mocks.checkResolvableMock.mockResolvedValue({
      status: 200,
      data: { resolvable: true },
    } as any)

    const { result, unmount } = mountComposable(() => useQuilttResolvable('connector_test'))

    const response = await result.checkResolvable({ plaid: 'plaid_provider_id' })

    expect(response).toBe(true)
    expect(result.isLoading.value).toBe(false)
    expect(result.isResolvable.value).toBe(true)
    expect(result.error.value).toBeNull()

    unmount()
  })

  it('returns null with guard errors before API call', async () => {
    const onError = vi.fn()

    sessionRef.value = null
    const { result, unmount } = mountComposable(() =>
      useQuilttResolvable('connector_test', onError)
    )

    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(onError).toHaveBeenCalledWith('Missing session token')

    sessionRef.value = { token: 'session_token' }
    expect(await result.checkResolvable({})).toBeNull()
    expect(onError).toHaveBeenCalledWith('No provider ID specified')

    unmount()
  })

  it('returns null when the connector ID is missing', async () => {
    const onError = vi.fn()
    const { result, unmount } = mountComposable(() => useQuilttResolvable('', onError))

    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(onError).toHaveBeenCalledWith('Missing connector ID')
    expect(mocks.checkResolvableMock).not.toHaveBeenCalled()

    unmount()
  })

  it('reports null when a 200 response carries no resolvable flag', async () => {
    mocks.checkResolvableMock.mockResolvedValue({ status: 200, data: null } as any)

    const { result, unmount } = mountComposable(() => useQuilttResolvable('connector_test'))

    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(result.isResolvable.value).toBeNull()
    expect(result.error.value).toBeNull()

    unmount()
  })

  it('falls back to a generic message for responses and rejections without one', async () => {
    const onError = vi.fn()
    const { result, unmount } = mountComposable(() =>
      useQuilttResolvable('connector_test', onError)
    )

    mocks.checkResolvableMock.mockResolvedValueOnce({ status: 500, data: null } as any)
    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(onError).toHaveBeenCalledWith('Failed to check resolvability')

    mocks.checkResolvableMock.mockRejectedValueOnce({})
    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(onError).toHaveBeenCalledWith('Unknown error occurred while checking resolvability')

    unmount()
  })

  it('handles non-200 and rejected API responses', async () => {
    const onError = vi.fn()
    const { result, unmount } = mountComposable(() =>
      useQuilttResolvable('connector_test', onError)
    )

    mocks.checkResolvableMock.mockResolvedValueOnce({
      status: 422,
      data: { message: 'unprocessable' },
    } as any)

    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(result.isResolvable.value).toBeNull()
    expect(onError).toHaveBeenCalledWith('unprocessable')

    mocks.checkResolvableMock.mockRejectedValueOnce(new Error('network failure'))
    expect(await result.checkResolvable({ plaid: 'provider' })).toBeNull()
    expect(onError).toHaveBeenCalledWith('network failure')
    expect(result.isLoading.value).toBe(false)

    unmount()
  })
})
