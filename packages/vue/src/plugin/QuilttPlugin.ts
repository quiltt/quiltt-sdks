/**
 * Quiltt Vue Plugin implementation
 *
 * Provides session state management via Vue's provide/inject system.
 * Handles token parsing, storage synchronization, and automatic expiration.
 */

import type { App, Plugin } from 'vue'
import { ref, watch } from 'vue'

import type { Maybe, PrivateClaims, QuilttJWT } from '@quiltt/core'
import {
  createVersionLink,
  GlobalStorage,
  HeadersLink,
  InMemoryCache,
  JsonWebTokenParse,
  QuilttClient,
} from '@quiltt/core'
import { DefaultApolloClient } from '@vue/apollo-composable'

import { getPlatformInfo } from '../utils'
import type { QuilttPluginOptions } from './keys'
import { QuilttClientIdKey, QuilttHeadersKey, QuilttSessionKey, QuilttSetSessionKey } from './keys'

// Initialize JWT parser with our specific claims type
const parse = JsonWebTokenParse<PrivateClaims>

/**
 * Quiltt Vue Plugin
 *
 * Provides session management across your Vue application.
 * Use with `app.use(QuilttPlugin, options)`.
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { QuilttPlugin } from '@quiltt/vue'
 *
 * const app = createApp(App)
 * app.use(QuilttPlugin, { token: '<SESSION_TOKEN>' })
 * app.mount('#app')
 * ```
 */
export const QuilttPlugin: Plugin<[QuilttPluginOptions?]> = {
  install(app: App, options?: QuilttPluginOptions) {
    // Instance-scoped timeout for session expiration
    let sessionTimeout: ReturnType<typeof setTimeout> | undefined
    let isCleanedUp = false
    let stopSessionWatcher: (() => void) | undefined

    /**
     * Clear the session timeout for this app instance
     */
    const clearSessionTimeout = () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
        sessionTimeout = undefined
      }
    }

    // Initialize with provided token or stored token
    const initialToken = options?.token ?? GlobalStorage.get('session')
    const initialSession = parse(initialToken)

    // Reactive session state
    const session = ref<Maybe<QuilttJWT> | undefined>(initialSession)
    const clientId = ref<string | undefined>(options?.clientId)
    const headers = ref<Record<string, string> | undefined>(options?.headers)

    // GraphQL client: use the provided client, or build the default QuilttClient.
    // When the default client is used, custom headers are applied via a HeadersLink.
    const apolloClient =
      options?.graphqlClient ??
      new QuilttClient({
        cache: new InMemoryCache(),
        versionLink: createVersionLink(getPlatformInfo()),
        customLinks: options?.headers ? [new HeadersLink({ headers: options.headers })] : undefined,
      })

    /**
     * Set session token
     * Parses token, updates storage, and sets expiration timer
     */
    const setSession = (token: Maybe<string>): void => {
      const parsed = parse(token)
      session.value = parsed
      GlobalStorage.set('session', token ?? null)

      // Clear any existing expiration timer
      clearSessionTimeout()

      // Set new expiration timer if session is valid
      if (parsed) {
        const expirationMS = parsed.claims.exp * 1000
        const timeUntilExpiry = expirationMS - Date.now()

        if (timeUntilExpiry > 0) {
          sessionTimeout = setTimeout(() => {
            session.value = null
            GlobalStorage.set('session', null)
          }, timeUntilExpiry)
        } else {
          // Token already expired
          session.value = null
          GlobalStorage.set('session', null)
        }
      }
    }

    // Cleanup function for when the app is unmounted
    const cleanup = () => {
      if (isCleanedUp) {
        return
      }
      isCleanedUp = true

      clearSessionTimeout()
      if (stopSessionWatcher) {
        stopSessionWatcher()
        stopSessionWatcher = undefined
      }
    }

    // Register cleanup on app unmount (Vue 3.5+)
    if (typeof app.onUnmount === 'function') {
      app.onUnmount(cleanup)
    }

    // Ensure cleanup runs on all supported Vue versions (3.3+)
    if (typeof app.unmount === 'function') {
      const originalUnmount = app.unmount.bind(app)
      app.unmount = (...args: Parameters<typeof originalUnmount>) => {
        cleanup()
        return originalUnmount(...args)
      }
    }

    // Watch for session changes to update expiration timer
    stopSessionWatcher = watch(
      () => session.value,
      (newSession, oldSession) => {
        // Reset the Apollo store whenever the session changes so data cached under a
        // previous session is never served to a different one. Skip the initial immediate
        // run, where Vue passes `undefined` as the previous value.
        if (oldSession !== undefined && newSession !== oldSession) {
          apolloClient.resetStore().catch(() => {
            // resetStore cancels and refetches active queries; the rejection it emits for the
            // cancelled in-flight queries is expected, so ignore it.
          })
        }

        if (!newSession) {
          clearSessionTimeout()
          return
        }

        const expirationMS = newSession.claims.exp * 1000
        const timeUntilExpiry = expirationMS - Date.now()

        if (timeUntilExpiry <= 0) {
          session.value = null
          GlobalStorage.set('session', null)
          return
        }

        clearSessionTimeout()
        sessionTimeout = setTimeout(() => {
          session.value = null
          GlobalStorage.set('session', null)
        }, timeUntilExpiry)
      },
      { immediate: true }
    )

    // Provide session state to all components
    app.provide(QuilttSessionKey, session)
    app.provide(QuilttSetSessionKey, setSession)
    app.provide(QuilttClientIdKey, clientId)
    app.provide(QuilttHeadersKey, headers)

    // Provide the GraphQL client so useQuery/useMutation/useQuilttClient resolve it.
    app.provide(DefaultApolloClient, apolloClient)
  },
}
