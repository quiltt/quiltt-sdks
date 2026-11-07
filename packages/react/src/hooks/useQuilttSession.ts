'use client'

import { useCallback, useMemo } from 'react'

import type { Maybe, QuilttJWT } from '@quiltt/core'
import { AuthAPI } from '@quiltt/core'

import { getSDKAgent } from '@/utils'
import { version } from '@/version'

import type { AuthenticateSession, IdentifySession, ImportSession, RevokeSession } from './session'
import {
  useAuthenticateSession,
  useIdentifySession,
  useImportSession,
  useRevokeSession,
} from './session'
import { useQuilttSettings } from './useQuilttSettings'
import { useSession } from './useSession'

export type UseQuilttSession = (environmentId?: string) => {
  session: Maybe<QuilttJWT> | undefined
  importSession: ImportSession
  identifySession: IdentifySession
  authenticateSession: AuthenticateSession
  revokeSession: RevokeSession
  forgetSession: (token?: string) => Promise<void>
  /**
   * Whether `session` has been read from the browser's storage yet. `false` only before the first
   * client commit, where a server render could not read storage and an empty `session` does not mean
   * signed out. @see useStorage
   */
  restored: boolean
}

export const useQuilttSession: UseQuilttSession = (environmentId) => {
  const { clientId, headers } = useQuilttSettings()
  const [session, setSession, controller, restored] = useSession()

  const sdkAgent = useMemo(() => getSDKAgent(version), [])
  const auth = useMemo(
    () => new AuthAPI(clientId, headers, sdkAgent),
    [clientId, headers, sdkAgent]
  )
  const importSession = useImportSession(auth, session, setSession, environmentId, controller)
  const identifySession = useIdentifySession(auth, setSession)
  const authenticateSession = useAuthenticateSession(auth, setSession)
  const revokeSession = useRevokeSession(auth, session, setSession, controller)

  /**
   * Forget current session.
   * @param token specific token to forget, to help guard against async processes clearing the wrong session
   */
  const forgetSession = useCallback(
    async (token?: string) => {
      if (!token || (session && token && token === session.token)) {
        setSession(null)
      }
    },
    [session, setSession]
  )

  return {
    session,
    importSession,
    identifySession,
    authenticateSession,
    revokeSession,
    forgetSession,
    restored,
  }
}
