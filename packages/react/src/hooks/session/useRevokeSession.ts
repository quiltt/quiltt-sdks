import { useCallback, useMemo } from 'react'

import type { AuthAPI, Maybe, QuilttJWT, SessionController } from '@quiltt/core'
import { createSessionController } from '@quiltt/core'

import type { SetSession } from '@/hooks/useSession'

import { isSlotSetter } from './slotSetter'

export type RevokeSession = () => Promise<void>

type UseRevokeSession = (
  auth: AuthAPI,
  session: Maybe<QuilttJWT> | undefined,
  setSession: SetSession,
  /** Ties `setSession` to the slot it writes; pass the controller from `useSession`. */
  controller?: SessionController
) => RevokeSession

export const useRevokeSession: UseRevokeSession = (auth, session, setSession, controller) => {
  // The slot whose session this ends. A caller can hand in the controller from `useSession`, or pass
  // that setter alone: it reports the slot it writes, so the same guard can be built from it. Only a
  // setter that reports nothing leaves nothing to compare, and is cleared as it always was.
  const slot = useMemo(() => {
    if (controller) return controller
    if (isSlotSetter(setSession)) return createSessionController(setSession, setSession.storageKey)

    return undefined
  }, [controller, setSession])

  const revokeSession = useCallback<RevokeSession>(async () => {
    if (!session) return

    const revoked = session.token
    await auth.revoke(revoked)

    // The session this revoked can be gone by the time the answer lands: a sign-in that happened
    // while the request was in flight is not this call's to end, and clearing it would also cancel
    // any import waiting on its own token. @see SessionController
    if (slot && slot.snapshot().token !== revoked) return

    setSession(null)
  }, [auth, session, setSession, slot])

  return revokeSession
}
