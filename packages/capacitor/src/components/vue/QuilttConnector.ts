/**
 * QuilttConnector - Vue component for Quiltt Connector in Capacitor apps
 *
 * Embeds the Quiltt Connector in an iframe and handles OAuth flows via
 * Capacitor native plugins. Mirrors the React QuilttConnector component
 * for feature parity in Vue/Capacitor applications.
 *
 * @example
 * ```vue
 * <script setup>
 * import { QuilttConnector } from '@quiltt/capacitor/vue'
 * </script>
 *
 * <template>
 *   <QuilttConnector
 *     connector-id="<CONNECTOR_ID>"
 *     @exit-success="handleSuccess"
 *   />
 * </template>
 * ```
 */

import { computed, defineComponent, h, onMounted, onUnmounted, type PropType, ref } from 'vue'

import type { ConnectorSDKCallbackMetadata } from '@quiltt/vue'
import { ConnectorSDKEventType, isTrustedQuilttUrl, useQuilttSession } from '@quiltt/vue'

import { QuilttConnector as QuilttConnectorPlugin } from '../../plugin'

const decodeIfEncoded = (value: string): string => {
  try {
    const decoded = decodeURIComponent(value)
    return decoded === value ? value : decoded
  } catch {
    return value
  }
}

const normalizeUrlValue = (value: string): string => decodeIfEncoded(value.trim())

/**
 * Shown when `connectorId` does not resolve to a Quiltt host. The ID is
 * interpolated into the connector host, so an unusable one is a configuration
 * error rather than something a retry can fix.
 */
const INVALID_CONNECTOR_ID_MESSAGE = 'Invalid connector ID. Unable to load the Quiltt Connector.'

export const QuilttConnector = defineComponent({
  name: 'QuilttConnector',

  props: {
    /** Quiltt Connector ID */
    connectorId: {
      type: String,
      required: true,
    },
    /** Existing connection ID for reconnection */
    connectionId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Pre-select a specific institution */
    institution: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /**
     * The theme mode for the Connector UI.
     * - 'light': Force light theme (default)
     * - 'dark': Force dark theme
     * - 'auto': Follow device/system preference
     */
    themeMode: {
      type: String as PropType<'light' | 'dark' | 'auto' | undefined>,
      default: undefined,
    },
    /**
     * The app launcher URL for mobile OAuth flows.
     * This URL should be a Universal Link (iOS) or App Link (Android)
     * that redirects back to your app.
     */
    appLauncherUrl: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** CSS class for the wrapper div */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Inline styles for the wrapper div */
    style: {
      type: Object as PropType<Record<string, string | number> | undefined>,
      default: undefined,
    },
  },

  emits: {
    /** Any connector event */
    event: (_type: ConnectorSDKEventType, _metadata: ConnectorSDKCallbackMetadata) => true,
    /** Connector loaded */
    load: (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** Connector exited (any reason) */
    exit: (_type: ConnectorSDKEventType, _metadata: ConnectorSDKCallbackMetadata) => true,
    /** Connection successful */
    'exit-success': (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** User cancelled */
    'exit-abort': (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** Error occurred */
    'exit-error': (_metadata: ConnectorSDKCallbackMetadata) => true,
  },

  setup(props, { emit, expose }) {
    const iframeRef = ref<HTMLIFrameElement | null>(null)
    // biome-ignore lint/correctness/useHookAtTopLevel: Vue setup() is not a React component; useQuilttSession is a Vue composable
    const { session } = useQuilttSession()
    const isLoaded = ref(false)
    const loadError = ref<string | null>(null)
    let abortController: AbortController | null = null
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null
    let deepLinkListenerPromise: Promise<{ remove: () => void }> | null = null

    // Connector origin for secure postMessage targeting.
    //
    // `connectorId` is interpolated into the host, so a `/` or `?` in it would
    // retarget everything built from this — the iframe, the preflight fetch, and
    // the postMessage target — and the URL carries the session token. An ID that
    // does not resolve to a Quiltt host is refused rather than loaded.
    const connectorOrigin = computed(() => {
      const origin = `https://${props.connectorId}.quiltt.app`

      return isTrustedQuilttUrl(origin) ? origin : null
    })

    // Build connector URL
    const connectorUrl = computed(() => {
      if (!connectorOrigin.value) return null

      const url = new URL(connectorOrigin.value)

      if (session.value?.token) {
        url.searchParams.set('token', session.value.token)
      }
      if (props.connectionId) {
        url.searchParams.set('connectionId', props.connectionId)
      }
      if (props.institution) {
        url.searchParams.set('institution', props.institution)
      }
      if (props.appLauncherUrl) {
        url.searchParams.set('app_launcher_url', normalizeUrlValue(props.appLauncherUrl))
      }
      if (props.themeMode) {
        url.searchParams.set('theme_mode', props.themeMode)
      }

      if (typeof window !== 'undefined') {
        url.searchParams.set('embed_location', window.location.href)
      }

      // Set mode for inline iframe embedding
      url.searchParams.set('mode', 'INLINE')

      return url.toString()
    })

    const postOAuthCallbackToIframe = (callbackUrl: string) => {
      const targetOrigin = connectorOrigin.value

      if (!targetOrigin || !iframeRef.value?.contentWindow) {
        return
      }

      const normalizedCallbackUrl = normalizeUrlValue(callbackUrl)

      try {
        const callback = new URL(normalizedCallbackUrl)
        const params: Record<string, string> = {}
        callback.searchParams.forEach((value, key) => {
          params[key] = value
        })

        iframeRef.value.contentWindow.postMessage(
          {
            source: 'quiltt',
            type: 'OAuthCallback',
            data: {
              url: normalizedCallbackUrl,
              params,
            },
          },
          targetOrigin
        )
      } catch {
        iframeRef.value.contentWindow.postMessage(
          {
            source: 'quiltt',
            type: 'OAuthCallback',
            data: {
              url: normalizedCallbackUrl,
              params: {},
            },
          },
          targetOrigin
        )
      }
    }

    // Handle messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (!isTrustedQuilttUrl(event.origin)) {
        return
      }

      const data = event.data || {}
      // Validate message is from Quiltt MessageBus
      if (data.source !== 'quiltt' || !data.type) return

      const { type, connectionId: msgConnectionId, profileId, connectorSession, url } = data

      // Build metadata from message fields
      const metadata: ConnectorSDKCallbackMetadata = {
        connectorId: props.connectorId,
        ...(profileId && { profileId }),
        ...(msgConnectionId && { connectionId: msgConnectionId }),
        ...(connectorSession && { connectorSession }),
      }

      switch (type) {
        case 'Load':
          isLoaded.value = true
          loadError.value = null
          emit('event', ConnectorSDKEventType.Load, metadata)
          emit('load', metadata)
          break

        case 'ExitSuccess':
          emit('event', ConnectorSDKEventType.ExitSuccess, metadata)
          emit('exit', ConnectorSDKEventType.ExitSuccess, metadata)
          emit('exit-success', metadata)
          break

        case 'ExitAbort':
          emit('event', ConnectorSDKEventType.ExitAbort, metadata)
          emit('exit', ConnectorSDKEventType.ExitAbort, metadata)
          emit('exit-abort', metadata)
          break

        case 'ExitError':
          emit('event', ConnectorSDKEventType.ExitError, metadata)
          emit('exit', ConnectorSDKEventType.ExitError, metadata)
          emit('exit-error', metadata)
          break

        case 'Navigate':
          // OAuth URL - open in system browser
          if (url) {
            QuilttConnectorPlugin.openUrl({ url })
          }
          break
      }
    }

    // Preflight check
    const runPreflight = () => {
      isLoaded.value = false
      loadError.value = null

      const target = connectorUrl.value

      if (!target) {
        loadError.value = INVALID_CONNECTOR_ID_MESSAGE
        return
      }

      abortController = new AbortController()

      fetch(target, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit',
        signal: abortController.signal,
      }).catch(() => {
        loadError.value = 'Unable to reach Quiltt Connector. Check network and connector settings.'
      })
    }

    // Set up lifecycle
    onMounted(() => {
      // Set up message listener
      window.addEventListener('message', handleMessage)

      // Run preflight
      runPreflight()

      // Timeout
      loadTimeoutId = setTimeout(() => {
        if (!isLoaded.value && !loadError.value) {
          loadError.value = 'Connector took too long to load. Please retry.'
        }
      }, 15000)

      // Listen for OAuth callbacks via deep links
      deepLinkListenerPromise = QuilttConnectorPlugin.addListener('deepLink', (event) => {
        if (event.url) {
          postOAuthCallbackToIframe(event.url)
        }
      })

      // Check if app was opened via the app launcher URL
      QuilttConnectorPlugin.getAppLauncherUrl().then((result) => {
        if (result?.url) {
          postOAuthCallbackToIframe(result.url)
        }
      })
    })

    onUnmounted(() => {
      window.removeEventListener('message', handleMessage)

      if (abortController) {
        abortController.abort()
        abortController = null
      }

      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }

      if (deepLinkListenerPromise) {
        deepLinkListenerPromise.then((l) => l.remove())
        deepLinkListenerPromise = null
      }
    })

    // Expose handleOAuthCallback method
    expose({
      handleOAuthCallback: (callbackUrl: string) => {
        postOAuthCallbackToIframe(callbackUrl)
      },
    })

    // Render
    return () => {
      const wrapperStyle: Record<string, string | number> = {
        width: '100%',
        height: '100%',
        position: 'relative',
        ...((props.style as Record<string, string | number>) || {}),
      }

      const iframeStyle: Record<string, string | number> = {
        border: 'none',
        width: '100%',
        height: '100%',
      }

      const errorStyle: Record<string, string | number> = {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        textAlign: 'center',
        backgroundColor: '#fff',
      }

      return h(
        'div',
        {
          class: props.className,
          style: wrapperStyle,
        },
        [
          connectorUrl.value
            ? h('iframe', {
                ref: iframeRef,
                src: connectorUrl.value,
                title: 'Quiltt Connector',
                allow: 'publickey-credentials-get *',
                style: iframeStyle,
              })
            : null,
          loadError.value ? h('div', { style: errorStyle }, loadError.value) : null,
        ]
      )
    }
  },
})
