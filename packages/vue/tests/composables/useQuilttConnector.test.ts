import { createApp, nextTick, ref } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

const flags = vi.hoisted(() => ({
  throwMissingPlugin: false,
}))

const sessionRef = ref<{ token?: string } | null>({ token: 'session_token' })

vi.mock('@/composables/useQuilttSession', () => ({
  useQuilttSession: () => {
    if (flags.throwMissingPlugin) {
      throw new Error('missing plugin context')
    }

    return {
      session: sessionRef,
    }
  },
}))

import { cdnBase } from '@quiltt/core'

import { useQuilttConnector } from '@/composables/useQuilttConnector'

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

describe('useQuilttConnector', () => {
  afterEach(() => {
    flags.throwMissingPlugin = false
  })

  it('throws when opening without connectorId', () => {
    ;(globalThis as any).Quiltt = {
      authenticate: vi.fn(),
      connect: vi.fn(),
      reconnect: vi.fn(),
    }

    const { result, unmount } = mountComposable(() => useQuilttConnector())

    expect(() => result.open()).toThrowError(/connectorId/i)

    unmount()
    delete (globalThis as any).Quiltt
  })

  it('authenticates and opens connector when Quiltt SDK is available', async () => {
    const connector = {
      open: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn(),
      onLoad: vi.fn(),
      onExit: vi.fn(),
      onExitSuccess: vi.fn(),
      onExitAbort: vi.fn(),
      onExitError: vi.fn(),
    }

    ;(globalThis as any).Quiltt = {
      authenticate: vi.fn(),
      connect: vi.fn(() => connector),
      reconnect: vi.fn(() => connector),
    }

    const { result, unmount } = mountComposable(() =>
      useQuilttConnector('connector_test', {
        institution: 'inst_1',
      })
    )

    await nextTick()
    await nextTick()

    result.open()
    await nextTick()
    await nextTick()

    expect((globalThis as any).Quiltt.authenticate).toHaveBeenCalledWith('session_token')
    expect((globalThis as any).Quiltt.connect).toHaveBeenCalledWith(
      'connector_test',
      expect.objectContaining({ institution: 'inst_1' })
    )
    expect(connector.open).toHaveBeenCalledTimes(1)

    unmount()
    delete (globalThis as any).Quiltt
  })

  it('uses reconnect when connectionId exists and warns if unmounted while open', async () => {
    const onOpenCallbacks: Array<(metadata: unknown) => void> = []
    const onExitCallbacks: Array<(type: unknown, metadata: unknown) => void> = []

    const connector = {
      open: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn((callback: (metadata: unknown) => void) => onOpenCallbacks.push(callback)),
      onLoad: vi.fn(),
      onExit: vi.fn((callback: (type: unknown, metadata: unknown) => void) =>
        onExitCallbacks.push(callback)
      ),
      onExitSuccess: vi.fn(),
      onExitAbort: vi.fn(),
      onExitError: vi.fn(),
    }

    ;(globalThis as any).Quiltt = {
      authenticate: vi.fn(),
      connect: vi.fn(() => connector),
      reconnect: vi.fn(() => connector),
    }

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { unmount } = mountComposable(() =>
      useQuilttConnector('connector_test', {
        connectionId: 'connection_test',
        oauthRedirectUrl: 'https://app.example.com/quiltt/callback',
        onOpen: vi.fn(),
        onExit: vi.fn(),
      })
    )

    await nextTick()
    await nextTick()

    expect((globalThis as any).Quiltt.reconnect).toHaveBeenCalledWith(
      'connector_test',
      expect.objectContaining({
        connectionId: 'connection_test',
        appLauncherUrl: 'https://app.example.com/quiltt/callback',
      })
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`oauthRedirectUrl` is deprecated')
    )

    onOpenCallbacks[0]?.({})
    unmount()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Component unmounted while Connector is still open')
    )

    onExitCallbacks[0]?.('Exit', {})

    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    delete (globalThis as any).Quiltt
  })

  it('does not throw when session plugin context is unavailable', async () => {
    flags.throwMissingPlugin = true

    const connector = {
      open: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn(),
      onLoad: vi.fn(),
      onExit: vi.fn(),
      onExitSuccess: vi.fn(),
      onExitAbort: vi.fn(),
      onExitError: vi.fn(),
    }

    ;(globalThis as any).Quiltt = {
      authenticate: vi.fn(),
      connect: vi.fn(() => connector),
      reconnect: vi.fn(() => connector),
    }

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result, unmount } = mountComposable(() => useQuilttConnector('connector_test'))

    await nextTick()
    await nextTick()

    result.open()
    await nextTick()
    await nextTick()

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('QuilttPlugin not found in the current app context'),
      expect.any(Error)
    )
    expect((globalThis as any).Quiltt.authenticate).toHaveBeenCalledWith(undefined)
    expect(connector.open).toHaveBeenCalledTimes(1)

    unmount()
    consoleWarnSpy.mockRestore()
    delete (globalThis as any).Quiltt
  })

  it('registers onEvent, onLoad, onExitSuccess, onExitAbort, onExitError on the connector', async () => {
    const onEvent = vi.fn()
    const onLoad = vi.fn()
    const onExitSuccess = vi.fn()
    const onExitAbort = vi.fn()
    const onExitError = vi.fn()

    const connector = {
      open: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn(),
      onLoad: vi.fn(),
      onExit: vi.fn(),
      onExitSuccess: vi.fn(),
      onExitAbort: vi.fn(),
      onExitError: vi.fn(),
    }

    ;(globalThis as any).Quiltt = {
      authenticate: vi.fn(),
      connect: vi.fn(() => connector),
      reconnect: vi.fn(() => connector),
    }

    const { unmount } = mountComposable(() =>
      useQuilttConnector('connector_test', {
        onEvent,
        onLoad,
        onExitSuccess,
        onExitAbort,
        onExitError,
      })
    )

    await nextTick()
    await nextTick()

    expect(connector.onEvent).toHaveBeenCalledWith(onEvent)
    expect(connector.onLoad).toHaveBeenCalledWith(onLoad)
    expect(connector.onExitSuccess).toHaveBeenCalledWith(onExitSuccess)
    expect(connector.onExitAbort).toHaveBeenCalledWith(onExitAbort)
    expect(connector.onExitError).toHaveBeenCalledWith(onExitError)

    unmount()
    delete (globalThis as any).Quiltt
  })

  it('handles oldConnector cleanup when connector changes', async () => {
    const connector1 = {
      open: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn(),
      onLoad: vi.fn(),
      onExit: vi.fn(),
      onExitSuccess: vi.fn(),
      onExitAbort: vi.fn(),
      onExitError: vi.fn(),
    }
    const connector2 = {
      open: vi.fn(),
      onEvent: vi.fn(),
      onOpen: vi.fn(),
      onLoad: vi.fn(),
      onExit: vi.fn(),
      onExitSuccess: vi.fn(),
      onExitAbort: vi.fn(),
      onExitError: vi.fn(),
    }
    let callCount = 0

    ;(globalThis as any).Quiltt = {
      authenticate: vi.fn(),
      connect: vi.fn(() => (callCount++ === 0 ? connector1 : connector2)),
      reconnect: vi.fn(),
    }

    const connectorIdRef = ref('connector_test')

    const { unmount } = mountComposable(() => useQuilttConnector(connectorIdRef))

    await nextTick()
    await nextTick()

    expect((globalThis as any).Quiltt.connect).toHaveBeenCalledWith(
      'connector_test',
      expect.any(Object)
    )

    // Change connector ID — triggers updateConnector which creates connector2
    // The watch(connector, ...) fires with oldConnector = connector1 (truthy)
    connectorIdRef.value = 'connector_test_2'
    await nextTick()
    await nextTick()

    expect((globalThis as any).Quiltt.connect).toHaveBeenCalledWith(
      'connector_test_2',
      expect.any(Object)
    )

    unmount()
    delete (globalThis as any).Quiltt
  })

  it('resolves via addEventListener when a matching script tag is already in the DOM', async () => {
    const existingScript = document.createElement('script')
    existingScript.src = `${cdnBase}/v1/connector.js`
    document.head.appendChild(existingScript)

    // No globalThis.Quiltt — loadScript skips the first guard and finds the existing element
    const { unmount } = mountComposable(() => useQuilttConnector())

    await nextTick() // onMounted fires → loadScript → finds existing script → attaches listeners

    existingScript.dispatchEvent(new Event('load'))
    await nextTick() // isLoaded becomes true; Quiltt guard prevents crash

    existingScript.remove()
    unmount()
  })

  it('creates a new script tag and sets nonce when SDK is not already in the DOM', async () => {
    // No globalThis.Quiltt and no pre-existing script — falls through to createElement path
    const { unmount } = mountComposable(() =>
      useQuilttConnector('connector_test', { nonce: 'test-nonce' })
    )

    await nextTick() // onMounted fires → loadScript → createElement → appendChild

    const script = document.head.querySelector(
      `script[src^="${cdnBase}/v1/connector.js"]`
    ) as HTMLScriptElement | null

    expect(script).toBeTruthy()
    expect(script?.async).toBe(true)
    expect(script?.nonce).toBe('test-nonce')

    script?.dispatchEvent(new Event('load'))
    await nextTick()

    script?.remove()
    unmount()
  })
})
