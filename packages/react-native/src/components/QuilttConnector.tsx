import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Linking, Platform, StyleSheet, View } from 'react-native'

import type {
  ConnectorSDKCallbackError,
  ConnectorSDKCallbackMetadata,
  ConnectorSDKCallbacks,
  ConnectorSDKStartupErrorCode,
} from '@quiltt/react'
import { ConnectorSDKEventType, isTrustedQuilttUrl, useQuilttSession } from '@quiltt/react'
import { URL } from 'react-native-url-polyfill' // https://github.com/facebook/react-native/issues/16434
import { WebView } from 'react-native-webview'
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes'

import {
  ErrorReporter,
  getSDKAgent,
  isEncoded,
  normalizeUrlEncoding,
  smartEncodeURIComponent,
} from '@/utils'
import { checkConnectorUrl, type PreFlightCheck } from '@/utils/connectorAssets'
import { version } from '@/version'

import { AndroidSafeAreaView } from './AndroidSafeAreaView'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'

const DEFAULT_STARTUP_TIMEOUT_MS = 20_000

/**
 * Shown when `connectorId` does not resolve to a Quiltt host. The ID is
 * interpolated into the connector host, so an unusable one is a configuration
 * error rather than something a retry can fix.
 */
const INVALID_CONNECTOR_ID_MESSAGE = 'Invalid connector ID. Unable to load the Quiltt Connector.'

type StartupFailureState = {
  failure: ConnectorSDKCallbackError
  /** Timeouts keep the WebView mounted under the error screen so a late load can recover. */
  overlay: boolean
}

const STARTUP_ERROR_CODES: ConnectorSDKStartupErrorCode[] = [
  'preflight_failed',
  'asset_load_failed',
  'webview_failed',
  'startup_timeout',
]

const isStartupErrorCode = (value: string): value is ConnectorSDKStartupErrorCode =>
  (STARTUP_ERROR_CODES as string[]).includes(value)

const startupErrorMessage = (code: ConnectorSDKStartupErrorCode): string => {
  switch (code) {
    case 'asset_load_failed':
      return 'A required Connector asset could not be loaded.'
    case 'startup_timeout':
      return 'The Connector did not finish loading.'
    case 'webview_failed':
      return 'The Connector could not be displayed.'
    default:
      return 'The Connector could not be reached.'
  }
}

/**
 * Runs before the document's own scripts. It reports a failed module graph
 * element (the entry, a static chunk, or a modulepreload dependency) to the
 * native side, but only before the Connector's Load handshake and only for
 * Quiltt assets. It waits out a short grace period so the Connector's own
 * recovery gets the first chance to handle a lazy-chunk failure.
 */
const STARTUP_MONITOR_SCRIPT = `
(function () {
  if (window.__quilttStartupMonitorInstalled) return;
  window.__quilttStartupMonitorInstalled = true;

  var reported = false;
  var GRACE_MS = 2000;

  function trustedAssetUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      if (url.protocol !== 'https:') return null;
      var host = url.hostname;
      var isQuilttHost = /(^|\\.)quiltt\\.(io|dev|app)$/.test(host);
      if (!isQuilttHost) return null;
      var assetPath =
        url.pathname.indexOf('/vite/') !== -1 ||
        url.pathname.indexOf('/vite-dev/') !== -1 ||
        url.pathname.indexOf('/vite-test/') !== -1 ||
        url.pathname.indexOf('/assets/') !== -1;
      if (!assetPath) return null;
      return url.toString();
    } catch (error) {
      return null;
    }
  }

  function report(value, kind) {
    if (reported) return;
    var url = trustedAssetUrl(value);
    if (!url) return;
    reported = true;
    window.setTimeout(function () {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          source: 'quiltt',
          type: 'startup_error',
          code: 'asset_load_failed',
          kind: kind,
          url: url,
          message: 'A required Connector asset could not be loaded.'
        }));
      } catch (error) {}
    }, GRACE_MS);
  }

  function resourceUrl(target) {
    if (!target || !target.tagName) return null;
    var tag = target.tagName.toLowerCase();
    if (tag === 'script' && target.src) return target.src;
    if (tag === 'link' && target.href) {
      var rels = (target.rel || '').toLowerCase().split(/\\s+/);
      if (rels.indexOf('modulepreload') !== -1) return target.href;
      if (rels.indexOf('preload') !== -1 && (target.as || '').toLowerCase() === 'script') return target.href;
    }
    return null;
  }

  function onResourceError(event) {
    var url = resourceUrl(event.target);
    if (url) report(url, 'resource');
  }

  window.addEventListener('error', onResourceError, true);
  document.addEventListener('error', onResourceError, true);
  window.addEventListener('vite:preloadError', function (event) {
    var payload = event && event.payload;
    if (payload && payload.url) report(payload.url, 'preload');
  }, true);
})();
`

/**
 * Reads the platform's boot marker after a timeout. A page that booted but
 * whose Load handshake was lost is a different failure from a page that never
 * executed, and the difference is worth reporting even though both surface the
 * same timeout UI.
 */
const BOOT_MARKER_CHECK_SCRIPT = `
(function () {
  try {
    var booted = document.documentElement.dataset.quilttBooted === 'true';
    window.ReactNativeWebView.postMessage(JSON.stringify({
      source: 'quiltt',
      type: 'startup_state',
      booted: booted
    }));
  } catch (error) {}
})();
true;
`

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

  // The Connector page attaches a reason when it synthesizes an ExitError for
  // a startup failure. Older pages do not, so `error` stays absent.
  const reason = url.searchParams.get('reason')
  if (reason) {
    const code = isStartupErrorCode(reason) ? reason : 'webview_failed'
    metadata.error = {
      code,
      message: startupErrorMessage(code),
      url: url.searchParams.get('url') ?? undefined,
    }
  }

  return metadata
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

  // Track whether normalization succeeded (and changed the URL) so the
  // catch block can decide whether a fallback attempt is worthwhile.
  let normalizedUrl = urlString

  try {
    // Normalization can throw on malformed escape sequences (e.g. "%ZZ"), so
    // it must run inside this try to still report failure via onFailure.
    normalizedUrl = normalizeUrlEncoding(urlString)

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
  /**
   * How long to wait for the Connector's `Load` handshake before showing a
   * timeout screen. Defaults to 20000ms. A timeout keeps the WebView mounted,
   * so a late load can still recover.
   */
  startupTimeoutMs?: number
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
      startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS,
      testId,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null)
    const { session } = useQuilttSession()
    const [preFlightCheck, setPreFlightCheck] = useState<PreFlightCheck>({ checked: false })
    const [errorReporter, setErrorReporter] = useState<ErrorReporter | null>(null)
    const [sdkAgent, setSDKAgent] = useState<string>('')

    const [startupFailure, setStartupFailure] = useState<StartupFailureState | null>(null)
    const [startupResolved, setStartupResolved] = useState(false)
    const [webViewKey, setWebViewKey] = useState(0)
    const [preflightAttempt, setPreflightAttempt] = useState(0)

    const startupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const handshakeRef = useRef(false)
    const loadedRef = useRef(false)
    const failureNotifiedRef = useRef(false)
    const exitNotifiedRef = useRef(false)

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

    // Connector origin for the WebView.
    //
    // `connectorId` is interpolated into the host, so a `/` or `?` in it would
    // point the WebView — and the session token in its query string — somewhere
    // else. An ID that does not resolve to a Quiltt host is refused.
    const connectorOrigin = useMemo(() => {
      const origin = `https://${connectorId}.quiltt.app`

      return isTrustedQuilttUrl(origin) ? origin : null
    }, [connectorId])

    const connectorUrl = useMemo(() => {
      if (!sdkAgent || !connectorOrigin) return null

      const url = new URL(connectorOrigin)

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

      if (preflightAttempt > 0) {
        // Bust any cached document so "Try again" re-runs the module graph.
        url.searchParams.append('_quiltt_retry', String(preflightAttempt))
      }

      return url.toString()
    }, [
      connectorOrigin,
      hasConfiguredAppLauncherUrl,
      preflightAttempt,
      safeAppLauncherUrl,
      sdkAgent,
      themeMode,
    ])

    // An unusable connector ID cannot be fixed by retrying, so report it rather
    // than leaving the Connector on its loading screen.
    useEffect(() => {
      if (!connectorOrigin) {
        setPreFlightCheck({ checked: true, error: INVALID_CONNECTOR_ID_MESSAGE })
      }
    }, [connectorOrigin])

    useEffect(() => {
      if (preFlightCheck.checked || !connectorUrl || !errorReporter) return

      let cancelled = false
      const fetchDataAndSetState = async () => {
        const connectorUrlStatus = await checkConnectorUrl(connectorUrl, errorReporter)
        if (!cancelled) setPreFlightCheck(connectorUrlStatus)
      }
      fetchDataAndSetState()

      return () => {
        cancelled = true
      }
    }, [connectorUrl, errorReporter, preFlightCheck.checked])

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

    const clearStartupTimer = useCallback(() => {
      if (startupTimerRef.current) {
        clearTimeout(startupTimerRef.current)
        startupTimerRef.current = null
      }
    }, [])

    const reportStartupFailure = useCallback(
      (failure: ConnectorSDKCallbackError) => {
        void errorReporter?.notify(new Error(failure.message), {
          connectorUrl,
          errorCode: failure.code,
          statusCode: failure.statusCode,
          failedUrl: failure.url,
        })
      },
      [connectorUrl, errorReporter]
    )

    const notifyStartupFailure = useCallback(
      (
        failure: ConnectorSDKCallbackError,
        options: { terminal: boolean; overlay?: boolean; report?: boolean }
      ) => {
        setStartupFailure({ failure, overlay: options.overlay ?? false })
        handshakeRef.current = true
        clearStartupTimer()

        if (failureNotifiedRef.current) return
        failureNotifiedRef.current = true

        const metadata: ConnectorSDKCallbackMetadata = { connectorId, error: failure }
        onEvent?.(ConnectorSDKEventType.ExitError, metadata)

        if (options.terminal) {
          exitNotifiedRef.current = true
          onExit?.(ConnectorSDKEventType.ExitError, metadata)
          onExitError?.(metadata)
        }

        if (options.report) reportStartupFailure(failure)
      },
      [clearStartupTimer, connectorId, onEvent, onExit, onExitError, reportStartupFailure]
    )

    const handleExit = useCallback(
      (failure: ConnectorSDKCallbackError) => {
        if (exitNotifiedRef.current) return
        exitNotifiedRef.current = true

        const metadata: ConnectorSDKCallbackMetadata = { connectorId, error: failure }
        onExit?.(ConnectorSDKEventType.ExitError, metadata)
        onExitError?.(metadata)
      },
      [connectorId, onExit, onExitError]
    )

    const handleRetry = useCallback(() => {
      clearStartupTimer()
      failureNotifiedRef.current = false
      exitNotifiedRef.current = false
      handshakeRef.current = false
      loadedRef.current = false
      setStartupResolved(false)
      setStartupFailure(null)
      setWebViewKey((key) => key + 1)
      setPreflightAttempt((attempt) => attempt + 1)
      setPreFlightCheck({ checked: false })
    }, [clearStartupTimer])

    const handleWebViewMessage = useCallback(
      (event: WebViewMessageEvent) => {
        let payload: unknown
        try {
          payload = JSON.parse(event.nativeEvent.data)
        } catch {
          return
        }
        if (!payload || typeof payload !== 'object') return

        const message = payload as Record<string, unknown>
        if (message.source !== 'quiltt') return

        if (message.type === 'startup_state') {
          if (message.booted === true) {
            void errorReporter?.notify(
              new Error('Connector booted but the Load handshake was not received'),
              { connectorUrl, errorCode: 'startup_timeout' }
            )
          }
          return
        }

        // The watchdog injects the boot-marker check *after* a timeout has
        // already resolved the handshake, so that reply has to be read before
        // this guard or it is always discarded.
        if (handshakeRef.current) return

        if (message.type !== 'startup_error' || message.code !== 'asset_load_failed') return
        if (typeof message.url !== 'string' || !isTrustedQuilttUrl(message.url)) return

        setStartupResolved(true)
        notifyStartupFailure(
          {
            code: 'asset_load_failed',
            message:
              typeof message.message === 'string'
                ? message.message
                : 'A required Connector asset could not be loaded.',
            url: message.url,
          },
          { terminal: true, report: true }
        )
      },
      [connectorUrl, errorReporter, notifyStartupFailure]
    )

    const handleWebViewError = useCallback(
      (event: WebViewErrorEvent) => {
        if (handshakeRef.current || loadedRef.current) return

        const { code, description, url } = event.nativeEvent
        // iOS reports cancelled navigations as -999; they are not failures.
        if (Platform.OS === 'ios' && code === -999) return

        notifyStartupFailure(
          {
            code: 'webview_failed',
            message: description || 'The Connector could not be displayed.',
            url,
          },
          { terminal: false, report: true }
        )
      },
      [notifyStartupFailure]
    )

    const handleWebViewHttpError = useCallback(
      (event: WebViewHttpErrorEvent) => {
        if (handshakeRef.current || loadedRef.current) return

        const { description, statusCode, url } = event.nativeEvent
        notifyStartupFailure(
          {
            code: 'webview_failed',
            message: description || `The Connector responded with HTTP ${statusCode}.`,
            statusCode,
            url,
          },
          { terminal: false, report: true }
        )
      },
      [notifyStartupFailure]
    )

    const handleQuilttEvent = useCallback(
      (url: URL) => {
        url.searchParams.delete('source')
        url.searchParams.append('connectorId', connectorId)
        const metadata = parseMetadata(url, connectorId)

        const eventType = url.host
        const isExitEvent =
          eventType === 'ExitError' || eventType === 'ExitAbort' || eventType === 'ExitSuccess'

        handshakeRef.current = true
        clearStartupTimer()
        setStartupResolved(true)

        // A startup failure may already have notified through the native
        // monitor or watchdog before the page's own ExitError arrives. Do not
        // fire the terminal callbacks twice for the same startup.
        if (isExitEvent && exitNotifiedRef.current) return

        requestAnimationFrame(() => {
          const eventType = url.host
          switch (eventType) {
            case 'Load':
              console.log('Event: Load')
              loadedRef.current = true
              setStartupFailure(null)
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
              failureNotifiedRef.current = true
              exitNotifiedRef.current = true
              // A page-level asset failure arrives as an ExitError with a
              // reason. Keep the screen actionable instead of inert.
              if (!loadedRef.current && metadata.error?.code === 'asset_load_failed') {
                setStartupFailure({ failure: metadata.error, overlay: false })
              }
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
        clearStartupTimer,
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

    const preflightFailure = useMemo<ConnectorSDKCallbackError | null>(() => {
      if (!preFlightCheck.error) return null

      return {
        code: preFlightCheck.errorCode ?? 'preflight_failed',
        message: preFlightCheck.error,
        statusCode: preFlightCheck.statusCode,
        url: preFlightCheck.failedUrl,
      }
    }, [preFlightCheck])

    // Fire detection-time callbacks for preflight failures. Asset failures are
    // unrecoverable and notify terminally here; other preflight failures notify
    // on the Exit press so a transient network error does not close the
    // Connector before the user sees the screen.
    useEffect(() => {
      if (!preflightFailure || failureNotifiedRef.current) return

      notifyStartupFailure(preflightFailure, {
        terminal: preflightFailure.code === 'asset_load_failed',
        report: false,
      })
    }, [preflightFailure, notifyStartupFailure])

    // Readiness watchdog: a page that never sends Load must not leave the user
    // on a native loading screen forever.
    useEffect(() => {
      if (!preFlightCheck.checked || preFlightCheck.error || !connectorUrl || !errorReporter) return
      if (startupResolved || startupFailure || loadedRef.current) return

      const timer = setTimeout(() => {
        if (loadedRef.current || startupResolved) return

        notifyStartupFailure(
          {
            code: 'startup_timeout',
            message: 'The Connector did not finish loading. Check your connection and try again.',
          },
          { terminal: false, overlay: true, report: true }
        )
        webViewRef.current?.injectJavaScript(BOOT_MARKER_CHECK_SCRIPT)
      }, startupTimeoutMs)

      startupTimerRef.current = timer

      return () => {
        clearTimeout(timer)
        if (startupTimerRef.current === timer) startupTimerRef.current = null
      }
    }, [
      connectorUrl,
      errorReporter,
      notifyStartupFailure,
      preFlightCheck.checked,
      preFlightCheck.error,
      startupFailure,
      startupResolved,
      startupTimeoutMs,
    ])

    const activeFailure =
      startupFailure ?? (preflightFailure ? { failure: preflightFailure, overlay: false } : null)
    const failureCode = activeFailure?.failure.code
    const canRetry = failureCode === 'asset_load_failed'
    const errorTitle =
      failureCode === 'startup_timeout'
        ? 'The Connector is taking too long to load.'
        : 'Unable to load the Connector.'

    // Error first: an unusable connector ID leaves `connectorUrl` null, which
    // the loading guard below would otherwise treat as "still loading".
    if (activeFailure && !activeFailure.overlay) {
      return (
        <ErrorScreen
          testId="error-screen"
          title={errorTitle}
          error={activeFailure.failure.message}
          ctaLabel={canRetry ? 'Try again' : 'Exit'}
          cta={canRetry ? handleRetry : () => handleExit(activeFailure.failure)}
        />
      )
    }

    if (!preFlightCheck.checked || !connectorUrl) {
      return <LoadingScreen testId="loading-screen" />
    }

    return (
      <AndroidSafeAreaView testId={testId}>
        <View style={styles.container}>
          <WebView
            key={webViewKey}
            ref={webViewRef}
            // Plaid keeps sending window.location = 'about:srcdoc' and causes some noise in RN
            domStorageEnabled // To enable localStorage in Android webview
            injectedJavaScriptBeforeContentLoaded={STARTUP_MONITOR_SCRIPT}
            javaScriptEnabled
            onError={handleWebViewError}
            onHttpError={handleWebViewHttpError}
            onLoadEnd={onLoadEnd}
            onMessage={handleWebViewMessage}
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
                  // The native overlay covers the window between the document
                  // load and the React app mounting. React's LaunchScreen only
                  // exists after the bundle executes.
                  startInLoadingState: false,
                }
              : {
                  androidLayerType: 'hardware', // Use hardware acceleration for rendering
                  cacheEnabled: true, // Enable caching
                  cacheMode: 'LOAD_DEFAULT', // Revalidate the stable entry against the current build
                  overScrollMode: 'never', // Disable overscroll effect
                })}
          />
          {!startupResolved && !startupFailure && (
            <View style={styles.overlay} pointerEvents="none">
              <LoadingScreen testId="loading-overlay" />
            </View>
          )}
          {activeFailure?.overlay && (
            <View style={styles.overlay}>
              <ErrorScreen
                testId="error-screen"
                title={errorTitle}
                error={activeFailure.failure.message}
                ctaLabel="Exit"
                cta={() => handleExit(activeFailure.failure)}
              />
            </View>
          )}
        </View>
      </AndroidSafeAreaView>
    )
  }
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#F3F4F6',
  },
  webview: {
    flex: 1,
    overflow: 'hidden', // Prevent content from overflowing
    backgroundColor: 'transparent',
  },
})

QuilttConnector.displayName = 'QuilttConnector'

export type { PreFlightCheck }
export { checkConnectorUrl, QuilttConnector }
