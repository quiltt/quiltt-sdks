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

import { QuilttButton } from '@/components/QuilttButton'

describe('QuilttButton', () => {
  afterEach(() => {
    mocks.openSpy.mockReset()
    mocks.useQuilttConnectorMock.mockClear()
    document.body.innerHTML = ''
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

  it('exposes appLauncherUrl as a reactive getter', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttButton, {
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
        h(
          QuilttButton,
          {
            connectorId: connectorIdRef.value,
            forceRemountOnConnectionChange: true,
          },
          () => 'Open'
        ),
    })

    app.mount(root)

    const initialElement = root.querySelector('.quiltt-button')

    connectorIdRef.value = 'connector_second'
    await nextTick()

    expect(root.querySelector('.quiltt-button')).not.toBe(initialElement)

    app.unmount()
  })

  it('passes themeMode to useQuilttConnector', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () =>
        h(QuilttButton, {
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

  it('calls user-provided onClick handler when clicked', () => {
    const onClick = vi.fn()

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () => h(QuilttButton, { connectorId: 'connector_test', onClick }, () => 'Open'),
    })

    app.mount(root)

    const button = root.querySelector('.quiltt-button') as HTMLButtonElement | null
    button?.click()

    expect(onClick).toHaveBeenCalled()
    expect(mocks.openSpy).toHaveBeenCalledTimes(1)

    app.unmount()
  })

  it('does not open connector when onClick prevents default', () => {
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault())

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = createApp({
      render: () => h(QuilttButton, { connectorId: 'connector_test', onClick }, () => 'Open'),
    })

    app.mount(root)

    const button = root.querySelector('.quiltt-button') as HTMLButtonElement | null
    button?.click()

    expect(onClick).toHaveBeenCalled()
    expect(mocks.openSpy).not.toHaveBeenCalled()

    app.unmount()
  })

  it('recreates element when connectionId changes and forceRemountOnConnectionChange is enabled', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const connectionIdRef = ref('conn_123')

    const app = createApp({
      render: () =>
        h(
          QuilttButton,
          {
            connectorId: 'connector_test',
            connectionId: connectionIdRef.value,
            forceRemountOnConnectionChange: true,
          },
          () => 'Open'
        ),
    })

    app.mount(root)

    const initialElement = root.querySelector('.quiltt-button')
    expect(initialElement).toBeTruthy()

    // Change connectionId to trigger a key change and complete replacement
    connectionIdRef.value = 'conn_456'
    await nextTick()

    // The old element should have been destroyed and replaced by a new one
    const currentElement = root.querySelector('.quiltt-button')
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
