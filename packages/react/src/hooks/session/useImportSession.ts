import { useCallback, useMemo, useRef } from 'react'

import type { AuthAPI, Maybe, PrivateClaims, QuilttJWT, SessionController } from '@quiltt/core'
import { createSessionController, JsonWebTokenParse } from '@quiltt/core'

import type { SetSession } from '@/hooks/useSession'

import { isSlotSetter } from './slotSetter'

export type ImportSession = (token: string) => Promise<boolean>

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
   * Ties `setSession` to the slot it writes; pass the controller from `useSession`. Without it, a
   * setter that reports the slot it writes — `useSession`'s own — is wrapped in one. A setter that
   * reports nothing, such as a caller's `useState`, leaves the import nothing to verify: it reports
   * the token as imported once that setter has taken it, and cannot notice a sign-out it never saw.
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
  // Where the import reads back what it adopted. `useSession`'s setter reports the slot it writes, and
  // a caller can hand in a matching controller; either way the token's adoption can be checked, and a
  // sign-out during the ping noticed. A caller's own setter — a `useState`, say — writes somewhere
  // this hook cannot read, so there is no slot to compare and the import reports what that setter
  // accepted. Reading the shared slot instead would report a caller's own successful sign-in as a
  // failure, because their setter never wrote it.
  const sessionSlot = useMemo(() => {
    if (controller) return controller
    if (isSlotSetter(setSession)) return createSessionController(setSession, setSession.storageKey)

    return undefined
  }, [controller, setSession])

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
      // hook, because the calling component may have unmounted by then. Taken with the slot, so a
      // snapshot is never used against a slot it was not taken from.
      const sessionAtCall = sessionSlot?.snapshot()

      // Is this token active?
      const response = await auth.ping(token)
      switch (response.status) {
        case 200:
          // Another import of this token may have been rejected while this request was in flight. The
          // server said the token is dead, so this response does not bring it back to life.
          if (rejectedTokens.has(token)) return false

          // Reported as not imported when the slot moved on, since the token was not adopted. The
          // setter runs inside `adopt`, so it is called exactly once either way.
          if (sessionSlot && sessionAtCall) {
            if (!sessionSlot.adopt(token, sessionAtCall)) return false
          } else {
            // No slot to read back, so the setter is handed the token and the import reports it as
            // accepted: that is all this hook can know about where a caller's own setter put it.
            setSession(token)
          }

          validatedTokenRef.current = token
          return true

        case 401: {
          rememberRejectedToken(token)
          validatedTokenRef.current = undefined

          // A `401` is about the token that was pinged. Ending that session is a sign-out; ending
          // anything else would sign out a newer session that arrived while this request was in
          // flight. An empty slot has nothing to end either — and clearing it would still record a
          // sign-out, cancelling another import that is still waiting on a token of its own.
          // @see SessionController#adopt
          // A setter this hook cannot read is told to clear, as it always was: there is no way to
          // ask what it holds.
          const current = sessionSlot?.snapshot().token
          if (!sessionSlot) setSession(null)
          else if (current === token) sessionSlot.set(null)

          return false
        }

        default:
          throw new Error(`AuthAPI.ping: Unexpected response status ${response.status}`)
      }
    },
    [auth, session, setSession, environmentId, sessionSlot]
  )

  return importSession
}
