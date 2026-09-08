import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Linking, Platform, StyleSheet } from 'react-native'

import type { ConnectorSDKCallbackMetadata, ConnectorSDKCallbacks } from '@quiltt/react'
import { ConnectorSDKEventType, useQuilttSession } from '@quiltt/react'
import { URL } from 'react-native-url-polyfill' // https://github.com/facebook/react-native/issues/16434
import { WebView } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'

import {
  ErrorReporter,
  getErrorMessage,
  getSDKAgent,
  isEncoded,
  normalizeUrlEncoding,
  smartEncodeURIComponent,
} from '@/utils'
import { version } from '@/version'

import { AndroidSafeAreaView } from './AndroidSafeAreaView'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'

const PREFLIGHT_RETRY_COUNT = 3

export type PreFlightCheck = {
  checked: boolean
  error?: string
}

const parseMetadata = (url: URL, connectorId: string): ConnectorSDKCallbackMetadata => {
  const metadata: ConnectorSDKCallbackMetadata = {
    connectorId: url.searchParams.get('connectorId') ?? connectorId,
  }

  const profileId = url.searchParams.get('profileId')
  if (profileId) metadata.profileId = profileId

  const connectionId = url.searchParams.get('connectionId')
  if (connectionId) metadata.connectionId = connectionId

  const connectorSessionId = url.searchParams.get('connectorSession')
  if (connectorSessionId) metadata.connectorSession = { id: connectorSessionId }

  return metadata
}

export const checkConnectorUrl = async (
  connectorUrl: string,
  errorReporter: ErrorReporter,
  retryCount = 0
): Promise<PreFlightCheck> => {
  let responseStatus: number | undefined
  try {
    const response = await fetch(connectorUrl)

    switch (response.status) {
      case 200:
        return { checked: true }

      case 400:
        console.log('Invalid configuration')
        return { checked: true }

      case 404:
        console.error('Connector not found')
        return { checked: true }

      default:
        throw new Error('Connector URL is not routable.')
    }
  } catch (error) {
    // Log error for debugging
    console.error(error)

    // Try again
    if (retryCount < PREFLIGHT_RETRY_COUNT) {
      const delay = 50 * 2 ** retryCount
      await new Promise((resolve) => setTimeout(resolve, delay))
      console.log(`Retrying connection... Attempt ${retryCount + 1}`)
      return checkConnectorUrl(connectorUrl, errorReporter, retryCount + 1)
    }

    // Report error after retries exhausted
    const errorMessage = getErrorMessage(responseStatus, error as Error)
    const errorToSend = (error as Error) || new Error(errorMessage)
    const context = { connectorUrl, responseStatus }
    await errorReporter.notify(errorToSend, context)

    // Return errored preflight check
    return { checked: true, error: errorMessage }
  }
}

/**
 * Handle opening OAuth URLs with proper encoding detection and normalization
 */
export const handleOAuthUrl = async (
  oauthUrl: URL | string | null | undefined,
  onFailure?: (error: Error) => void
) => {
  // Throw error if oauthUrl is null or undefined
  if (oauthUrl == null) {
    onFailure?.(new Error('OAuth URL missing'))
    return
  }

  // Convert to string if it's a URL object
  const urlString = oauthUrl.toString()

  // Throw error if the resulting string is empty
  if (!urlString || urlString.trim() === '') {
    onFailure?.(new Error('Empty OAuth URL'))
    return
  }

  // Normalize the URL encoding
  const normalizedUrl = normalizeUrlEncoding(urlString)

  try {
    // Open the normalized URL directly without a preflight check, since
    // `openURL()` reports success/failure authoritatively.
    await Linking.openURL(normalizedUrl)
  } catch (error) {
    console.error('OAuth URL handling error:', error)

    // Only retry with the original URL if normalization changed it AND it is
    // still a well-formed HTTPS URL. Opening a double-encoded value (e.g.
    // "https%3A%2F%2F…") has no resolvable scheme and is guaranteed to fail.
    if (urlString !== normalizedUrl && /^https:\/\//i.test(urlString)) {
      try {
        console.log('Attempting fallback OAuth opening')
        await Linking.openURL(urlString)
        return // fallback succeeded
      } catch (fallbackError) {
        console.error('Fallback OAuth opening failed:', fallbackError)
      }
    }

    // Both attempts failed — notify via callback
    const err = error instanceof Error ? error : new Error(String(error))
    onFailure?.(err)
  }
}

export type QuilttConnectorHandle = {
  handleOAuthCallback: (url: string) => void
}

type QuilttConnectorProps = {
  connectorId: string
  connectionId?: string
  institution?: string
  /**
   * The theme mode for the Connector UI.
   * - 'light': Force light theme (default)
   * - 'dark': Force dark theme
   * - 'auto': Follow device/system preference
   */
  themeMode?: 'light' | 'dark' | 'auto'
  /**
   * The app launcher URL for mobile OAuth flows.
   * This URL should be a Universal Link (iOS) or App Link (Android) that redirects back to your app.
   */
  appLauncherUrl?: string
  testId?: string
} & ConnectorSDKCallbacks

const QuilttConnector = forwardRef<QuilttConnectorHandle, QuilttConnectorProps>(
  (
    {
      connectorId,
      connectionId,
      institution,
      themeMode,
      appLauncherUrl,
      onEvent,
      onLoad,
      onExit,
      onExitSuccess,
      onExitAbort,
      onExitError,
      testId,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null)
    const { session } = useQuilttSession()
    const [preFlightCheck, setPreFlightCheck] = useState<PreFlightCheck>({ checked: false })
    const [errorReporter, setErrorReporter] = useState<ErrorReporter | null>(null)
    const [sdkAgent, setSDKAgent] = useState<string>('')

    const effectiveAppLauncherUrl = appLauncherUrl ?? ''

    // Initialize error reporter and SDK Agent
    useEffect(() => {
      let mounted = true
      const init = async () => {
        const sdkAgent = await getSDKAgent(version)
        if (mounted) {
          setSDKAgent(sdkAgent)
          setErrorReporter(new ErrorReporter(sdkAgent))
        }
      }
      init()

      return () => {
        mounted = false
      }
    }, [])

    // Script to disable scrolling on header
    const disableHeaderScrollScript = `
    (function() {
      const header = document.querySelector('header');
      if (header) {
        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '1000';
      }
    })();
  `

    const onLoadEnd = useCallback(() => {
      if (Platform.OS === 'ios') {
        webViewRef.current?.injectJavaScript(disableHeaderScrollScript)
      }
    }, [])

    // Ensure effectiveAppLauncherUrl is encoded properly - only once
    const safeAppLauncherUrl = useMemo(() => {
      return smartEncodeURIComponent(effectiveAppLauncherUrl)
    }, [effectiveAppLauncherUrl])

    const hasConfiguredAppLauncherUrl = useMemo(() => {
      return effectiveAppLauncherUrl.trim().length > 0
    }, [effectiveAppLauncherUrl])

    const connectorUrl = useMemo(() => {
      if (!sdkAgent) return null

      const url = new URL(`https://${connectorId}.quiltt.app`)

      // For normal parameters, just append them directly
      url.searchParams.append('mode', 'webview')
      url.searchParams.append('agent', sdkAgent)

      if (themeMode) {
        url.searchParams.append('theme_mode', themeMode)
      }

      if (hasConfiguredAppLauncherUrl) {
        // For the oauth_redirect_url, we need to be careful
        // If it's already encoded, we need to decode it once to prevent
        // the automatic encoding that happens with searchParams.append
        if (isEncoded(safeAppLauncherUrl)) {
          const decodedOnce = decodeURIComponent(safeAppLauncherUrl)
          url.searchParams.append('oauth_redirect_url', decodedOnce)
        } else {
          url.searchParams.append('oauth_redirect_url', safeAppLauncherUrl)
        }
      }

      return url.toString()
    }, [connectorId, hasConfiguredAppLauncherUrl, safeAppLauncherUrl, sdkAgent, themeMode])

    useEffect(() => {
      if (preFlightCheck.checked || !connectorUrl || !errorReporter) return
      const fetchDataAndSetState = async () => {
        const connectorUrlStatus = await checkConnectorUrl(connectorUrl, errorReporter)
        setPreFlightCheck(connectorUrlStatus)
      }
      fetchDataAndSetState()
    }, [connectorUrl, preFlightCheck, errorReporter])

    const initInjectedJavaScript = useCallback(() => {
      const script = `\
      const options = {\
        source: 'quiltt',\
        type: 'Options',\
        token: '${session?.token}',\
        connectorId: '${connectorId}',\
        connectionId: '${connectionId}',\
        institution: '${institution}', \
      };\
      const compactedOptions = Object.keys(options).reduce((acc, key) => {\
        if (options[key] !== 'undefined') {\
          acc[key] = options[key];\
        }\
        return acc;\
      }, {});\
      window.postMessage(compactedOptions);\
    `
      webViewRef.current?.injectJavaScript(script)
    }, [connectionId, connectorId, institution, session?.token])

    const isQuilttEvent = useCallback((url: URL) => url.protocol === 'quilttconnector:', [])

    const shouldRender = useCallback((url: URL) => !isQuilttEvent(url), [isQuilttEvent])

    const clearLocalStorage = useCallback(() => {
      const script = 'localStorage.clear();'
      webViewRef.current?.injectJavaScript(script)
    }, [])

    const handleQuilttEvent = useCallback(
      (url: URL) => {
        url.searchParams.delete('source')
        url.searchParams.append('connectorId', connectorId)
        const metadata = parseMetadata(url, connectorId)

        requestAnimationFrame(() => {
          const eventType = url.host
          switch (eventType) {
            case 'Load':
              console.log('Event: Load')
              initInjectedJavaScript()
              onEvent?.(ConnectorSDKEventType.Load, metadata)
              onLoad?.(metadata)
              break
            case 'ExitAbort':
              console.log('Event: ExitAbort')
              clearLocalStorage()
              onEvent?.(ConnectorSDKEventType.ExitAbort, metadata)
              onExit?.(ConnectorSDKEventType.ExitAbort, metadata)
              onExitAbort?.(metadata)
              break
            case 'ExitError':
              console.log('Event: ExitError')
              clearLocalStorage()
              onEvent?.(ConnectorSDKEventType.ExitError, metadata)
              onExit?.(ConnectorSDKEventType.ExitError, metadata)
              onExitError?.(metadata)
              break
            case 'ExitSuccess':
              console.log('Event: ExitSuccess')
              clearLocalStorage()
              onEvent?.(ConnectorSDKEventType.ExitSuccess, metadata)
              onExit?.(ConnectorSDKEventType.ExitSuccess, metadata)
              onExitSuccess?.(metadata)
              break
            case 'Authenticate':
              console.log('Event: Authenticate')
              // TODO: handle Authenticate
              break
            case 'Navigate': {
              console.log('Event: Navigate')
              const navigateUrl = url.searchParams.get('url')

              if (!hasConfiguredAppLauncherUrl) {
                const errorMessage = 'OAuth redirect requires `appLauncherUrl` to be configured.'
                console.error(errorMessage)
                onEvent?.(ConnectorSDKEventType.ExitError, metadata)
                onExit?.(ConnectorSDKEventType.ExitError, metadata)
                onExitError?.(metadata)
                break
              }

              if (navigateUrl) {
                const onOAuthFailure = () => {
                  onEvent?.(ConnectorSDKEventType.ExitError, metadata)
                  onExit?.(ConnectorSDKEventType.ExitError, metadata)
                  onExitError?.(metadata)
                }

                if (isEncoded(navigateUrl)) {
                  try {
                    const decodedUrl = decodeURIComponent(navigateUrl)
                    handleOAuthUrl(decodedUrl, onOAuthFailure)
                  } catch (_error) {
                    console.error('Navigate URL decoding failed, using original')
                    handleOAuthUrl(navigateUrl, onOAuthFailure)
                  }
                } else {
                  handleOAuthUrl(navigateUrl, onOAuthFailure)
                }
              } else {
                console.error('Navigate URL missing from request')
              }
              break
            }
            // NOTE: The `OauthRequested` is deprecated and should not be used
            default:
              console.log(`Unhandled event: ${eventType}`)
              break
          }
        })
      },
      [
        clearLocalStorage,
        connectorId,
        initInjectedJavaScript,
        onEvent,
        onExit,
        onExitAbort,
        onExitError,
        onExitSuccess,
        hasConfiguredAppLauncherUrl,
        onLoad,
      ]
    )

    const requestHandler = useCallback(
      (request: ShouldStartLoadRequest) => {
        const url = new URL(request.url)

        if (isQuilttEvent(url)) {
          handleQuilttEvent(url)
          return false
        }

        if (shouldRender(url)) {
          return true
        }

        // Plaid set oauth url by doing window.location.href = url
        // So we use `handleOAuthUrl` as a catch all and assume all url got to this step is Plaid OAuth url
        const metadata = parseMetadata(url, connectorId)
        handleOAuthUrl(url, () => {
          onEvent?.(ConnectorSDKEventType.ExitError, metadata)
          onExit?.(ConnectorSDKEventType.ExitError, metadata)
          onExitError?.(metadata)
        })
        return false
      },
      [connectorId, handleQuilttEvent, isQuilttEvent, onEvent, onExit, onExitError, shouldRender]
    )

    // Expose method to handle OAuth callbacks from parent component
    useImperativeHandle(
      ref,
      () => ({
        handleOAuthCallback: (callbackUrl: string) => {
          try {
            console.log('Handling OAuth callback:', callbackUrl)
            const url = new URL(callbackUrl)

            // Extract OAuth callback parameters
            const oauthParams: Record<string, string> = {}
            url.searchParams.forEach((value, key) => {
              oauthParams[key] = value
            })

            // Send OAuth callback data to the connector via postMessage
            // This preserves the connector's state and allows events to fire properly
            const message = {
              source: 'quiltt',
              type: 'OAuthCallback',
              data: {
                url: callbackUrl,
                params: oauthParams,
              },
            }

            const script = `
              (function() {
                try {
                  window.postMessage(${JSON.stringify(message)});
                  console.log('OAuth callback message sent to connector');
                } catch (e) {
                  console.error('Failed to send OAuth callback message:', e);
                }
              })();
              true;
            `

            webViewRef.current?.injectJavaScript(script)
          } catch (error) {
            console.error('Error handling OAuth callback:', error)
          }
        },
      }),
      []
    )

    if (!preFlightCheck.checked || !connectorUrl) {
      return <LoadingScreen testId="loading-screen" />
    }

    if (preFlightCheck.error) {
      return (
        <ErrorScreen
          testId="error-screen"
          error={preFlightCheck.error}
          cta={() => onExitError?.({ connectorId })}
        />
      )
    }

    return (
      <AndroidSafeAreaView testId={testId}>
        <WebView
          ref={webViewRef}
          // Plaid keeps sending window.location = 'about:srcdoc' and causes some noise in RN
          domStorageEnabled // To enable localStorage in Android webview
          javaScriptEnabled
          onLoadEnd={onLoadEnd}
          onShouldStartLoadWithRequest={requestHandler}
          originWhitelist={['*']}
          scrollEnabled={true} // Enables scrolling within the WebView
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          source={{ uri: connectorUrl }}
          style={styles.webview}
          testID="webview"
          webviewDebuggingEnabled
          {...(Platform.OS === 'ios'
            ? {
                allowsBackForwardNavigationGestures: false, // Disables swipe to go back/forward
                allowsInlineMediaPlayback: true, // Allows videos to play inline
                automaticallyAdjustContentInsets: false, // Disables automatic padding adjustments
                bounces: false, // Controls the bouncing effect when scrolling past content boundaries
                contentInsetAdjustmentBehavior: 'never', // Controls how safe area insets modify content
                dataDetectorTypes: 'none', // Disables automatic data detection (phone numbers, links, etc.)
                decelerationRate: 'normal', // Controls scroll deceleration speed
                keyboardDisplayRequiresUserAction: false, // Allows programmatic keyboard display
                scrollEventThrottle: 16, // Optimize scroll performance (throttle scroll events)
                startInLoadingState: false, // Quiltt renders its own branded loader in the WebView HTML
              }
            : {
                androidLayerType: 'hardware', // Use hardware acceleration for rendering
                cacheEnabled: true, // Enable caching
                cacheMode: 'LOAD_CACHE_ELSE_NETWORK', // Load from cache when available
                overScrollMode: 'never', // Disable overscroll effect
              })}
        />
      </AndroidSafeAreaView>
    )
  }
)

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    overflow: 'hidden', // Prevent content from overflowing
    backgroundColor: 'transparent',
  },
})

QuilttConnector.displayName = 'QuilttConnector'

export { QuilttConnector }
