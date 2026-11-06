/**
 * Injection keys and types for Quiltt Vue plugin
 */

import type { InjectionKey, Ref } from 'vue'

import type { Maybe, QuilttClient, QuilttJWT, SessionController } from '@quiltt/core'

// Injection keys for Quiltt state
export const QuilttSessionKey: InjectionKey<Ref<Maybe<QuilttJWT> | undefined>> =
  Symbol.for('quiltt-session')
export const QuilttSetSessionKey: InjectionKey<(token: Maybe<string>) => void> =
  Symbol.for('quiltt-set-session')
/**
 * The slot the app's session work has to guard. On a server it is the request's own session rather
 * than the process-wide store, so one request's sign-in or sign-out cannot cancel another's import.
 */
export const QuilttSessionControllerKey: InjectionKey<SessionController> = Symbol.for(
  'quiltt-session-controller'
)
export const QuilttClientIdKey: InjectionKey<Ref<string | undefined>> =
  Symbol.for('quiltt-client-id')
export const QuilttHeadersKey: InjectionKey<Ref<Record<string, string> | undefined>> =
  Symbol.for('quiltt-headers')

export interface QuilttPluginOptions {
  /**
   * Initial session token
   */
  token?: string
  /**
   * Quiltt Client ID (Environment ID)
   */
  clientId?: string
  /**
   * A custom QuilttClient instance to use instead of the default.
   * Note: When provided, the `headers` option is ignored since the custom client
   * manages its own link chain. To add custom headers with a custom client,
   * include a HeadersLink in your client's `customLinks` option.
   *
   * A custom client is also responsible for its own session: the default client is pointed at the
   * session this app keeps, which on a server is the request's own, so give the client a
   * `sessionToken` source when rendering on a server. Without one its links read the shared store,
   * which holds no session for the request, and every query fails with `UNAUTHENTICATED` /
   * `NO_TOKEN`.
   */
  graphqlClient?: QuilttClient
  /**
   * Custom headers to include with every GraphQL request.
   * Only applies when using the default client (i.e., when `graphqlClient` is not provided).
   * For Quiltt internal usage. Not intended for public use.
   * @internal
   */
  headers?: Record<string, string>
}
