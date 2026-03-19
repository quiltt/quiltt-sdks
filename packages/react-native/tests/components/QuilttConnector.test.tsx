import { createRef, forwardRef } from 'react'
import { Linking, Platform } from 'react-native'

import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react-native'

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

// Mock ErrorReporter before importing QuilttConnector
vi.mock('@/utils/error/ErrorReporter', () => ({
  ErrorReporter: class {
    notify() {
      return Promise.resolve()
    }
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

  describe('handleOAuthUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should handle null or undefined URLs', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      handleOAuthUrl(null)
      expect(consoleErrorSpy).toHaveBeenCalledWith('OAuth URL handling error')

      handleOAuthUrl(undefined)
      expect(consoleErrorSpy).toHaveBeenCalledWith('OAuth URL handling error')

      consoleErrorSpy.mockRestore()
    })

    it('should handle empty string URLs', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      handleOAuthUrl('')
      expect(consoleErrorSpy).toHaveBeenCalledWith('OAuth URL handling error')

      handleOAuthUrl('   ')
      expect(consoleErrorSpy).toHaveBeenCalledWith('OAuth URL handling error')

      consoleErrorSpy.mockRestore()
    })

    it('should normalize double-encoded URLs', () => {
      const doubleEncodedUrl = 'https://oauth.test.com/callback?code=test%2520code'
      handleOAuthUrl(doubleEncodedUrl)
      expect(Linking.openURL).toHaveBeenCalled()
    })

    it('should handle URL objects', () => {
      const urlObject = new URL('https://oauth.test.com/callback')
      handleOAuthUrl(urlObject)
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
      expect(capturedWebViewProps.javaScriptEnabled).toBe(true)
      expect(capturedWebViewProps.domStorageEnabled).toBe(true)
      expect(capturedWebViewProps.webviewDebuggingEnabled).toBe(true)
      expect(capturedWebViewProps.scrollEnabled).toBe(true)
      expect(capturedWebViewProps.showsVerticalScrollIndicator).toBe(false)
      expect(capturedWebViewProps.showsHorizontalScrollIndicator).toBe(false)
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
        expect(capturedWebViewProps.startInLoadingState).toBe(true)
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
        expect(capturedWebViewProps.cacheMode).toBe('LOAD_CACHE_ELSE_NETWORK')
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
        { timeout: 3000 }
      ) // Increased timeout to account for retries
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

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter, 0)
      expect(result).toEqual({ checked: true })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('should handle 400 status code', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      fetchSpy.mockResolvedValue(createMockResponse(400, {}))
      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result).toEqual({ checked: true })
      expect(consoleLogSpy).toHaveBeenCalledWith('Invalid configuration')

      consoleLogSpy.mockRestore()
    })

    it('should handle 404 status code', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      fetchSpy.mockResolvedValue(createMockResponse(404, {}))
      const result = await checkConnectorUrl('http://test.com', mockErrorReporter)

      expect(result).toEqual({ checked: true })
      expect(consoleErrorSpy).toHaveBeenCalledWith('Connector not found')

      consoleErrorSpy.mockRestore()
    })

    it('should report error after max retries', async () => {
      const mockErrorReporter = {
        notify: vi.fn().mockResolvedValue(undefined),
      } as any

      fetchSpy.mockRejectedValue(new Error('Network Error'))

      const result = await checkConnectorUrl('http://test.com', mockErrorReporter, 0)

      expect(result.checked).toBe(true)
      expect(result.error).toBeDefined()
      expect(mockErrorReporter.notify).toHaveBeenCalled()
    })
  })

  describe('OAuth Handling', () => {
    it('should handle OAuth redirection', () => {
      const url = new URL('https://oauth.test.com/callback')
      handleOAuthUrl(url)
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
})
