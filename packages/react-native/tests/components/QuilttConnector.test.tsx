import { createRef, forwardRef } from 'react'
import { Linking, Platform } from 'react-native'

import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import { ConnectorSDKEventType } from '@quiltt/core'

import {
  checkConnectorUrl,
  handleOAuthUrl,
  QuilttConnector,
  type QuilttConnectorHandle,
} from '@/components/QuilttConnector'

// Store WebView props for testing
let capturedWebViewProps: any = null
let capturedWebViewRef: any = null

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn((_error: Error, _context?: Record<string, unknown>) => Promise.resolve()),
}))

// Mock ErrorReporter before importing QuilttConnector
vi.mock('@/utils/error/ErrorReporter', () => ({
  ErrorReporter: class {
    notify = notifyMock
  },
}))

// Mock WebView component with proper ref support using forwardRef
vi.mock('react-native-webview', () => ({
  WebView: forwardRef((props: any, ref: any) => {
    capturedWebViewProps = { ...props } // Synchronous capture
    capturedWebViewRef = ref // Capture the ref
    return null
  }),
}))

// Mock Quiltt React
vi.mock('@quiltt/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@quiltt/react')>()
  return {
    ...actual,
    useQuilttSession: () => ({ session: { token: 'test-token' } }),
  }
})

// Helper to create a mock Response
const createMockResponse = (status: number, body: any): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('QuilttConnector', () => {
  const defaultProps = {
    testId: 'test-connector',
    connectorId: 'test-connector',
    connectionId: 'test-connection',
    institution: 'test-bank',
    appLauncherUrl: 'https://oauth.test.com/',
    themeMode: 'dark' as const,
    onEvent: vi.fn(),
    onLoad: vi.fn(),
    onExit: vi.fn(),
    onExitSuccess: vi.fn(),
    onExitAbort: vi.fn(),
    onExitError: vi.fn(),
  }

  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
    vi.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true))
    capturedWebViewProps = null
    capturedWebViewRef = null

    // Mock successful fetch for all tests by default
    fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const FAILING_ASSET_URL = 'https://cdn.quiltt.io/vite/assets/ScreenInspector--LK1I1V8.js'
  const CONNECTOR_HTML = `<!doctype html><html><head>
    <link rel="modulepreload" href="${FAILING_ASSET_URL}">
    <script type="module" src="https://cdn.quiltt.io/vite/connector/application.js"></script>
  </head><body><div id="root"></div></body></html>`

  const mockConnectorDocument = (failingAssetUrl?: string) => {
    fetchSpy.mockImplementation((input, init) => {
      if (init?.method === 'HEAD') {
        const status = failingAssetUrl && String(input) === failingAssetUrl ? 404 : 200
        return Promise.resolve(new Response(null, { status }))
      }

      return Promise.resolve(
        new Response(CONNECTOR_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )
    })
  }

  describe('handleOAuthUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(Linking.openURL).mockResolvedValue(true)
    })

    it('should handle null or undefined URLs', async () => {
      const onFailure = vi.fn()

      await handleOAuthUrl(null, onFailure)
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))

      onFailure.mockClear()
      await handleOAuthUrl(undefined, onFailure)
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle empty string URLs', async () => {
      const onFailure = vi.fn()
      await handleOAuthUrl('', onFailure)
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))

      onFailure.mockClear()
      await handleOAuthUrl('   ', onFailure)
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should open the URL directly without a preflight check', async () => {
      const url = 'https://oauth.test.com/callback'
      await handleOAuthUrl(url)

      expect(Linking.openURL).toHaveBeenCalledWith(url)
      // Regression guard: `Linking.canOpenURL` is not authoritative on Android
      // 11+ (package visibility returns false while `openURL` would succeed),
      // so it must never gate the handoff
      expect(Linking.canOpenURL).not.toHaveBeenCalled()
    })

    it('should fire onFailure when openURL rejects', async () => {
      vi.mocked(Linking.openURL).mockRejectedValue(new Error('Cannot open'))

      const onFailure = vi.fn()
      await handleOAuthUrl('https://oauth.test.com/callback', onFailure)

      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should not fall back to the raw double-encoded URL', async () => {
      const doubleEncodedUrl = 'https%3A%2F%2Foauth.test.com%2Fcallback%3Fcode%3Dabc%2520xyz'
      vi.mocked(Linking.openURL).mockRejectedValue(new Error('Cannot open'))

      const onFailure = vi.fn()
      await handleOAuthUrl(doubleEncodedUrl, onFailure)

      expect(Linking.openURL).toHaveBeenCalledTimes(1)
      expect(Linking.openURL).toHaveBeenCalledWith('https://oauth.test.com/callback?code=abc%20xyz')
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should normalize double-encoded URLs', async () => {
      const doubleEncodedUrl = 'https://oauth.test.com/callback?code=test%2520code'
      await handleOAuthUrl(doubleEncodedUrl)
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://oauth.test.com/callback?code=test%20code'
      )
    })

    it('should report failure instead of throwing when the URL has a malformed escape sequence', async () => {
      const malformedUrl = 'https://oauth.test.com/callback?code=abc%2520%ZZxyz'

      const onFailure = vi.fn()
      await expect(handleOAuthUrl(malformedUrl, onFailure)).resolves.toBeUndefined()

      expect(Linking.openURL).not.toHaveBeenCalled()
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should report a non-Error rejection as an Error', async () => {
      vi.mocked(Linking.openURL).mockRejectedValue('Cannot open')

      const onFailure = vi.fn()
      await handleOAuthUrl('https://oauth.test.com/callback', onFailure)

      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
      expect(onFailure.mock.calls[0][0].message).toBe('Cannot open')
    })

    it('should fall back to the original URL when the normalized URL cannot be opened', async () => {
      const doubleEncodedUrl = 'https://oauth.test.com/callback?code=test%2520code'
      vi.mocked(Linking.openURL)
        .mockRejectedValueOnce(new Error('Cannot open normalized URL'))
        .mockResolvedValueOnce(true)

      const onFailure = vi.fn()
      await handleOAuthUrl(doubleEncodedUrl, onFailure)

      expect(Linking.openURL).toHaveBeenNthCalledWith(
        1,
        'https://oauth.test.com/callback?code=test%20code'
      )
      expect(Linking.openURL).toHaveBeenNthCalledWith(2, doubleEncodedUrl)
      expect(onFailure).not.toHaveBeenCalled()
    })

    it('should report failure when both the normalized and original URLs fail to open', async () => {
      const doubleEncodedUrl = 'https://oauth.test.com/callback?code=test%2520code'
      vi.mocked(Linking.openURL).mockRejectedValue(new Error('Cannot open'))

      const onFailure = vi.fn()
      await handleOAuthUrl(doubleEncodedUrl, onFailure)

      expect(Linking.openURL).toHaveBeenCalledTimes(2)
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle URL objects', async () => {
      const urlObject = new URL('https://oauth.test.com/callback')
      await handleOAuthUrl(urlObject)
      expect(Linking.openURL).toHaveBeenCalledWith('https://oauth.test.com/callback')
    })
  })

  describe('WebView Platform-Specific Props', () => {
    beforeEach(() => {
      // Mock successful fetch for all WebView tests
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      // Reset capturedWebViewProps
      capturedWebViewProps = null
    })

    it('should have correct common props regardless of platform', async () => {
      Platform.OS = 'ios'

      const { rerender } = render(<QuilttConnector {...defaultProps} />)

      // Wait for pre-flight check to complete
      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      // Force a rerender to ensure props are captured
      rerender(<QuilttConnector {...defaultProps} />)

      // Verify all common props
      expect(capturedWebViewProps.testID).toBe('webview')
      expect(capturedWebViewProps.originWhitelist).toEqual(['*'])
      expect(capturedWebViewProps.source.uri).toContain('quiltt.app')
      expect(capturedWebViewProps.source.uri).toContain('theme_mode=dark')
      expect(capturedWebViewProps.javaScriptEnabled).toBe(true)
      expect(capturedWebViewProps.domStorageEnabled).toBe(true)
      expect(capturedWebViewProps.webviewDebuggingEnabled).toBe(true)
      expect(capturedWebViewProps.scrollEnabled).toBe(true)
      expect(capturedWebViewProps.showsVerticalScrollIndicator).toBe(false)
      expect(capturedWebViewProps.showsHorizontalScrollIndicator).toBe(false)
      expect(typeof capturedWebViewProps.onError).toBe('function')
      expect(typeof capturedWebViewProps.onHttpError).toBe('function')
      expect(typeof capturedWebViewProps.onMessage).toBe('function')
      expect(capturedWebViewProps.injectedJavaScriptBeforeContentLoaded).toContain(
        '__quilttStartupMonitorInstalled'
      )
    })

    it('should apply iOS specific props when platform is iOS', async () => {
      Platform.OS = 'ios'
      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        // Test iOS specific props
        expect(capturedWebViewProps.bounces).toBe(false)
        expect(capturedWebViewProps.decelerationRate).toBe('normal')
        expect(capturedWebViewProps.keyboardDisplayRequiresUserAction).toBe(false)
        expect(capturedWebViewProps.dataDetectorTypes).toBe('none')
        expect(capturedWebViewProps.allowsInlineMediaPlayback).toBe(true)
        expect(capturedWebViewProps.allowsBackForwardNavigationGestures).toBe(false)
        expect(capturedWebViewProps.startInLoadingState).toBe(false)
        expect(capturedWebViewProps.automaticallyAdjustContentInsets).toBe(false)
        expect(capturedWebViewProps.contentInsetAdjustmentBehavior).toBe('never')
        expect(capturedWebViewProps.scrollEventThrottle).toBe(16)

        // Ensure Android props are not present
        expect(capturedWebViewProps.androidLayerType).toBeUndefined()
        expect(capturedWebViewProps.cacheEnabled).toBeUndefined()
        expect(capturedWebViewProps.cacheMode).toBeUndefined()
        expect(capturedWebViewProps.overScrollMode).toBeUndefined()
      })
    })

    it('should apply Android specific props when platform is Android', async () => {
      Platform.OS = 'android'
      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        // Test Android specific props
        expect(capturedWebViewProps.androidLayerType).toBe('hardware')
        expect(capturedWebViewProps.cacheEnabled).toBe(true)
        expect(capturedWebViewProps.cacheMode).toBe('LOAD_DEFAULT')
        expect(capturedWebViewProps.overScrollMode).toBe('never')

        // Ensure iOS props are not present
        expect(capturedWebViewProps.bounces).toBeUndefined()
        expect(capturedWebViewProps.decelerationRate).toBeUndefined()
        expect(capturedWebViewProps.keyboardDisplayRequiresUserAction).toBeUndefined()
        expect(capturedWebViewProps.dataDetectorTypes).toBeUndefined()
        expect(capturedWebViewProps.allowsInlineMediaPlayback).toBeUndefined()
        expect(capturedWebViewProps.allowsBackForwardNavigationGestures).toBeUndefined()
        expect(capturedWebViewProps.startInLoadingState).toBeUndefined()
        expect(capturedWebViewProps.automaticallyAdjustContentInsets).toBeUndefined()
        expect(capturedWebViewProps.contentInsetAdjustmentBehavior).toBeUndefined()
        expect(capturedWebViewProps.scrollEventThrottle).toBeUndefined()
      })
    })

    it('should have a valid request handler function', async () => {
      Platform.OS = 'ios'
      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(typeof capturedWebViewProps.onShouldStartLoadWithRequest).toBe('function')
      })
    })
  })

  describe('Component Rendering', () => {
    it('should render LoadingScreen during pre-flight check', () => {
      fetchSpy.mockImplementationOnce(() => new Promise(() => {})) // Never resolving promise
      const { getByTestId } = render(<QuilttConnector {...defaultProps} />)
      expect(getByTestId('loading-screen')).toBeTruthy()
    })

    it('should render ErrorScreen on pre-flight check failure', async () => {
      // Mock fetch to reject with a specific error after retries
      fetchSpy.mockRejectedValue(new Error('Network Error'))

      const { getByTestId } = render(<QuilttConnector {...defaultProps} />)

      // Wait for error screen to appear and loading screen to disappear
      await waitFor(
        () => {
          expect(() => getByTestId('loading-screen')).toThrow()
          expect(getByTestId('error-screen')).toBeTruthy()
        },
        { timeout: 6000 }
      ) // Increased timeout to account for retries
    })

    it('should render ErrorScreen for a connector ID that does not resolve to a Quiltt host', async () => {
      const { getByTestId } = render(<QuilttConnector {...defaultProps} connectorId="evil.com/x" />)

      await waitFor(() => {
        expect(getByTestId('error-screen')).toBeTruthy()
        expect(() => getByTestId('loading-screen')).toThrow()
      })

      // The WebView must never be pointed at the unvalidated host.
      expect(capturedWebViewProps).toBeNull()
    })

    it('should render webview if pre-flight check succeeds', async () => {
      // Mock successful fetch response
      fetchSpy.mockResolvedValueOnce(createMockResponse(200, { ok: true }))

      const { getByTestId } = render(<QuilttConnector {...defaultProps} />)

      await waitFor(
        () => {
          expect(() => getByTestId('loading-screen')).toThrow()
        },
        { timeout: 1000 }
      )
    })

    it('should call onExitError when the error screen exit button is pressed', async () => {
      fetchSpy.mockRejectedValue(new Error('Network Error'))
      const onExitError = vi.fn()

      const { getByText } = render(<QuilttConnector {...defaultProps} onExitError={onExitError} />)

      await waitFor(() => expect(getByText('Exit')).toBeTruthy(), { timeout: 6000 })

      fireEvent.press(getByText('Exit'))

      expect(onExitError).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'test-connector',
          error: expect.objectContaining({ code: 'preflight_failed' }),
        })
      )
    })

    it('should not render once unmounted before the SDK agent resolves', async () => {
      const { unmount } = render(<QuilttConnector {...defaultProps} />)

      unmount()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(capturedWebViewProps).toBeNull()
    })
  })

  describe('Connector URL parameters', () => {
    it('should omit optional parameters when no theme or app launcher URL is configured', async () => {
      const { appLauncherUrl: _appLauncherUrl, themeMode: _themeMode, ...props } = defaultProps
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<QuilttConnector {...props} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const url = new URL(capturedWebViewProps.source.uri)
      expect(url.searchParams.get('mode')).toBe('webview')
      expect(url.searchParams.has('theme_mode')).toBe(false)
      expect(url.searchParams.has('oauth_redirect_url')).toBe(false)

      consoleLogSpy.mockRestore()
    })

    it('should append an app launcher URL that needs no encoding as-is', async () => {
      render(<QuilttConnector {...defaultProps} appLauncherUrl="com.example.app" />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const url = new URL(capturedWebViewProps.source.uri)
      expect(url.searchParams.get('oauth_redirect_url')).toBe('com.example.app')
    })
  })

  describe('URL Checking', () => {
    it('should handle routable URL successfully', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any

      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)
      expect(result).toEqual({ checked: true })
    })

    it('should retry on failure', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any

      fetchSpy
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(createMockResponse(200, { ok: true }))

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)
      expect(result).toEqual({ checked: true })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('should treat HTTP 400 as a preflight failure', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any

      fetchSpy.mockResolvedValue(createMockResponse(400, {}))
      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result.checked).toBe(true)
      expect(result.errorCode).toBe('preflight_failed')
      expect(result.statusCode).toBe(400)
      expect(mockErrorReporter.notify).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('should treat HTTP 404 as a preflight failure', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any

      fetchSpy.mockResolvedValue(createMockResponse(404, {}))
      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result.checked).toBe(true)
      expect(result.errorCode).toBe('preflight_failed')
      expect(result.statusCode).toBe(404)
      expect(mockErrorReporter.notify).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('should report error after max retries', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any

      fetchSpy.mockRejectedValue(new Error('Network Error'))

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result.checked).toBe(true)
      expect(result.error).toBeDefined()
      expect(mockErrorReporter.notify).toHaveBeenCalled()
    })

    it('should retry an unroutable status and report the error once retries are exhausted', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      fetchSpy.mockResolvedValue(createMockResponse(500, {}))

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(fetchSpy).toHaveBeenCalledTimes(4)
      expect(result.checked).toBe(true)
      expect(result.error).toContain('Response status: 500')
      expect(mockErrorReporter.notify).toHaveBeenCalledTimes(1)

      consoleErrorSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    it('should report a generic error when the request rejects without a value', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      fetchSpy.mockRejectedValue(undefined)

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result).toEqual(
        expect.objectContaining({
          checked: true,
          error: 'An error occurred while checking the Connector URL',
        })
      )
      expect(mockErrorReporter.notify).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          connectorUrl: 'http://test.com',
          errorCode: 'preflight_failed',
        })
      )

      consoleErrorSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    it('should surface a missing modulepreload asset as an asset failure', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any
      const failingAsset = 'https://cdn.quiltt.io/vite/assets/ScreenInspector--LK1I1V8.js'
      const html = `<!doctype html><html><head>
        <link rel="modulepreload" href="${failingAsset}">
        <script type="module" src="https://cdn.quiltt.io/vite/connector/application.js"></script>
      </head><body></body></html>`

      fetchSpy.mockImplementation((input, init) => {
        if (init?.method === 'HEAD') {
          const status = String(input) === failingAsset ? 404 : 200
          return Promise.resolve(new Response(null, { status }))
        }
        return Promise.resolve(
          new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
        )
      })

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result.checked).toBe(true)
      expect(result.errorCode).toBe('asset_load_failed')
      expect(result.statusCode).toBe(404)
      expect(result.failedUrl).toBe(failingAsset)
      expect(mockErrorReporter.notify).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ errorCode: 'asset_load_failed', failedUrl: failingAsset })
      )
    })
  })

  describe('OAuth Handling', () => {
    it('should handle OAuth redirection', async () => {
      const url = new URL('https://oauth.test.com/callback')
      await handleOAuthUrl(url)
      expect(Linking.openURL).toHaveBeenCalledWith(url.toString())
    })
  })

  describe('QuilttConnectorHandle - handleOAuthCallback', () => {
    let mockInjectJavaScript: any

    beforeEach(() => {
      capturedWebViewProps = null
      capturedWebViewRef = null
      mockInjectJavaScript = vi.fn()
    })

    it('should expose handleOAuthCallback method via ref', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()
      render(<QuilttConnector {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      // Verify ref is accessible and method exists
      expect(ref.current).toBeTruthy()
      expect(typeof ref.current?.handleOAuthCallback).toBe('function')
    })

    it('should construct and inject correct JavaScript message with OAuth parameters', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()

      render(<QuilttConnector {...defaultProps} ref={ref} />)

      //Wait for props to be captured and the webViewRef to be set
      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      // Give React a moment to set the ref
      await waitFor(() => {
        expect(capturedWebViewRef).not.toBeNull()
      })

      // Mock the WebView instance and set it on the captured ref
      const mockWebView = { injectJavaScript: mockInjectJavaScript }

      // capturedWebViewRef is the ref object from useRef inside the component
      // We need to set its `current` property to our mock WebView
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      // Call handleOAuthCallback with a test URL containing OAuth parameters
      const callbackUrl =
        'https://oauth.test.com/callback?code=test-code&state=test-state&institution_id=test-bank'
      ref.current?.handleOAuthCallback(callbackUrl)

      // Verify injectJavaScript was called
      expect(mockInjectJavaScript).toHaveBeenCalled()

      // Get the injected script
      const injectedScript = mockInjectJavaScript.mock.calls[0][0]

      // Verify the script contains the expected structure
      expect(injectedScript).toContain('window.postMessage')
      expect(injectedScript).toContain('"source":"quiltt"')
      expect(injectedScript).toContain('"type":"OAuthCallback"')
      expect(injectedScript).toContain(callbackUrl)
      expect(injectedScript).toContain('"code":"test-code"')
      expect(injectedScript).toContain('"state":"test-state"')
      expect(injectedScript).toContain('"institution_id":"test-bank"')
    })

    it('should extract OAuth parameters correctly from callback URL', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()

      render(<QuilttConnector {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewRef).toBeTruthy()
      })

      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      // Test with multiple parameters
      const callbackUrl =
        'https://oauth.test.com/callback?code=abc123&state=xyz789&error=access_denied&error_description=User+cancelled'
      ref.current?.handleOAuthCallback(callbackUrl)

      const injectedScript = mockInjectJavaScript.mock.calls[0][0]

      // Verify all parameters are extracted
      expect(injectedScript).toContain('"code":"abc123"')
      expect(injectedScript).toContain('"state":"xyz789"')
      expect(injectedScript).toContain('"error":"access_denied"')
      // Note: URL searchParams automatically decodes parameters, so "User+cancelled" becomes "User cancelled"
      expect(injectedScript).toContain('"error_description":"User cancelled"')
    })

    it('should handle invalid URL gracefully', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<QuilttConnector {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      // Call with an invalid URL
      const invalidUrl = 'not-a-valid-url'

      // Should not throw
      expect(() => {
        ref.current?.handleOAuthCallback(invalidUrl)
      }).not.toThrow()

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error handling OAuth callback:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle callback with no parameters', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()

      render(<QuilttConnector {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewRef).toBeTruthy()
      })

      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      // Call with URL with no parameters
      const callbackUrl = 'https://oauth.test.com/callback'
      ref.current?.handleOAuthCallback(callbackUrl)

      const injectedScript = mockInjectJavaScript.mock.calls[0][0]

      // Should still construct proper message with empty params
      expect(injectedScript).toContain('"source":"quiltt"')
      expect(injectedScript).toContain('"type":"OAuthCallback"')
      expect(injectedScript).toContain(callbackUrl)
      expect(injectedScript).toContain('"params":{}')
    })

    it('should handle special characters in OAuth parameters', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()

      render(<QuilttConnector {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewRef).toBeTruthy()
      })

      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      // Test with special characters that need encoding
      const callbackUrl = 'https://oauth.test.com/callback?message=Hello%20World&special=%26%3D%3F'
      ref.current?.handleOAuthCallback(callbackUrl)

      const injectedScript = mockInjectJavaScript.mock.calls[0][0]

      // Verify parameters are included
      // Note: URL searchParams automatically decodes parameters
      expect(injectedScript).toContain('"message":"Hello World"')
      expect(injectedScript).toContain('"special":"&=?"')
    })

    it('should log success message when injecting JavaScript', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const ref = createRef<QuilttConnectorHandle>()
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<QuilttConnector {...defaultProps} ref={ref} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewRef).toBeTruthy()
      })

      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      const callbackUrl = 'https://oauth.test.com/callback?code=test'
      ref.current?.handleOAuthCallback(callbackUrl)

      // Verify the injected script contains success logging
      const injectedScript = mockInjectJavaScript.mock.calls[0][0]
      expect(injectedScript).toContain("console.log('OAuth callback message sent to connector')")

      consoleLogSpy.mockRestore()
    })
  })

  describe('Event Handling via requestHandler', () => {
    let mockInjectJavaScript: any

    beforeEach(() => {
      capturedWebViewProps = null
      capturedWebViewRef = null
      mockInjectJavaScript = vi.fn()
    })

    it('should handle ExitAbort event', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const onExitAbort = vi.fn()
      const onExit = vi.fn()
      const onEvent = vi.fn()

      render(
        <QuilttConnector
          {...defaultProps}
          onExitAbort={onExitAbort}
          onExit={onExit}
          onEvent={onEvent}
        />
      )

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewProps.onShouldStartLoadWithRequest).toBeDefined()
      })

      // Mock the WebView ref and injectJavaScript
      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      // Simulate ExitAbort event
      const result = requestHandler({
        url: 'quilttconnector://ExitAbort?connectorId=test-connector',
      })

      // Should return false (not render)
      expect(result).toBe(false)

      // Wait for requestAnimationFrame callback
      await waitFor(() => {
        expect(onExitAbort).toHaveBeenCalledWith({ connectorId: 'test-connector' })
        expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitAbort, {
          connectorId: 'test-connector',
        })
        expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitAbort, {
          connectorId: 'test-connector',
        })
        // Should clear localStorage
        expect(mockInjectJavaScript).toHaveBeenCalledWith('localStorage.clear();')
      })
    })

    it('should handle ExitError event', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const onExitError = vi.fn()
      const onExit = vi.fn()
      const onEvent = vi.fn()

      render(
        <QuilttConnector
          {...defaultProps}
          onExitError={onExitError}
          onExit={onExit}
          onEvent={onEvent}
        />
      )

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      // Mock the WebView ref
      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://ExitError?connectorId=test-connector',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(onExitError).toHaveBeenCalledWith({ connectorId: 'test-connector' })
        expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, {
          connectorId: 'test-connector',
        })
        expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, {
          connectorId: 'test-connector',
        })
        expect(mockInjectJavaScript).toHaveBeenCalledWith('localStorage.clear();')
      })
    })

    it('should handle ExitSuccess event', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const onExitSuccess = vi.fn()
      const onExit = vi.fn()
      const onEvent = vi.fn()

      render(
        <QuilttConnector
          {...defaultProps}
          onExitSuccess={onExitSuccess}
          onExit={onExit}
          onEvent={onEvent}
        />
      )

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://ExitSuccess?connectionId=conn-123&profileId=prof-456',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(onExitSuccess).toHaveBeenCalledWith({
          connectorId: 'test-connector',
          connectionId: 'conn-123',
          profileId: 'prof-456',
        })
        expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitSuccess, {
          connectorId: 'test-connector',
          connectionId: 'conn-123',
          profileId: 'prof-456',
        })
        expect(mockInjectJavaScript).toHaveBeenCalledWith('localStorage.clear();')
      })
    })

    it('should handle Authenticate event', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Authenticate?connectorId=test-connector',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith('Event: Authenticate')
      })

      consoleLogSpy.mockRestore()
    })

    it('should handle Navigate event with encoded URL', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const navigateUrl = encodeURIComponent('https://oauth.example.com/callback?code=test123')
      const result = requestHandler({
        url: `quilttconnector://Navigate?url=${navigateUrl}`,
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled()
      })
    })

    it('should handle Navigate event with a double-encoded URL', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Navigate?url=https%253A%252F%252Foauth.example.com%252Fcallback',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('https://oauth.example.com/callback')
      })
    })

    it('should handle Navigate event with non-encoded URL', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Navigate?url=https://oauth.example.com/callback',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalled()
      })
    })

    it('should exit with an error when Navigate arrives without an app launcher URL', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const onExitError = vi.fn()
      const onExit = vi.fn()
      const onEvent = vi.fn()
      const { appLauncherUrl: _appLauncherUrl, ...props } = defaultProps

      render(
        <QuilttConnector {...props} onExitError={onExitError} onExit={onExit} onEvent={onEvent} />
      )

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Navigate?url=https%3A%2F%2Foauth.example.com%2Fcallback',
      })

      expect(result).toBe(false)
      expect(Linking.openURL).not.toHaveBeenCalled()

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'OAuth redirect requires `appLauncherUrl` to be configured.'
        )
        expect(onExitError).toHaveBeenCalledWith({ connectorId: 'test-connector' })
        expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, {
          connectorId: 'test-connector',
        })
        expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, {
          connectorId: 'test-connector',
        })
      })

      consoleErrorSpy.mockRestore()
    })

    it('should report an exit error when a Navigate URL cannot be decoded or opened', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(Linking.openURL).mockRejectedValue(new Error('Cannot open'))

      const onExitError = vi.fn()
      const onExit = vi.fn()
      const onEvent = vi.fn()

      render(
        <QuilttConnector
          {...defaultProps}
          onExitError={onExitError}
          onExit={onExit}
          onEvent={onEvent}
        />
      )

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Navigate?url=%25E0%25A4%25A',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Navigate URL decoding failed, using original')
        expect(onExitError).toHaveBeenCalledWith({ connectorId: 'test-connector' })
        expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, {
          connectorId: 'test-connector',
        })
        expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, {
          connectorId: 'test-connector',
        })
      })

      consoleErrorSpy.mockRestore()
    })

    it('should let URLs that are not connector events load in the WebView', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const result = capturedWebViewProps.onShouldStartLoadWithRequest({
        url: 'https://example.com/page',
      })

      expect(result).toBe(true)
      expect(Linking.openURL).not.toHaveBeenCalled()
    })

    it('should handle Navigate event with missing URL parameter', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Navigate',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Navigate URL missing from request')
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle unhandled event types', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://UnknownEvent?connectorId=test-connector',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith('Unhandled event: UnknownEvent')
      })

      consoleLogSpy.mockRestore()
    })

    it('should parse metadata with profileId, connectionId, and connectorSession', async () => {
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      const onLoad = vi.fn()

      render(<QuilttConnector {...defaultProps} onLoad={onLoad} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      const requestHandler = capturedWebViewProps.onShouldStartLoadWithRequest

      const result = requestHandler({
        url: 'quilttconnector://Load?profileId=prof-123&connectionId=conn-456&connectorSession=session-789',
      })

      expect(result).toBe(false)

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith({
          connectorId: 'test-connector',
          profileId: 'prof-123',
          connectionId: 'conn-456',
          connectorSession: { id: 'session-789' },
        })
      })
    })
  })

  describe('onLoadEnd callback', () => {
    let mockInjectJavaScript: any

    beforeEach(() => {
      capturedWebViewProps = null
      capturedWebViewRef = null
      mockInjectJavaScript = vi.fn()
    })

    it('should inject header scroll disable script on iOS when onLoadEnd is called', async () => {
      Platform.OS = 'ios'
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewProps.onLoadEnd).toBeDefined()
      })

      // Mock the WebView ref
      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      // Call onLoadEnd
      capturedWebViewProps.onLoadEnd()

      // Verify that JavaScript was injected to disable header scrolling
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining("header.style.position = 'fixed'")
      )
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining("header.style.top = '0'")
      )
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining("header.style.zIndex = '1000'")
      )
    })

    it('should not inject header scroll script on Android when onLoadEnd is called', async () => {
      Platform.OS = 'android'
      fetchSpy.mockResolvedValue(createMockResponse(200, { ok: true }))

      render(<QuilttConnector {...defaultProps} />)

      await waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
        expect(capturedWebViewProps.onLoadEnd).toBeDefined()
      })

      // Mock the WebView ref
      const mockWebView = { injectJavaScript: mockInjectJavaScript }
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = mockWebView
      }

      // Call onLoadEnd
      capturedWebViewProps.onLoadEnd()

      // Verify that JavaScript was NOT injected on Android
      expect(mockInjectJavaScript).not.toHaveBeenCalled()
    })
  })

  describe('Startup failure surfacing', () => {
    beforeEach(() => {
      Platform.OS = 'ios'
    })

    const waitForWebView = () =>
      waitFor(() => {
        expect(capturedWebViewProps).toBeTruthy()
      })

    const setWebViewRef = () => {
      const injectJavaScript = vi.fn()
      if (capturedWebViewRef && typeof capturedWebViewRef === 'object') {
        ;(capturedWebViewRef as any).current = { injectJavaScript }
      }
      return injectJavaScript
    }

    it('shows an error and notifies terminally when a declared asset is missing', async () => {
      mockConnectorDocument(FAILING_ASSET_URL)

      const onEvent = vi.fn()
      const onExit = vi.fn()
      const onExitError = vi.fn()
      const { getByText } = render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onExit={onExit}
          onExitError={onExitError}
        />
      )

      await waitFor(() => expect(getByText('Try again')).toBeTruthy(), { timeout: 3000 })

      const expectedMetadata = expect.objectContaining({
        connectorId: 'test-connector',
        error: expect.objectContaining({
          code: 'asset_load_failed',
          statusCode: 404,
          url: FAILING_ASSET_URL,
        }),
      })

      expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expectedMetadata)
      expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expectedMetadata)
      expect(onExitError).toHaveBeenCalledWith(expectedMetadata)
    })

    it('re-runs preflight when the user retries a confirmed asset failure', async () => {
      mockConnectorDocument(FAILING_ASSET_URL)

      const { getByText, queryByTestId } = render(<QuilttConnector {...defaultProps} />)
      await waitFor(() => expect(getByText('Try again')).toBeTruthy(), { timeout: 3000 })

      mockConnectorDocument()
      fireEvent.press(getByText('Try again'))

      await waitFor(
        () => {
          expect(queryByTestId('error-screen')).toBeNull()
          expect(capturedWebViewProps).toBeTruthy()
        },
        { timeout: 3000 }
      )
    })

    it('surfaces a WebView load error and notifies on Exit', async () => {
      const onEvent = vi.fn()
      const onExit = vi.fn()
      const onExitError = vi.fn()
      const { getByText } = render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onExit={onExit}
          onExitError={onExitError}
        />
      )

      await waitForWebView()
      act(() => {
        capturedWebViewProps.onError({
          nativeEvent: {
            code: -1,
            description: 'The WebView failed to load.',
            url: 'https://test-connector.quiltt.app/',
          },
        })
      })

      await waitFor(() => expect(getByText('Exit')).toBeTruthy())

      expect(onEvent).toHaveBeenCalledWith(
        ConnectorSDKEventType.ExitError,
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'webview_failed',
            message: 'The WebView failed to load.',
          }),
        })
      )
      expect(onExit).not.toHaveBeenCalled()

      fireEvent.press(getByText('Exit'))

      expect(onExit).toHaveBeenCalledWith(
        ConnectorSDKEventType.ExitError,
        expect.objectContaining({
          error: expect.objectContaining({ code: 'webview_failed' }),
        })
      )
      expect(onExitError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'webview_failed' }),
        })
      )
    })

    it('surfaces a main-frame HTTP error', async () => {
      const onEvent = vi.fn()
      const { getByText } = render(<QuilttConnector {...defaultProps} onEvent={onEvent} />)

      await waitForWebView()
      act(() => {
        capturedWebViewProps.onHttpError({
          nativeEvent: {
            statusCode: 503,
            description: 'Service Unavailable',
            url: 'https://test-connector.quiltt.app/',
          },
        })
      })

      await waitFor(() => expect(getByText('Exit')).toBeTruthy())
      expect(onEvent).toHaveBeenCalledWith(
        ConnectorSDKEventType.ExitError,
        expect.objectContaining({
          error: expect.objectContaining({ code: 'webview_failed', statusCode: 503 }),
        })
      )
    })

    it('turns a pre-mount asset error reported by the page into a terminal ExitError', async () => {
      const onEvent = vi.fn()
      const onExit = vi.fn()
      const onExitError = vi.fn()
      const { getByText } = render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onExit={onExit}
          onExitError={onExitError}
        />
      )

      await waitForWebView()
      const assetUrl = 'https://cdn.quiltt.io/vite/assets/chunk-missing.js'

      act(() => {
        capturedWebViewProps.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'quiltt',
              type: 'startup_error',
              code: 'asset_load_failed',
              url: assetUrl,
              message: 'A required Connector asset could not be loaded.',
            }),
          },
        })
      })

      await waitFor(() => expect(getByText('Try again')).toBeTruthy())

      const expectedMetadata = expect.objectContaining({
        error: expect.objectContaining({ code: 'asset_load_failed', url: assetUrl }),
      })
      expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expectedMetadata)
      expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expectedMetadata)
      expect(onExitError).toHaveBeenCalledWith(expectedMetadata)
    })

    it('turns a platform-sent asset ExitError into a terminal failure with metadata', async () => {
      const onEvent = vi.fn()
      const onExit = vi.fn()
      const onExitError = vi.fn()
      const { getByText } = render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onExit={onExit}
          onExitError={onExitError}
        />
      )

      await waitForWebView()
      const assetUrl = 'https://cdn.quiltt.io/vite/assets/chunk-missing.js'

      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: `quilttconnector://ExitError?reason=asset_load_failed&url=${encodeURIComponent(assetUrl)}`,
        })
      })

      await waitFor(() => expect(getByText('Try again')).toBeTruthy())

      const expectedMetadata = expect.objectContaining({
        connectorId: 'test-connector',
        error: expect.objectContaining({ code: 'asset_load_failed', url: assetUrl }),
      })
      expect(onEvent).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expectedMetadata)
      expect(onExit).toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expectedMetadata)
      expect(onExitError).toHaveBeenCalledWith(expectedMetadata)
    })

    it('does not fire terminal callbacks twice when the page also signals the failure', async () => {
      const onExitError = vi.fn()
      const onExit = vi.fn()
      const { getByText } = render(
        <QuilttConnector {...defaultProps} onExit={onExit} onExitError={onExitError} />
      )

      await waitForWebView()
      const assetUrl = 'https://cdn.quiltt.io/vite/assets/chunk-missing.js'

      act(() => {
        capturedWebViewProps.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'quiltt',
              type: 'startup_error',
              code: 'asset_load_failed',
              url: assetUrl,
              message: 'A required Connector asset could not be loaded.',
            }),
          },
        })
      })

      await waitFor(() => expect(getByText('Try again')).toBeTruthy())

      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: `quilttconnector://ExitError?reason=asset_load_failed&url=${encodeURIComponent(assetUrl)}`,
        })
      })
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onExitError).toHaveBeenCalledTimes(1)
      expect(onExit).toHaveBeenCalledTimes(1)
    })

    it('ignores an asset error reported after the Load handshake', async () => {
      const onExitError = vi.fn()
      const onLoad = vi.fn()
      render(<QuilttConnector {...defaultProps} onExitError={onExitError} onLoad={onLoad} />)

      await waitForWebView()
      setWebViewRef()

      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: 'quilttconnector://Load?connectorId=test-connector',
        })
      })
      await waitFor(() => expect(onLoad).toHaveBeenCalled())

      act(() => {
        capturedWebViewProps.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'quiltt',
              type: 'startup_error',
              code: 'asset_load_failed',
              url: 'https://cdn.quiltt.io/vite/assets/chunk-late.js',
              message: 'Late failure',
            }),
          },
        })
      })
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(onExitError).not.toHaveBeenCalled()
    })

    it('shows a timeout without closing the Connector, then notifies on Exit', async () => {
      const onEvent = vi.fn()
      const onExit = vi.fn()
      const onExitError = vi.fn()
      const { getByText } = render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onExit={onExit}
          onExitError={onExitError}
          startupTimeoutMs={50}
        />
      )

      await waitForWebView()
      await waitFor(() => expect(getByText('Exit')).toBeTruthy(), { timeout: 2000 })

      expect(onEvent).toHaveBeenCalledWith(
        ConnectorSDKEventType.ExitError,
        expect.objectContaining({
          error: expect.objectContaining({ code: 'startup_timeout' }),
        })
      )
      expect(onExit).not.toHaveBeenCalled()
      expect(onExitError).not.toHaveBeenCalled()

      fireEvent.press(getByText('Exit'))

      expect(onExit).toHaveBeenCalledWith(
        ConnectorSDKEventType.ExitError,
        expect.objectContaining({
          error: expect.objectContaining({ code: 'startup_timeout' }),
        })
      )
      expect(onExitError).toHaveBeenCalled()
    })

    it('reports a booted page whose Load handshake was lost', async () => {
      render(<QuilttConnector {...defaultProps} startupTimeoutMs={50} />)

      await waitForWebView()
      await waitFor(() => expect(notifyMock).toHaveBeenCalled(), { timeout: 2000 })
      setWebViewRef()

      act(() => {
        capturedWebViewProps.onMessage({
          nativeEvent: {
            data: JSON.stringify({ source: 'quiltt', type: 'startup_state', booted: true }),
          },
        })
      })

      await waitFor(() =>
        expect(
          notifyMock.mock.calls.some(
            ([error]) =>
              error instanceof Error &&
              error.message === 'Connector booted but the Load handshake was not received'
          )
        ).toBe(true)
      )
    })

    it('recovers when Load arrives after the timeout screen is showing', async () => {
      const onLoad = vi.fn()
      const onExitError = vi.fn()
      const { getByText, queryByTestId } = render(
        <QuilttConnector
          {...defaultProps}
          onLoad={onLoad}
          onExitError={onExitError}
          startupTimeoutMs={50}
        />
      )

      await waitForWebView()
      await waitFor(() => expect(getByText('Exit')).toBeTruthy(), { timeout: 2000 })
      setWebViewRef()

      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: 'quilttconnector://Load?connectorId=test-connector',
        })
      })

      await waitFor(() => expect(onLoad).toHaveBeenCalled())
      expect(queryByTestId('error-screen')).toBeNull()
      expect(onExitError).not.toHaveBeenCalled()
    })

    it('does not time out once Load has arrived', async () => {
      const onEvent = vi.fn()
      const onLoad = vi.fn()
      render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onLoad={onLoad}
          startupTimeoutMs={500}
        />
      )

      await waitForWebView()
      setWebViewRef()

      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: 'quilttconnector://Load?connectorId=test-connector',
        })
      })
      await waitFor(() => expect(onLoad).toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(onEvent).not.toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expect.anything())
    })

    it('does not synthesize an error for an ordinary early dismissal', async () => {
      const onEvent = vi.fn()
      const onExitAbort = vi.fn()
      render(
        <QuilttConnector
          {...defaultProps}
          onEvent={onEvent}
          onExitAbort={onExitAbort}
          startupTimeoutMs={500}
        />
      )

      await waitForWebView()
      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: 'quilttconnector://ExitAbort?connectorId=test-connector',
        })
      })
      await waitFor(() => expect(onExitAbort).toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(onEvent).not.toHaveBeenCalledWith(ConnectorSDKEventType.ExitError, expect.anything())
    })

    it('clears the watchdog on unmount', async () => {
      const onEvent = vi.fn()
      const { unmount } = render(
        <QuilttConnector {...defaultProps} onEvent={onEvent} startupTimeoutMs={500} />
      )

      await waitForWebView()
      unmount()
      await new Promise((resolve) => setTimeout(resolve, 600))

      expect(onEvent).not.toHaveBeenCalled()
    })

    it('covers the WebView with a loading overlay until Load arrives', async () => {
      const onLoad = vi.fn()
      const { getByTestId, queryByTestId } = render(
        <QuilttConnector {...defaultProps} onLoad={onLoad} />
      )

      await waitForWebView()
      expect(getByTestId('loading-overlay')).toBeTruthy()
      setWebViewRef()

      act(() => {
        capturedWebViewProps.onShouldStartLoadWithRequest({
          url: 'quilttconnector://Load?connectorId=test-connector',
        })
      })

      await waitFor(() => expect(onLoad).toHaveBeenCalled())
      expect(queryByTestId('loading-overlay')).toBeNull()
    })
  })
})
