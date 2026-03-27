import { useCallback, useRef } from 'react'

import type { AuthAPI, Maybe, PrivateClaims, QuilttJWT } from '@quiltt/core'
import { JsonWebTokenParse } from '@quiltt/core'

import type { SetSession } from '@/hooks/useSession'

export type ImportSession = (token: string) => Promise<boolean>

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

  const importSession = useCallback<ImportSession>(
    async (token) => {
      // Is there a token?
      if (!token) return !!session

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
          validatedTokenRef.current = undefined
          return false

        default:
          throw new Error(`AuthAPI.ping: Unexpected response status ${response.status}`)
      }
    },
    [auth, session, setSession, environmentId]
  )

  return importSession
}
