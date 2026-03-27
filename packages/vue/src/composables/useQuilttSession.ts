/**
 * Quiltt Session Composable
 *
 * Provides session management functionality for Vue 3 applications.
 * Must be used within a component tree where QuilttPlugin is installed.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useQuilttSession } from '@quiltt/vue'
 *
 * // Pass environmentId to restrict imports to a specific environment (optional)
 * const { session, importSession, revokeSession } = useQuilttSession('YOUR_ENVIRONMENT_ID')
 *
 * // Import a session token
 * await importSession('<SESSION_TOKEN>')
 *
 * // Access session data
 * console.log(session.value?.token)
 *
 * // Revoke the session
 * await revokeSession()
 * </script>
 * ```
 */

import { type ComputedRef, computed, inject } from 'vue'

import type {
  Maybe,
  PasscodePayload,
  PrivateClaims,
  QuilttJWT,
  SessionResponse,
  UnprocessableData,
  UnprocessableResponse,
  UsernamePayload,
} from '@quiltt/core'
import { AuthAPI, JsonWebTokenParse } from '@quiltt/core'

import { QuilttClientIdKey, QuilttSessionKey, QuilttSetSessionKey } from '../plugin/keys'

// Initialize JWT parser
const parse = JsonWebTokenParse<PrivateClaims>

// Module-level cache: keyed by the shared sessionRef instance so all composable
// instances within the same plugin-provided context share one validated marker.
// WeakMap ensures the entry is GC'd automatically when the app is torn down.
const validatedTokenCache = new WeakMap<
  object,
  { token: string | undefined; environmentId: string | undefined }
>()

/**
 * Callbacks for identify session operation
 */
export interface IdentifySessionCallbacks {
  onSuccess?: () => unknown
  onChallenged?: () => unknown
  onError?: (errors: UnprocessableData) => unknown
  onForbidden?: () => unknown
}

/**
 * Callbacks for authenticate session operation
 */
export interface AuthenticateSessionCallbacks {
  onSuccess?: () => unknown
  onFailure?: () => unknown
  onError?: (errors: UnprocessableData) => unknown
}

export type ImportSession = (token: string) => Promise<boolean>
export type IdentifySession = (
  payload: UsernamePayload,
  callbacks: IdentifySessionCallbacks
) => Promise<unknown>
export type AuthenticateSession = (
  payload: PasscodePayload,
  callbacks: AuthenticateSessionCallbacks
) => Promise<unknown>
export type RevokeSession = () => Promise<void>
export type ForgetSession = (token?: string) => void

export interface UseQuilttSessionReturn {
  /** Current session (reactive) */
  session: ComputedRef<Maybe<QuilttJWT> | undefined>
  /** Import an existing session token */
  importSession: ImportSession
  /** Start authentication flow with username/email/phone */
  identifySession: IdentifySession
  /** Complete authentication with passcode */
  authenticateSession: AuthenticateSession
  /** Revoke the current session (invalidates token on server) */
  revokeSession: RevokeSession
  /** Forget the current session locally (without server call) */
  forgetSession: ForgetSession
}

/**
 * Composable for managing Quiltt session state
 *
 * Provides methods for importing, creating, and revoking sessions.
 * Session state is automatically synchronized across components.
 * Requires QuilttPlugin provider context and throws when used without it.
 */
export const useQuilttSession = (environmentId?: string): UseQuilttSessionReturn => {
  const sessionRef = inject(QuilttSessionKey)
  const setSession = inject(QuilttSetSessionKey)
  const clientIdRef = inject(QuilttClientIdKey)

  if (!sessionRef || !setSession) {
    throw new Error(
      '[Quiltt] useQuilttSession must be used within a component where QuilttPlugin is installed. ' +
        'Make sure to call app.use(QuilttPlugin) before mounting your app.'
    )
  }

  // Create a computed ref for the session
  const session = computed(() => sessionRef.value)

  // Create AuthAPI instance (memoized based on clientId)
  const getAuth = () => new AuthAPI(clientIdRef?.value)

  // All composable instances within the same app share one validated marker, keyed
  // by the injected sessionRef so different apps (e.g. in tests) stay isolated.
  if (!validatedTokenCache.has(sessionRef)) {
    validatedTokenCache.set(sessionRef, { token: undefined, environmentId: undefined })
  }
  const validatedState = validatedTokenCache.get(sessionRef)!

  /**
   * Import an existing session token
   * Validates the token and sets it as the current session
   */
  const importSession: ImportSession = async (token) => {
    const auth = getAuth()

    // Is there a token?
    if (!token) return !!sessionRef.value

    // Has this exact token already passed env check + server ping AND is still
    // active in session state? We check sessionRef here so that if the session
    // was cleared externally (e.g. expiration timer) after validation, we fall
    // through to a fresh ping rather than returning true with a null session.
    // environmentId is included in the match so a changed environment restriction
    // is never bypassed by a previously validated token.
    if (validatedState.token === token && validatedState.environmentId === environmentId) {
      if (sessionRef.value?.token === token) return true
      // validatedState is stale — session was cleared since we last validated
      validatedState.token = undefined
      validatedState.environmentId = undefined
    }

    const jwt = parse(token)

    // Is this token a valid JWT?
    if (!jwt) return false

    // Is this token within the expected environment?
    if (environmentId && jwt.claims.eid !== environmentId) return false

    // Is this token active?
    const response = await auth.ping(token)
    switch (response.status) {
      case 200:
        setSession(token)
        validatedState.token = token
        validatedState.environmentId = environmentId
        return true

      case 401:
        validatedState.token = undefined
        validatedState.environmentId = undefined
        setSession(null)
        return false

      default:
        throw new Error(`AuthAPI.ping: Unexpected response status ${response.status}`)
    }
  }

  /**
   * Start authentication flow with username/email/phone
   * Returns a session token or challenges for passcode
   */
  const identifySession: IdentifySession = async (payload, callbacks) => {
    const auth = getAuth()
    const response = await auth.identify(payload)

    switch (response.status) {
      case 201: // Created
        setSession((response as SessionResponse).data.token)
        if (callbacks.onSuccess) return callbacks.onSuccess()
        break

      case 202: // Accepted (needs passcode)
        if (callbacks.onChallenged) return callbacks.onChallenged()
        break

      case 403: // Forbidden (signups disabled)
        if (callbacks.onForbidden) return callbacks.onForbidden()
        break

      case 422: // Unprocessable Content
        if (callbacks.onError) return callbacks.onError((response as UnprocessableResponse).data)
        break

      default:
        throw new Error(`AuthAPI.identify: Unexpected response status ${response.status}`)
    }
  }

  /**
   * Complete authentication with passcode
   */
  const authenticateSession: AuthenticateSession = async (payload, callbacks) => {
    const auth = getAuth()
    const response = await auth.authenticate(payload)

    switch (response.status) {
      case 201:
        setSession((response as SessionResponse).data.token)
        if (callbacks.onSuccess) return callbacks.onSuccess()
        break

      case 401:
        if (callbacks.onFailure) return callbacks.onFailure()
        break

      case 422:
        if (callbacks.onError) return callbacks.onError((response as UnprocessableResponse).data)
        break

      default:
        throw new Error(`AuthAPI.authenticate: Unexpected response status ${response.status}`)
    }
  }

  /**
   * Revoke the current session
   * Invalidates the token on the server and clears local state
   */
  const revokeSession: RevokeSession = async () => {
    if (!sessionRef.value) return

    const auth = getAuth()
    await auth.revoke(sessionRef.value.token)
    validatedState.token = undefined
    validatedState.environmentId = undefined
    setSession(null)
  }

  /**
   * Forget the current session locally without server call
   * Optionally pass a specific token to guard against async processes clearing wrong session
   */
  const forgetSession: ForgetSession = (token) => {
    if (token && token === validatedState.token) {
      // Always clear the validated marker when the specific token is being forgotten,
      // even if the session ref is already null (cleared by expiration timer).
      validatedState.token = undefined
      validatedState.environmentId = undefined
    }
    if (!token || (sessionRef.value && token === sessionRef.value.token)) {
      validatedState.token = undefined
      validatedState.environmentId = undefined
      setSession(null)
    }
  }

  return {
    session,
    importSession,
    identifySession,
    authenticateSession,
    revokeSession,
    forgetSession,
  }
}
