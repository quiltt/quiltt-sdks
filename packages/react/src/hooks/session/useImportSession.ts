import { useCallback, useMemo, useRef } from 'react'

import type { AuthAPI, Maybe, PrivateClaims, QuilttJWT, SessionController } from '@quiltt/core'
import { createSessionController, JsonWebTokenParse, SESSION_STORAGE_KEY } from '@quiltt/core'

import type { SessionSlotSetter, SetSession } from '@/hooks/useSession'

export type ImportSession = (token: string) => Promise<boolean>

const isSlotSetter = (setter: SetSession): setter is SessionSlotSetter => 'storageKey' in setter

// A token the server rejected with 401 is dead for the lifetime of that token,
// not the lifetime of a hook. `QuilttAuthProvider` remounts (route changes,
// keyed subtrees) build a fresh `importSession`, and each remount would ping the
// same dead token again. The latch therefore lives at module scope so it
// survives remounts; the cap keeps it bounded in long-lived and server-rendered
// processes. A Session JWT identifies exactly one session, so keying by token
// alone is unambiguous.
const MAX_REJECTED_TOKENS = 100
const rejectedTokens = new Set<string>()

const rememberRejectedToken = (token: string) => {
  rejectedTokens.add(token)
  if (rejectedTokens.size > MAX_REJECTED_TOKENS) {
    const oldest = rejectedTokens.values().next().value
    if (oldest !== undefined) rejectedTokens.delete(oldest)
  }
}

type UseImportSession = (
  auth: AuthAPI,
  session: Maybe<QuilttJWT> | undefined,
  setSession: SetSession,
  environmentId?: string,
  /**
   * Ties `setSession` to the slot it writes; pass the controller from `useSession`. Without it, the
   * slot the setter reports is used, falling back to the default session slot.
   */
  controller?: SessionController
) => ImportSession

/**
 * Optionally Accepts environmentId to validate session is from with your desired environment
 */
export const useImportSession: UseImportSession = (
  auth,
  session,
  setSession,
  environmentId,
  controller
) => {
  const fallbackController = useMemo(
    () =>
      createSessionController(
        setSession,
        isSlotSetter(setSession) ? setSession.storageKey : SESSION_STORAGE_KEY
      ),
    [setSession]
  )
  const sessionSlot = controller ?? fallbackController

  // Tracks tokens that completed the full import path (env check + server ping).
  // Tokens restored from storage at startup are NOT in this ref and must always
  // go through full validation before being used.
  const validatedTokenRef = useRef<string | undefined>(undefined)

  // Tokens the server rejected with 401 are tracked at module scope (see
  // `rejectedTokens` above) so a provider remount cannot re-ping a dead token.

  const importSession = useCallback<ImportSession>(
    async (token) => {
      // Is there a token?
      if (!token) return !!session

      // Give-up latch: once the server has rejected a token, don't ping it
      // again — not on a repeat call, and not after a remount.
      if (rejectedTokens.has(token)) return false

      // Short-circuit only if we explicitly validated this token AND it's still
      // active in session state. This prevents tokens silently restored from
      // storage at startup from bypassing server validation.
      if (validatedTokenRef.current === token && session?.token === token) return true

      const jwt = JsonWebTokenParse<PrivateClaims>(token)

      // Is this token a valid JWT?
      if (!jwt) return false

      // Is this token within the expected environment?
      if (environmentId && jwt.claims.eid !== environmentId) return false

      // Snapshot the slot before the ping: the request is awaited, so the session can change
      // underneath it, and a sign-out (or a different sign-in) has to win over this late response.
      // Otherwise a token imported before a sign-out is written back afterwards and silently
      // restores the session that was just ended. The snapshot comes from storage rather than the
      // hook, because the calling component may have unmounted by then.
      const sessionAtCall = sessionSlot.snapshot()

      // Is this token active?
      const response = await auth.ping(token)
      switch (response.status) {
        case 200: {
          // Reported as not imported when the slot moved on, since the token was not adopted.
          if (!sessionSlot.adopt(token, sessionAtCall)) return false

          // `adopt` writes through this same setter when the slot it read did not already hold the
          // token. It returns `true` without writing when the token was already there — and for an
          // untagged setter that read is the default slot, which may not be the caller's — so the
          // caller's setter still has to run, exactly once either way.
          if (!isSlotSetter(setSession) && sessionAtCall.token === token) setSession(token)

          validatedTokenRef.current = token
          return true
        }

        case 401:
          rememberRejectedToken(token)
          validatedTokenRef.current = undefined
          setSession(null)
          return false

        default:
          throw new Error(`AuthAPI.ping: Unexpected response status ${response.status}`)
      }
    },
    [auth, session, setSession, environmentId, sessionSlot]
  )

  return importSession
}
