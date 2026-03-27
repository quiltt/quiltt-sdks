import { createApp, h } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const openSpy = vi.fn()
  let latestOptions: Record<string, unknown> | undefined
  const useQuilttConnectorMock = vi.fn((_, options) => {
    latestOptions = options as Record<string, unknown>
    return { open: openSpy }
  })

  return {
    openSpy,
    getLatestOptions: () => latestOptions,
    useQuilttConnectorMock,
  }
})

vi.mock('@/composables/useQuilttConnector', () => ({
  useQuilttConnector: mocks.useQuilttConnectorMock,
}))

import { QuilttContainer } from '@/components/QuilttContainer'

describe('QuilttContainer', () => {
  afterEach(() => {
    vi.useRealTimers()
    mocks.openSpy.mockReset()
    mocks.useQuilttConnectorMock.mockClear()
    document.body.innerHTML = ''
  })

  it('passes fallback oauthRedirectUrl as appLauncherUrl to connector composable', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          oauthRedirectUrl: 'https://example.com/oauth/callback',
        }),
    })

    app.mount(root)

    const [connectorId, options] = mocks.useQuilttConnectorMock.mock.calls[0] as [
      () => string,
      Record<string, unknown>,
    ]

    expect(connectorId()).toBe('connector_test')
    expect((options.appLauncherUrl as { value: string }).value).toBe(
      'https://example.com/oauth/callback'
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`oauthRedirectUrl` is deprecated')
    )

    app.unmount()
    consoleWarnSpy.mockRestore()
  })

  it('prefers appLauncherUrl over oauthRedirectUrl when both are provided', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          appLauncherUrl: 'https://example.com/preferred',
          oauthRedirectUrl: 'https://example.com/fallback',
        }),
    })

    app.mount(root)

    const [connectorId, options] = mocks.useQuilttConnectorMock.mock.calls[0] as [
      () => string,
      Record<string, unknown>,
    ]

    expect(connectorId()).toBe('connector_test')
    expect((options.appLauncherUrl as { value: string }).value).toBe(
      'https://example.com/preferred'
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`oauthRedirectUrl` is deprecated')
    )

    app.unmount()
    consoleWarnSpy.mockRestore()
  })

  it('sets quiltt-container attribute with connectorId on the rendered element', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () => h(QuilttContainer, { connectorId: 'connector_test' }),
    })

    app.mount(root)

    const el = root.querySelector('[quiltt-container="connector_test"]')
    expect(el).toBeTruthy()

    app.unmount()
  })

  it('does not call open() on mount', () => {
    vi.useFakeTimers()

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () => h(QuilttContainer, { connectorId: 'connector_test' }),
    })

    app.mount(root)
    vi.advanceTimersByTime(200)

    expect(mocks.openSpy).not.toHaveBeenCalled()

    app.unmount()
  })

  it('renders custom element and wires connector callbacks to emits', () => {
    const onEvent = vi.fn()
    const onLoad = vi.fn()
    const onExit = vi.fn()
    const onExitSuccess = vi.fn()
    const onExitAbort = vi.fn()
    const onExitError = vi.fn()

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(
          QuilttContainer,
          {
            connectorId: 'connector_test',
            as: 'section',
            onEvent,
            onLoad,
            onExit,
            onExitSuccess,
            onExitAbort,
            onExitError,
          },
          () => 'Inline Connector'
        ),
    })

    app.mount(root)

    const section = root.querySelector('section.quiltt-container')
    expect(section).toBeTruthy()

    const options = mocks.getLatestOptions()
    expect(options).toBeDefined()

    const metadata = { connectorId: 'connector_test' }
    ;(options?.onEvent as (type: string, metadata: unknown) => void)?.('Load', metadata)
    ;(options?.onLoad as (metadata: unknown) => void)?.(metadata)
    ;(options?.onExit as (type: string, metadata: unknown) => void)?.('ExitAbort', metadata)
    ;(options?.onExitSuccess as (metadata: unknown) => void)?.(metadata)
    ;(options?.onExitAbort as (metadata: unknown) => void)?.(metadata)
    ;(options?.onExitError as (metadata: unknown) => void)?.(metadata)

    expect(onEvent).toHaveBeenCalledWith('Load', metadata)
    expect(onLoad).toHaveBeenCalledWith(metadata)
    expect(onExit).toHaveBeenCalledWith('ExitAbort', metadata)
    expect(onExitSuccess).toHaveBeenCalledWith(metadata)
    expect(onExitAbort).toHaveBeenCalledWith(metadata)
    expect(onExitError).toHaveBeenCalledWith(metadata)

    app.unmount()
  })

  it('exposes connectionId and institution as reactive getters', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          connectionId: 'conn_123',
          institution: 'inst_456',
        }),
    })

    app.mount(root)

    const [, options] = mocks.useQuilttConnectorMock.mock.calls[0] as [
      () => string,
      Record<string, unknown>,
    ]

    expect((options.connectionId as () => string | undefined)()).toBe('conn_123')
    expect((options.institution as () => string | undefined)()).toBe('inst_456')

    app.unmount()
  })
})
