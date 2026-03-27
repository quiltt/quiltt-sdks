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

import { QuilttButton } from '@/components/QuilttButton'

describe('QuilttButton', () => {
  afterEach(() => {
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
        h(
          QuilttButton,
          {
            connectorId: 'connector_test',
            oauthRedirectUrl: 'https://example.com/oauth/callback',
          },
          () => 'Open Connector'
        ),
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
        h(QuilttButton, {
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

  it('opens connector when rendered element is clicked', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(
          QuilttButton,
          {
            connectorId: 'connector_test',
          },
          () => 'Open Connector'
        ),
    })

    app.mount(root)

    const button = root.querySelector('.quiltt-button') as HTMLButtonElement | null
    expect(button).toBeTruthy()

    button?.click()

    expect(mocks.openSpy).toHaveBeenCalledTimes(1)

    app.unmount()
  })

  it('renders custom element and wires connector callbacks to emits', () => {
    const onEvent = vi.fn()
    const onOpen = vi.fn()
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
          QuilttButton,
          {
            connectorId: 'connector_test',
            as: 'a',
            onEvent,
            onOpen,
            onLoad,
            onExit,
            onExitSuccess,
            onExitAbort,
            onExitError,
          },
          () => 'Open Connector'
        ),
    })

    app.mount(root)

    const anchor = root.querySelector('a.quiltt-button')
    expect(anchor).toBeTruthy()

    const options = mocks.getLatestOptions()
    expect(options).toBeDefined()

    const metadata = { connectorId: 'connector_test' }
    ;(options?.onEvent as (type: string, metadata: unknown) => void)?.('Load', metadata)
    ;(options?.onOpen as (metadata: unknown) => void)?.(metadata)
    ;(options?.onLoad as (metadata: unknown) => void)?.(metadata)
    ;(options?.onExit as (type: string, metadata: unknown) => void)?.('ExitSuccess', metadata)
    ;(options?.onExitSuccess as (metadata: unknown) => void)?.(metadata)
    ;(options?.onExitAbort as (metadata: unknown) => void)?.(metadata)
    ;(options?.onExitError as (metadata: unknown) => void)?.(metadata)

    expect(onEvent).toHaveBeenCalledWith('Load', metadata)
    expect(onOpen).toHaveBeenCalledWith(metadata)
    expect(onLoad).toHaveBeenCalledWith(metadata)
    expect(onExit).toHaveBeenCalledWith('ExitSuccess', metadata)
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
        h(QuilttButton, {
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
