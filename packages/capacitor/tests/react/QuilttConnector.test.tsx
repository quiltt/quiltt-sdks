import { createRef } from 'react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

const pluginMocks = vi.hoisted(() => ({
  openUrl: vi.fn(),
  addListener: vi.fn(),
  getAppLauncherUrl: vi.fn(),
}))

const sessionMocks = vi.hoisted(() => ({
  session: { token: 'session_token' },
}))

vi.mock('../../src/plugin', () => ({
  QuilttConnector: {
    openUrl: pluginMocks.openUrl,
    addListener: pluginMocks.addListener,
    getAppLauncherUrl: pluginMocks.getAppLauncherUrl,
  },
}))

vi.mock('@quiltt/react', async (importOriginal) => {
  // The component resolves this helper from the package it already depends on,
  // so it has to be the real implementation for the origin assertions below to
  // mean anything.
  const { isTrustedQuilttUrl } = await importOriginal<typeof import('@quiltt/react')>()

  return {
    ConnectorSDKEventType: {
      Load: 'Load',
      ExitSuccess: 'ExitSuccess',
      ExitAbort: 'ExitAbort',
      ExitError: 'ExitError',
    },
    cdnBase: 'https://cdn.quiltt.dev',
    isTrustedQuilttUrl,
    useQuilttSession: () => ({ session: sessionMocks.session }),
  }
})

import type { QuilttConnectorHandle } from '../../src/components/react/QuilttConnector'
import { QuilttConnector } from '../../src/components/react/QuilttConnector'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
    }))
  )
})

const primePluginMocks = () => {
  pluginMocks.addListener.mockResolvedValue({ remove: vi.fn() })
  pluginMocks.getAppLauncherUrl.mockResolvedValue({ url: null })
}

describe('QuilttConnector (capacitor)', () => {
  it('builds iframe src with connector props and session token', () => {
    primePluginMocks()

    const { container } = render(
      <QuilttConnector
        connectorId="connector_test"
        connectionId="connection_test"
        institution="institution_test"
        appLauncherUrl="https://app.example.com/quiltt/callback"
      />
    )

    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null
    expect(iframe).toBeTruthy()

    const src = iframe?.getAttribute('src') || ''
    expect(src).toContain('connector_test.quiltt.app')
    expect(src).toContain('token=session_token')
    expect(src).toContain('connectionId=connection_test')
    expect(src).toContain('institution=institution_test')
    expect(src).toContain('app_launcher_url=https%3A%2F%2Fapp.example.com%2Fquiltt%2Fcallback')
    expect(src).toContain('embed_location=')
    expect(src).toContain('mode=INLINE')

    expect(fetch).toHaveBeenCalledWith(
      src,
      expect.objectContaining({
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit',
      })
    )
  })

  it('normalizes app launcher URLs to avoid double-encoding', () => {
    primePluginMocks()

    const encodedLauncher = encodeURIComponent('https://app.example.com/quiltt/callback')

    const { container } = render(
      <QuilttConnector connectorId="connector_test" appLauncherUrl={encodedLauncher} />
    )

    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null
    expect(iframe).toBeTruthy()

    const src = iframe?.getAttribute('src') || ''
    expect(src).toContain('app_launcher_url=https%3A%2F%2Fapp.example.com%2Fquiltt%2Fcallback')
    expect(src).not.toContain('app_launcher_url=https%253A%252F%252Fapp.example.com')
  })

  // The connector ID is interpolated into the connector host, so a `/` or `?`
  // in it would retarget the iframe — and that URL carries the session token.
  // The backslash case is the subtle one: the URL parser ends the authority
  // there, so the host becomes whatever precedes it.
  const BACKSLASH = String.fromCharCode(92)

  it.each(['evil.com/x', 'evil.com?y=', '../..', `evil.example${BACKSLASH}@`])(
    'refuses a connector ID that does not resolve to a Quiltt host: %s',
    (connectorId) => {
      primePluginMocks()

      const { container } = render(<QuilttConnector connectorId={connectorId} />)

      expect(container.querySelector('iframe')).toBeNull()
      expect(screen.getByText(/Invalid connector ID/)).toBeTruthy()

      // The token must never be sent to the unvalidated host.
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('opens system browser on navigate events from trusted origin', () => {
    primePluginMocks()

    render(<QuilttConnector connectorId="connector_test" />)

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: {
          source: 'quiltt',
          type: 'Navigate',
          url: 'https://bank.example.com',
        },
      })
    )

    expect(pluginMocks.openUrl).toHaveBeenCalledWith({ url: 'https://bank.example.com' })

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example.com',
        data: {
          source: 'quiltt',
          type: 'Navigate',
          url: 'https://evil.example.com',
        },
      })
    )

    expect(pluginMocks.openUrl).toHaveBeenCalledTimes(1)
  })

  it('routes connector lifecycle events to callback props with metadata', () => {
    primePluginMocks()

    const onEvent = vi.fn()
    const onLoad = vi.fn()
    const onExit = vi.fn()
    const onExitSuccess = vi.fn()
    const onExitAbort = vi.fn()
    const onExitError = vi.fn()

    render(
      <QuilttConnector
        connectorId="connector_test"
        onEvent={onEvent}
        onLoad={onLoad}
        onExit={onExit}
        onExitSuccess={onExitSuccess}
        onExitAbort={onExitAbort}
        onExitError={onExitError}
      />
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://sub.connector_test.quiltt.app',
        data: {
          source: 'quiltt',
          type: 'Load',
          profileId: 'profile_123',
          connectionId: 'connection_123',
          connectorSession: 'session_123',
        },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'quiltt', type: 'ExitSuccess', connectionId: 'connection_123' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'quiltt', type: 'ExitAbort' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'quiltt', type: 'ExitError' },
      })
    )

    expect(onLoad).toHaveBeenCalledWith({
      connectorId: 'connector_test',
      profileId: 'profile_123',
      connectionId: 'connection_123',
      connectorSession: 'session_123',
    })

    expect(onEvent).toHaveBeenCalledWith('Load', {
      connectorId: 'connector_test',
      profileId: 'profile_123',
      connectionId: 'connection_123',
      connectorSession: 'session_123',
    })
    expect(onEvent).toHaveBeenCalledWith('ExitSuccess', {
      connectorId: 'connector_test',
      connectionId: 'connection_123',
    })
    expect(onEvent).toHaveBeenCalledWith('ExitAbort', { connectorId: 'connector_test' })
    expect(onEvent).toHaveBeenCalledWith('ExitError', { connectorId: 'connector_test' })

    expect(onExit).toHaveBeenCalledWith('ExitSuccess', {
      connectorId: 'connector_test',
      connectionId: 'connection_123',
    })
    expect(onExit).toHaveBeenCalledWith('ExitAbort', { connectorId: 'connector_test' })
    expect(onExit).toHaveBeenCalledWith('ExitError', { connectorId: 'connector_test' })

    expect(onExitSuccess).toHaveBeenCalledWith({
      connectorId: 'connector_test',
      connectionId: 'connection_123',
    })
    expect(onExitAbort).toHaveBeenCalledWith({ connectorId: 'connector_test' })
    expect(onExitError).toHaveBeenCalledWith({ connectorId: 'connector_test' })
  })

  it('ignores messages with untrusted origin or malformed payload', () => {
    primePluginMocks()

    const onEvent = vi.fn()
    render(<QuilttConnector connectorId="connector_test" onEvent={onEvent} />)

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://connector_test.quiltt.app',
        data: { source: 'quiltt', type: 'Load' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'not-quiltt', type: 'Load' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'quiltt' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'quiltt', type: 'Navigate' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'quiltt', type: 'UnknownEventType' },
      })
    )

    expect(onEvent).not.toHaveBeenCalled()
    expect(pluginMocks.openUrl).not.toHaveBeenCalled()
  })

  it('sends OAuth callbacks to the iframe, parses params, and exposes a handle', async () => {
    let deepLinkListener: ((event: { url: string }) => void) | undefined

    pluginMocks.addListener.mockImplementation((_event, listener) => {
      deepLinkListener = listener
      return Promise.resolve({ remove: vi.fn() })
    })

    pluginMocks.getAppLauncherUrl.mockResolvedValue({ url: 'not-a-valid-url' })

    const connectorRef = createRef<QuilttConnectorHandle>()

    const { container } = render(
      <QuilttConnector connectorId="connector_test" ref={connectorRef} />
    )

    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    const postMessageSpy = vi.fn()

    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: postMessageSpy },
      configurable: true,
    })

    deepLinkListener?.({ url: 'https://example.com/oauth?code=abc&state=xyz' })
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'quiltt',
        type: 'OAuthCallback',
        data: {
          url: 'https://example.com/oauth?code=abc&state=xyz',
          params: { code: 'abc', state: 'xyz' },
        },
      },
      'https://connector_test.quiltt.app'
    )

    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          source: 'quiltt',
          type: 'OAuthCallback',
          data: {
            url: 'not-a-valid-url',
            params: {},
          },
        },
        'https://connector_test.quiltt.app'
      )
    })

    connectorRef.current?.handleOAuthCallback('https://example.com/manual?token=123')
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'quiltt',
        type: 'OAuthCallback',
        data: {
          url: 'https://example.com/manual?token=123',
          params: { token: '123' },
        },
      },
      'https://connector_test.quiltt.app'
    )

    const encodedManualCallback = encodeURIComponent('https://example.com/manual?token=789')
    connectorRef.current?.handleOAuthCallback(encodedManualCallback)
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'quiltt',
        type: 'OAuthCallback',
        data: {
          url: 'https://example.com/manual?token=789',
          params: { token: '789' },
        },
      },
      'https://connector_test.quiltt.app'
    )
  })

  it('shows a basic error state when preflight cannot reach connector', async () => {
    primePluginMocks()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('network down')))
    )

    render(<QuilttConnector connectorId="connector_test" />)

    await waitFor(() => {
      expect(
        screen.getByText('Unable to reach Quiltt Connector. Check network and connector settings.')
      ).toBeTruthy()
    })
  })

  it('handles OAuth callback when iframe contentWindow is unavailable', () => {
    primePluginMocks()

    const connectorRef = createRef<QuilttConnectorHandle>()
    const { container } = render(
      <QuilttConnector connectorId="connector_test" ref={connectorRef} />
    )

    const iframe = container.querySelector('iframe') as HTMLIFrameElement
    Object.defineProperty(iframe, 'contentWindow', {
      value: null,
      configurable: true,
    })

    expect(() =>
      connectorRef.current?.handleOAuthCallback('https://example.com/callback')
    ).not.toThrow()
  })

  it('removes deepLink listener on unmount', async () => {
    const remove = vi.fn()

    pluginMocks.addListener.mockResolvedValue({ remove })
    pluginMocks.getAppLauncherUrl.mockResolvedValue({ url: null })

    const { unmount } = render(<QuilttConnector connectorId="connector_test" />)
    unmount()

    await waitFor(() => {
      expect(remove).toHaveBeenCalledTimes(1)
    })
  })

  it('includes themeMode in iframe src when provided', () => {
    primePluginMocks()

    const { container } = render(<QuilttConnector connectorId="connector_test" themeMode="dark" />)

    const iframe = container.querySelector('iframe') as HTMLIFrameElement | null
    expect(iframe).toBeTruthy()

    const src = iframe?.getAttribute('src') || ''
    expect(src).toContain('theme_mode=dark')
  })
})
