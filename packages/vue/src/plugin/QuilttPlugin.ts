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
  createSessionController,
  createVersionLink,
  GlobalStorage,
  HeadersLink,
  InMemoryCache,
  JsonWebTokenParse,
  markSessionCleared,
  QuilttClient,
} from '@quiltt/core'
import { DefaultApolloClient } from '@vue/apollo-composable'

import { getPlatformInfo, isBrowser } from '../utils'
import type { QuilttPluginOptions } from './keys'
import {
  QuilttClientIdKey,
  QuilttHeadersKey,
  QuilttSessionControllerKey,
  QuilttSessionKey,
  QuilttSetSessionKey,
} from './keys'

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

    // A server renders one request at a time out of one process, so the shared store is not a slot
    // it may use: it would hand this request whichever session another request happened to write.
    const inBrowser = isBrowser()

    // Initialize with provided token or stored token
    const initialToken = options?.token ?? (inBrowser ? GlobalStorage.get('session') : undefined)
    const initialSession = parse(initialToken)

    // Reactive session state
    const session = ref<Maybe<QuilttJWT> | undefined>(initialSession)
    const clientId = ref<string | undefined>(options?.clientId)
    const headers = ref<Record<string, string> | undefined>(options?.headers)

    // A server has no shared slot to write: this request's ref is its whole session, and the store is
    // one process-wide singleton the next request would read.
    const writeStoredSession = (token: Maybe<string>) => {
      if (inBrowser) GlobalStorage.set('session', token ?? null)
    }

    // Clears are counted per slot, and on a server that is this request's ref: recording them in the
    // process-wide counter would let one request's sign-out cancel another's import.
    // @see SessionController#adopt
    let clearedCount = 0
    const recordClear = () => {
      if (inBrowser) markSessionCleared()
      else clearedCount += 1
    }

    // Clears this app makes go through here — the app calling `setSession(null)`, the expiration
    // timer — so the ref, the store, and the clear count that cancels a pending import move together.
    const clearSession = () => {
      recordClear()
      session.value = null
      writeStoredSession(null)
    }

    // Ends a session this app is only observing: the ref and the clear count move, the shared store
    // does not. Storage may already hold a token another tab saved after whatever arrived here, and
    // writing the clear through would end that session everywhere.
    const mirrorClear = () => {
      recordClear()
      session.value = null
    }

    // Ends an expired session, writing the clear back only while that session is still the one in
    // place. Another tab may have signed in while this one was paused, and the event announcing it
    // can arrive after this app's expiry timer.
    const expireSession = (expiredToken: string) => {
      if (inBrowser && (GlobalStorage.get('session') ?? null) !== expiredToken) {
        mirrorClear()
        return
      }

      clearSession()
    }

    // Mirror the stored session into this app's ref, so a token written by another source — another
    // tab, another Quiltt app on the page, or a core helper — reaches it. Without this the ref only
    // moves on `setSession`, and an import that finds its token already stored reports success while
    // the app still renders the old (or no) session.
    const handleStorageChange = (token: Maybe<string>) => {
      // `setSession` writes storage itself. Adopting that write would hand the watcher below a new
      // object for the same token and reset the Apollo store on every sign-in.
      if ((parse(token)?.token ?? null) === (session.value?.token ?? null)) return

      const parsed = parse(token)

      if (!parsed) {
        // Mirrored, never written back. This app only observed another tab's clear, and storage may
        // already hold a newer token — a sign-in that landed after the event was queued. Writing the
        // clear through would delete that sign-in everywhere.
        mirrorClear()
        return
      }

      // An observed token that has already expired is not a session to take on. Adopting it would
      // hand the watcher below a session to expire, and that expiry writes to the shared store —
      // over whatever newer token another tab has saved since this event was queued.
      if (parsed.claims.exp * 1000 <= Date.now()) {
        mirrorClear()
        return
      }

      session.value = parsed
    }

    // Browsers only: `install` runs once per request on a server, and this store is a process-wide
    // singleton, so every request would follow another request's sign-in or sign-out — and SSR never
    // unmounts the app, so nothing unsubscribes.
    if (inBrowser) {
      GlobalStorage.subscribe('session', handleStorageChange)
    }

    /**
     * Set session token
     * Parses token, updates storage, and sets expiration timer
     */
    const setSession = (token: Maybe<string>): void => {
      const parsed = parse(token)

      // Clear any existing expiration timer
      clearSessionTimeout()

      // An absent or unparseable token is a sign-out, recorded even when the slot was already empty:
      // a pending import has to see it. @see SessionController#adopt
      if (!parsed) {
        clearSession()
        return
      }

      session.value = parsed
      writeStoredSession(token)

      // Set new expiration timer if session is valid
      const expirationMS = parsed.claims.exp * 1000
      const timeUntilExpiry = expirationMS - Date.now()

      if (timeUntilExpiry > 0) {
        sessionTimeout = setTimeout(clearSession, timeUntilExpiry)
      } else {
        // Token already expired
        clearSession()
      }
    }

    // GraphQL client: use the provided client, or build the default QuilttClient.
    // When the default client is used, custom headers are applied via a HeadersLink.
    const apolloClient =
      options?.graphqlClient ??
      new QuilttClient({
        cache: new InMemoryCache(),
        versionLink: createVersionLink(getPlatformInfo()),
        customLinks: options?.headers ? [new HeadersLink({ headers: options.headers })] : undefined,
        // The default client authenticates with the session this app keeps. In a browser that is the
        // shared store, which the client already reads; a server render keeps its session in this
        // request's ref, and the shared store holds no session for it to find.
        sessionToken: inBrowser
          ? undefined
          : { read: () => session.value?.token ?? null, clear: () => setSession(null) },
      })

    // Cleanup function for when the app is unmounted
    const cleanup = () => {
      if (isCleanedUp) {
        return
      }
      isCleanedUp = true

      clearSessionTimeout()
      GlobalStorage.unsubscribe('session', handleStorageChange)
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
          expireSession(newSession.token)
          return
        }

        clearSessionTimeout()
        sessionTimeout = setTimeout(() => expireSession(newSession.token), timeUntilExpiry)
      },
      { immediate: true }
    )

    // The slot this app's async work has to guard. In a browser it is the shared store, which another
    // tab or another Quiltt app on the page can move; on a server it is this request's ref.
    const controller = createSessionController(
      setSession,
      'session',
      inBrowser
        ? undefined
        : { read: () => session.value?.token ?? null, clearCount: () => clearedCount }
    )

    // Provide session state to all components
    app.provide(QuilttSessionKey, session)
    app.provide(QuilttSetSessionKey, setSession)
    app.provide(QuilttSessionControllerKey, controller)
    app.provide(QuilttClientIdKey, clientId)
    app.provide(QuilttHeadersKey, headers)

    // Provide the GraphQL client so useQuery/useMutation/useQuilttClient resolve it.
    app.provide(DefaultApolloClient, apolloClient)
  },
}
