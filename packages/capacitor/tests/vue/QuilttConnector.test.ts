import { nextTick } from 'vue'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { enableAutoUnmount, mount } from '@vue/test-utils'

const pluginMocks = vi.hoisted(() => ({
  openUrl: vi.fn(),
  addListener: vi.fn(),
  getAppLauncherUrl: vi.fn(),
}))

vi.mock('../../src/plugin', () => ({
  QuilttConnector: {
    openUrl: pluginMocks.openUrl,
    addListener: pluginMocks.addListener,
    getAppLauncherUrl: pluginMocks.getAppLauncherUrl,
  },
}))

vi.mock('@quiltt/vue', async (importOriginal) => {
  // The component resolves this helper from the package it already depends on,
  // so it has to be the real implementation wherever an origin is checked.
  const { isTrustedQuilttUrl } = await importOriginal<typeof import('@quiltt/vue')>()

  return {
    ConnectorSDKEventType: {
      Load: 'Load',
      ExitSuccess: 'ExitSuccess',
      ExitAbort: 'ExitAbort',
      ExitError: 'ExitError',
    },
    isTrustedQuilttUrl,
    useQuilttSession: () => ({ session: { value: { token: 'session_token' } } }),
  }
})

import { QuilttConnector } from '../../src/components/vue/QuilttConnector'

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// Unmount every connector mounted by a test before resetting the environment.
// Each mounted connector registers a window message listener, a deep-link
// listener, and a delayed load timer that only `onUnmounted` cleans up, so a
// later test could otherwise trigger an earlier one's listener or timer.
enableAutoUnmount(afterEach)

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

describe('QuilttConnector (capacitor vue)', () => {
  it('builds iframe src with connector props and session token', () => {
    primePluginMocks()

    const wrapper = mount(QuilttConnector, {
      props: {
        connectorId: 'connector_test',
        connectionId: 'connection_test',
        institution: 'institution_test',
        appLauncherUrl: 'https://app.example.com/quiltt/callback',
      },
    })

    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)

    const src = iframe.attributes('src') || ''
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

    const wrapper = mount(QuilttConnector, {
      props: {
        connectorId: 'connector_test',
        appLauncherUrl: encodedLauncher,
      },
    })

    const iframe = wrapper.find('iframe')
    const src = iframe.attributes('src') || ''

    // The component decodes the already-encoded URL, so the param value
    // should be the decoded form, single-encoded in the final URL
    expect(src).toContain('app_launcher_url=https%3A%2F%2Fapp.example.com%2Fquiltt%2Fcallback')
    // Should NOT double-encode (no %252F present)
    expect(src).not.toContain('%252F')
  })

  it('includes themeMode in iframe src when provided', () => {
    primePluginMocks()

    const wrapper = mount(QuilttConnector, {
      props: {
        connectorId: 'connector_test',
        themeMode: 'dark',
      },
    })

    const iframe = wrapper.find('iframe')
    const src = iframe.attributes('src') || ''
    expect(src).toContain('theme_mode=dark')
  })

  it('starts preflight and shows error on failure', async () => {
    primePluginMocks()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('network down')))
    )

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    // Wait for the async preflight to reject
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(wrapper.text()).toContain('Unable to reach Quiltt Connector')
  })

  it('exposes handleOAuthCallback method', () => {
    primePluginMocks()

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    expect(
      typeof (wrapper.vm as unknown as { handleOAuthCallback: () => void }).handleOAuthCallback
    ).toBe('function')
  })

  it('sets up deepLink listener on mount', () => {
    primePluginMocks()

    mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    expect(pluginMocks.addListener).toHaveBeenCalledWith('deepLink', expect.any(Function))
    expect(pluginMocks.getAppLauncherUrl).toHaveBeenCalled()
  })

  it('sends OAuth callbacks to the iframe and parses params', async () => {
    let deepLinkListener: ((event: { url: string }) => void) | undefined

    pluginMocks.addListener.mockImplementation((_event, listener) => {
      deepLinkListener = listener
      return Promise.resolve({ remove: vi.fn() })
    })
    pluginMocks.getAppLauncherUrl.mockResolvedValue({ url: 'not-a-valid-url' })

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    const iframe = wrapper.find('iframe').element as HTMLIFrameElement
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

    const handleOAuthCallback = (
      wrapper.vm as unknown as { handleOAuthCallback: (url: string) => void }
    ).handleOAuthCallback
    handleOAuthCallback('https://example.com/manual?token=123')
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

    // The app-launcher URL is fetched on mount; an unparseable one falls back
    // to an empty params object.
    await new Promise((resolve) => setTimeout(resolve, 0))
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

  it('ignores messages from untrusted origins and malformed payloads', () => {
    primePluginMocks()

    const onEvent = vi.fn()
    mount(QuilttConnector, {
      props: { connectorId: 'connector_test', onEvent },
    })

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example.com',
        data: { source: 'quiltt', type: 'Load' },
      })
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://connector_test.quiltt.app',
        data: { source: 'not-quiltt', type: 'Load' },
      })
    )

    expect(onEvent).not.toHaveBeenCalled()
  })

  it('routes trusted connector messages to lifecycle events with metadata', async () => {
    primePluginMocks()

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    const dispatch = (type: string, extra = {}) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://connector_test.quiltt.app',
          data: {
            source: 'quiltt',
            type,
            profileId: 'profile_123',
            connectionId: 'connection_123',
            connectorSession: 'session_123',
            ...extra,
          },
        })
      )

    const metadata = {
      connectorId: 'connector_test',
      profileId: 'profile_123',
      connectionId: 'connection_123',
      connectorSession: 'session_123',
    }

    dispatch('Load')
    dispatch('ExitSuccess')
    dispatch('ExitAbort')
    dispatch('ExitError')
    dispatch('Navigate', { url: 'https://bank.example.com' })

    await nextTick()

    expect(wrapper.emitted('event')).toEqual([
      ['Load', metadata],
      ['ExitSuccess', metadata],
      ['ExitAbort', metadata],
      ['ExitError', metadata],
    ])
    expect(wrapper.emitted('load')).toEqual([[metadata]])
    expect(wrapper.emitted('exit')).toEqual([
      ['ExitSuccess', metadata],
      ['ExitAbort', metadata],
      ['ExitError', metadata],
    ])
    expect(wrapper.emitted('exit-success')).toEqual([[metadata]])
    expect(wrapper.emitted('exit-abort')).toEqual([[metadata]])
    expect(wrapper.emitted('exit-error')).toEqual([[metadata]])

    expect(pluginMocks.openUrl).toHaveBeenCalledWith({ url: 'https://bank.example.com' })
  })

  it('shows the load timeout error when the connector never loads', async () => {
    primePluginMocks()

    vi.useFakeTimers()

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    vi.advanceTimersByTime(15000)
    await nextTick()

    expect(wrapper.text()).toContain('Connector took too long to load. Please retry.')
  })

  it('removes deepLink listener on unmount', async () => {
    const remove = vi.fn()

    pluginMocks.addListener.mockResolvedValue({ remove })
    pluginMocks.getAppLauncherUrl.mockResolvedValue({ url: null })

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    wrapper.unmount()

    // Wait for the promise-based cleanup to resolve
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(remove).toHaveBeenCalledTimes(1)
  })

  // The connector ID is interpolated into the connector host, so a `/` or `?`
  // in it would retarget the iframe — and that URL carries the session token.
  // The backslash case is the subtle one: the URL parser ends the authority
  // there, so the host becomes whatever precedes it.
  const BACKSLASH = String.fromCharCode(92)

  it.each(['evil.com/x', 'evil.com?y=', '../..', `evil.example${BACKSLASH}@`])(
    'refuses a connector ID that does not resolve to a Quiltt host: %s',
    async (connectorId) => {
      primePluginMocks()

      const wrapper = mount(QuilttConnector, { props: { connectorId } })

      // Vue applies the state change on the next tick.
      await nextTick()

      expect(wrapper.find('iframe').exists()).toBe(false)
      expect(wrapper.text()).toContain('Invalid connector ID')

      // The token must never be sent to the unvalidated host.
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('renders error state text', async () => {
    primePluginMocks()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('network down')))
    )

    const wrapper = mount(QuilttConnector, {
      props: { connectorId: 'connector_test' },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    const errorEl = wrapper.find('div[style*="position: absolute"]')
    expect(errorEl.exists()).toBe(true)
    expect(errorEl.text()).toContain('Unable to reach Quiltt Connector')
  })
})
