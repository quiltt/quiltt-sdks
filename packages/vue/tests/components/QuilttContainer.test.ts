import { createApp, h, nextTick, ref } from 'vue'

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

  it('exposes appLauncherUrl as a reactive getter', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          appLauncherUrl: 'myapp://oauth',
        }),
    })

    app.mount(root)

    const [, options] = mocks.useQuilttConnectorMock.mock.calls[0] as [
      () => string,
      Record<string, unknown>,
    ]

    expect((options.appLauncherUrl as () => string | undefined)()).toBe('myapp://oauth')

    app.unmount()
  })

  it('keys on the connector alone when forceRemountOnConnectionChange has no connection', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const connectorIdRef = ref('connector_first')

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: connectorIdRef.value,
          forceRemountOnConnectionChange: true,
        }),
    })

    app.mount(root)

    const initialElement = root.querySelector('.quiltt-container')

    connectorIdRef.value = 'connector_second'
    await nextTick()

    expect(root.querySelector('.quiltt-container')).not.toBe(initialElement)

    app.unmount()
  })

  it('passes themeMode to useQuilttConnector', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          themeMode: 'dark',
        }),
    })

    app.mount(root)

    const [, options] = mocks.useQuilttConnectorMock.mock.calls[0] as [
      () => string,
      Record<string, unknown>,
    ]

    expect((options.themeMode as () => string | undefined)()).toBe('dark')

    app.unmount()
  })

  it('renders quiltt-theme-mode attribute on the container element', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          themeMode: 'auto',
        }),
    })

    app.mount(root)

    const containerEl = root.querySelector('[quiltt-container="connector_test"]')
    expect(containerEl?.getAttribute('quiltt-theme-mode')).toBe('auto')

    app.unmount()
  })

  it('wires onOpen callback when parent subscribes to open event', () => {
    const onOpen = vi.fn()

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          onOpen,
        }),
    })

    app.mount(root)

    const options = mocks.getLatestOptions()
    expect(options).toBeDefined()
    expect(options?.onOpen).toBeDefined()

    const metadata = { connectorId: 'connector_test' }
    ;(options?.onOpen as (metadata: unknown) => void)?.(metadata)

    expect(onOpen).toHaveBeenCalledWith(metadata)

    app.unmount()
  })

  it('recreates element when connectionId changes and forceRemountOnConnectionChange is enabled', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const connectionIdRef = ref('conn_123')

    const app = createApp({
      render: () =>
        h(QuilttContainer, {
          connectorId: 'connector_test',
          connectionId: connectionIdRef.value,
          forceRemountOnConnectionChange: true,
        }),
    })

    app.mount(root)

    const initialElement = root.querySelector('.quiltt-container')
    expect(initialElement).toBeTruthy()

    // Change connectionId to trigger a key change and complete replacement
    connectionIdRef.value = 'conn_456'
    await nextTick()

    // The old element should have been destroyed and replaced by a new one
    const currentElement = root.querySelector('.quiltt-container')
    expect(currentElement).toBeTruthy()
    expect(currentElement).not.toBe(initialElement)

    // The composable is set up once at mount; the key is on the inner element,
    // so setup() is not re-run — only the DOM element was replaced.
    const [connectorId, options] = mocks.useQuilttConnectorMock.mock.calls[0] as [
      () => string,
      Record<string, unknown>,
    ]
    expect(connectorId()).toBe('connector_test')
    // The getter reflects the latest reactive value
    expect((options.connectionId as () => string | undefined)()).toBe('conn_456')

    app.unmount()
  })
})
