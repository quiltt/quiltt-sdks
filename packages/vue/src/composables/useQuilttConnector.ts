/**
 * Quiltt Connector Composable
 *
 * Provides connector management functionality for Vue 3 applications.
 * Loads the Quiltt Connector SDK and manages connector state.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useQuilttConnector } from '@quiltt/vue'
 *
 * const { open } = useQuilttConnector('conn_xxx', {
 *   onExitSuccess: (metadata) => {
 *     console.log('Connected:', metadata.connectionId)
 *   }
 * })
 * </script>
 *
 * <template>
 *   <button @click="open">Connect Bank Account</button>
 * </template>
 * ```
 */

import type { MaybeRefOrGetter } from 'vue'
import { markRaw, onMounted, onUnmounted, ref, shallowRef, toValue, watch } from 'vue'

import type {
  ConnectorSDK,
  ConnectorSDKCallbacks,
  ConnectorSDKConnector,
  Maybe,
  QuilttJWT,
} from '@quiltt/core'
import { cdnBase } from '@quiltt/core'

import { oauthRedirectUrlDeprecationWarning } from '../constants/deprecation-warnings'
import { getSDKAgent } from '../utils'
import { version } from '../version'
import { useQuilttSession } from './useQuilttSession'

declare const Quiltt: ConnectorSDK

export interface UseQuilttConnectorOptions extends ConnectorSDKCallbacks {
  connectionId?: MaybeRefOrGetter<string | undefined>
  institution?: MaybeRefOrGetter<string | undefined>
  appLauncherUrl?: MaybeRefOrGetter<string | undefined>
  /**
   * @deprecated Use `appLauncherUrl` instead. This property will be removed in a future version.
   * The OAuth redirect URL for mobile or embedded webview flows.
   */
  oauthRedirectUrl?: MaybeRefOrGetter<string | undefined>
  nonce?: string
}

export interface UseQuilttConnectorReturn {
  /** Open the connector modal */
  open: () => void
}

/**
 * Load the Quiltt SDK script
 */
const loadScript = (src: string, nonce?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof Quiltt !== 'undefined') {
      resolve()
      return
    }

    // Check if script is already in DOM
    const existing = document.querySelector(`script[src^="${src.split('?')[0]}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Quiltt SDK')))
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    if (nonce) script.nonce = nonce
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Quiltt SDK'))
    document.head.appendChild(script)
  })
}

/**
 * Composable for managing Quiltt Connector
 *
 * Loads the Quiltt SDK script and provides methods to open/manage connectors.
 * This composable can run without QuilttPlugin session context; when unavailable,
 * it logs a warning and continues without authenticated session state.
 */
export const useQuilttConnector = (
  connectorId?: MaybeRefOrGetter<string | undefined>,
  options?: UseQuilttConnectorOptions
): UseQuilttConnectorReturn => {
  const getConnectorId = (): string | undefined => toValue(connectorId)
  const getConnectionId = (): string | undefined => toValue(options?.connectionId)
  const getInstitution = (): string | undefined => toValue(options?.institution)
  const getOauthRedirectUrl = (): string | undefined => toValue(options?.oauthRedirectUrl)
  const getAppLauncherUri = (): string | undefined =>
    toValue(options?.appLauncherUrl) ?? getOauthRedirectUrl()

  const session = ref<Maybe<QuilttJWT | undefined>>()

  try {
    const quilttSession = useQuilttSession()
    session.value = quilttSession.session.value

    watch(
      () => quilttSession.session.value,
      (nextSession) => {
        session.value = nextSession
      },
      { immediate: true }
    )
  } catch (error) {
    console.warn(
      '[Quiltt] useQuilttConnector: QuilttPlugin not found in the current app context. ' +
        'Continuing without session authentication.',
      error
    )
  }

  const connector = shallowRef<ConnectorSDKConnector | undefined>()
  const isLoaded = ref(false)
  const isOpening = ref(false)
  const isConnectorOpen = ref(false)

  // Track previous values
  let prevConnectionId = getConnectionId()
  let prevConnectorId = getConnectorId()
  let prevInstitution = getInstitution()
  let prevAppLauncherUri = getAppLauncherUri()
  let connectorCreated = false

  // Load SDK script on mount
  onMounted(async () => {
    const userAgent = getSDKAgent(version)
    const scriptUrl = `${cdnBase}/v1/connector.js?agent=${encodeURIComponent(userAgent)}`

    try {
      await loadScript(scriptUrl, options?.nonce)
      isLoaded.value = true
    } catch (error) {
      console.error('[Quiltt] Failed to load SDK:', error)
    }
  })

  // Update authentication when session changes
  watch(
    () => session.value?.token,
    (token) => {
      if (typeof Quiltt !== 'undefined') {
        Quiltt.authenticate(token)
      }
    },
    { immediate: true }
  )

  // Handle script loaded
  watch(
    isLoaded,
    (loaded) => {
      if (!loaded || typeof Quiltt === 'undefined') return

      // Authenticate with current session
      Quiltt.authenticate(session.value?.token)
    },
    { immediate: true }
  )

  watch(
    getOauthRedirectUrl,
    (oauthRedirectUrl) => {
      if (oauthRedirectUrl !== undefined) {
        console.warn(oauthRedirectUrlDeprecationWarning)
      }
    },
    { immediate: true }
  )

  // Create/update connector when needed
  const updateConnector = () => {
    const currentConnectorId = getConnectorId()
    if (!isLoaded.value || typeof Quiltt === 'undefined' || !currentConnectorId) return

    const currentConnectionId = getConnectionId()
    const currentInstitution = getInstitution()
    const currentAppLauncherUri = getAppLauncherUri()

    // Check for changes
    const connectionIdChanged = prevConnectionId !== currentConnectionId
    const connectorIdChanged = prevConnectorId !== currentConnectorId
    const institutionChanged = prevInstitution !== currentInstitution
    const appLauncherUrlChanged = prevAppLauncherUri !== currentAppLauncherUri
    const hasChanges =
      connectionIdChanged ||
      connectorIdChanged ||
      institutionChanged ||
      appLauncherUrlChanged ||
      !connectorCreated

    if (hasChanges) {
      if (currentConnectionId) {
        // Reconnect mode
        connector.value = markRaw(
          Quiltt.reconnect(currentConnectorId, {
            connectionId: currentConnectionId,
            appLauncherUrl: currentAppLauncherUri,
          })
        )
      } else {
        // Connect mode
        connector.value = markRaw(
          Quiltt.connect(currentConnectorId, {
            institution: currentInstitution,
            appLauncherUrl: currentAppLauncherUri,
          })
        )
      }

      connectorCreated = true
      prevConnectionId = currentConnectionId
      prevConnectorId = currentConnectorId
      prevInstitution = currentInstitution
      prevAppLauncherUri = currentAppLauncherUri
    }
  }

  // Watch for changes that require connector update
  watch(
    [isLoaded, getConnectorId, getConnectionId, getInstitution, getAppLauncherUri],
    updateConnector,
    {
      immediate: true,
    }
  )

  // Register event handlers when connector changes
  watch(
    connector,
    (newConnector, oldConnector) => {
      // Cleanup old handlers
      if (oldConnector) {
        // Note: Quiltt SDK handles cleanup internally
      }

      if (!newConnector) return

      // Register handlers — only register when the callback is provided to avoid
      // overwriting handlers from sibling components (the SDK uses setter semantics:
      // last registration wins per event slot).
      if (options?.onEvent) {
        newConnector.onEvent(options.onEvent)
      }
      if (options?.onOpen) {
        newConnector.onOpen((metadata) => {
          isConnectorOpen.value = true
          options.onOpen!(metadata)
        })
      }
      if (options?.onLoad) {
        newConnector.onLoad(options.onLoad)
      }
      if (options?.onExit) {
        newConnector.onExit((type, metadata) => {
          isConnectorOpen.value = false
          options.onExit!(type, metadata)
        })
      }
      if (options?.onExitSuccess) {
        newConnector.onExitSuccess(options.onExitSuccess)
      }
      if (options?.onExitAbort) {
        newConnector.onExitAbort(options.onExitAbort)
      }
      if (options?.onExitError) {
        newConnector.onExitError(options.onExitError)
      }
    },
    { immediate: true }
  )

  // Handle deferred opening
  watch([connector, isOpening], ([conn, opening]) => {
    if (conn && opening) {
      isOpening.value = false
      conn.open()
    }
  })

  // Warn on unmount if connector is still open
  onUnmounted(() => {
    if (isConnectorOpen.value) {
      console.error(
        '[Quiltt] useQuilttConnector: Component unmounted while Connector is still open. ' +
          'This may lead to memory leaks or unexpected behavior.'
      )
    }
  })

  /**
   * Open the connector modal
   */
  const open = (): void => {
    if (getConnectorId()) {
      isOpening.value = true
      updateConnector()
    } else {
      throw new Error('Must provide connectorId to open Quiltt Connector')
    }
  }

  return { open }
}
