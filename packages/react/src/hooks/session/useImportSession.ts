import { useCallback, useRef } from 'react'

import type { AuthAPI, Maybe, PrivateClaims, QuilttJWT } from '@quiltt/core'
import { JsonWebTokenParse } from '@quiltt/core'

import type { SetSession } from '@/hooks/useSession'

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
  environmentId?: string
) => ImportSession

/**
 * Optionally Accepts environmentId to validate session is from with your desired environment
 */
export const useImportSession: UseImportSession = (auth, session, setSession, environmentId) => {
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

      // Is this token active?
      const response = await auth.ping(token)
      switch (response.status) {
        case 200:
          setSession(token)
          validatedTokenRef.current = token
          return true

        case 401:
          rememberRejectedToken(token)
          validatedTokenRef.current = undefined
          setSession(null)
          return false

        default:
          throw new Error(`AuthAPI.ping: Unexpected response status ${response.status}`)
      }
    },
    [auth, session, setSession, environmentId]
  )

  return importSession
}
