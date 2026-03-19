/**
 * QuilttContainer - Container component that renders Quiltt Connector inline
 *
 * Renders a container element where the Quiltt Connector will be displayed.
 * The SDK detects the `quiltt-container` attribute and renders the connector
 * inline automatically — no manual `open()` call required.
 *
 * @example
 * ```vue
 * <QuilttContainer
 *   :connector-id="connectorId"
 *   @exit-success="handleSuccess"
 * />
 * ```
 */

import { computed, defineComponent, getCurrentInstance, h, type PropType, watch } from 'vue'

import type { ConnectorSDKCallbackMetadata, ConnectorSDKEventType } from '@quiltt/core'

import { useQuilttConnector } from '../composables/useQuilttConnector'
import { oauthRedirectUrlDeprecationWarning } from '../constants/deprecation-warnings'

export const QuilttContainer = defineComponent({
  name: 'QuilttContainer',

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
    /** Deep link URL for OAuth callbacks (mobile apps) */
    appLauncherUrl: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /**
     * @deprecated Use `appLauncherUrl` instead. This property will be removed in a future version.
     * The OAuth redirect URL for mobile or embedded webview flows.
     */
    oauthRedirectUrl: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Render as a different element */
    as: {
      type: String,
      default: 'div',
    },
  },

  emits: {
    /** Connector loaded */
    load: (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** Connection successful */
    'exit-success': (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** User cancelled */
    'exit-abort': (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** Error occurred */
    'exit-error': (_metadata: ConnectorSDKCallbackMetadata) => true,
    /** Connector exited (any reason) */
    exit: (_type: ConnectorSDKEventType, _metadata: ConnectorSDKCallbackMetadata) => true,
    /** Any connector event */
    event: (_type: ConnectorSDKEventType, _metadata: ConnectorSDKCallbackMetadata) => true,
  },

  setup(props, { emit, slots }) {
    watch(
      () => props.oauthRedirectUrl,
      (value) => {
        if (value !== undefined) {
          console.warn(oauthRedirectUrlDeprecationWarning)
        }
      },
      { immediate: true }
    )

    const effectiveAppLauncherUri = computed(() => props.appLauncherUrl ?? props.oauthRedirectUrl)

    // Only register SDK callbacks for events the parent is actually listening to,
    // mirroring React's behavior. The SDK's per-event handlers are setters (last
    // registration wins), so unconditionally registering emit wrappers would
    // overwrite callbacks from sibling components (e.g. TestCustomButton).
    const vProps = getCurrentInstance()?.vnode.props

    useQuilttConnector(() => props.connectorId, {
      connectionId: () => props.connectionId,
      institution: () => props.institution,
      appLauncherUrl: effectiveAppLauncherUri,
      onEvent: vProps?.onEvent
        ? (type: ConnectorSDKEventType, metadata: ConnectorSDKCallbackMetadata) =>
            emit('event', type, metadata)
        : undefined,
      onLoad: vProps?.onLoad
        ? (metadata: ConnectorSDKCallbackMetadata) => emit('load', metadata)
        : undefined,
      onExit: vProps?.onExit
        ? (type: ConnectorSDKEventType, metadata: ConnectorSDKCallbackMetadata) =>
            emit('exit', type, metadata)
        : undefined,
      onExitSuccess: vProps?.onExitSuccess
        ? (metadata: ConnectorSDKCallbackMetadata) => emit('exit-success', metadata)
        : undefined,
      onExitAbort: vProps?.onExitAbort
        ? (metadata: ConnectorSDKCallbackMetadata) => emit('exit-abort', metadata)
        : undefined,
      onExitError: vProps?.onExitError
        ? (metadata: ConnectorSDKCallbackMetadata) => emit('exit-error', metadata)
        : undefined,
    })

    return () =>
      h(
        props.as,
        {
          'quiltt-container': props.connectorId,
          'quiltt-connection': props.connectionId,
          'quiltt-app-launcher-uri': effectiveAppLauncherUri.value,
          'quiltt-institution': props.institution,
          class: 'quiltt-container',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        slots.default?.()
      )
  },
})
