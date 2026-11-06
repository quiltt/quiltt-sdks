'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useMemo } from 'react'

import type { Maybe, PrivateClaims, QuilttJWT, SessionController } from '@quiltt/core'
import {
  createSessionController,
  GlobalStorage,
  JsonWebTokenParse,
  markSessionCleared,
  SESSION_STORAGE_KEY,
  Timeoutable,
} from '@quiltt/core'

import { useStorage } from './useStorage'

export type { SessionController, SessionSnapshot } from '@quiltt/core'

/** React-style setter for the session slot: accepts a value or an updater. */
export type SetSession = Dispatch<SetStateAction<Maybe<string> | undefined>>

/**
 * A `SetSession` that reports the slot it writes, so async callers can read that same slot. The
 * setter alone cannot say which key it belongs to, and assuming the default one is wrong for
 * `useSession('other-session')`.
 */
export type SessionSlotSetter = SetSession & { readonly storageKey: string }

// Initialize JWT parser with our specific claims type
const parse = JsonWebTokenParse<PrivateClaims>

// Global timer to manage token expiration across all hook instances
const sessionTimer = new Timeoutable()

/**
 * Custom hook to manage JWT session state with automatic expiration handling.
 * Provides global singleton access to the session across components and windows.
 *
 * TODO: Support Rotation before Expiry
 *
 * Handles two types of data flow:
 * 1. Bottom-up (Login): Token passed through setSession callback
 * 2. Top-down (Refresh): State reinitialized on page reload
 *
 * @param storageKey - Key used for storing session in useStorage (defaults to 'session')
 * @returns `[session, setSession, controller, restored]` — current session, setter, the controller
 *   tying this slot to that setter for async work, and whether the session has been read from the
 *   browser's storage yet. @see SessionController @see useStorage
 */
export const useSession = (
  storageKey = SESSION_STORAGE_KEY
): [Maybe<QuilttJWT> | undefined, SessionSlotSetter, SessionController, boolean] => {
  const [token, setToken, restored] = useStorage<string>(storageKey)

  // Parse token into session data, updates when token changes
  const session = useMemo(() => parse(token), [token])

  /**
   * Validates and updates the session token.
   * - Handles both direct values and updater functions
   * - Validates new tokens before setting them
   * - Prevents unnecessary updates for same token value
   * - Allows clearing the session with null/undefined
   *
   * This is the only writer for the slot, so expiry and sign-out record their clears in the same
   * place as every other caller and a pending import sees all of them.
   */
  const setSessionImpl = useCallback(
    (nextState: Maybe<string> | SetStateAction<Maybe<string> | undefined> | undefined) => {
      // Compared against the stored token rather than this render's, because a controller kept from
      // an earlier render outlives the value it closed over: after that slot was cleared elsewhere,
      // its same-token check would skip the write and `adopt` would report success with an empty
      // slot. Reading the live value also gives updaters the `setState` semantics they expect.
      // Handed on exactly as stored, `null` included: coercing a cleared slot to `undefined` would
      // give updaters a value the slot does not hold, and one that branches on `null` never writes.
      const currentToken = GlobalStorage.get(storageKey)
      const newState = nextState instanceof Function ? nextState(currentToken) : nextState

      // A clear is recorded even when it writes nothing: clearing an already-empty session leaves
      // storage untouched, and a pending import on this key still has to be cancelled.
      // @see SessionController#adopt
      if (!newState) markSessionCleared(storageKey)

      // Only update if:
      // 1. The token has actually changed AND
      // 2. Either the new state is falsy (clearing session) OR it's a valid token
      if (currentToken !== newState && (!newState || parse(newState))) {
        setToken(newState)
      }
    },
    [setToken, storageKey]
  )

  // Reports the slot this setter writes, so work that resumes after an `await` can read that same
  // slot instead of assuming the default one. Tagging the memoized result is safe: the setter
  // already changes identity when the key does.
  const setSession = useMemo(
    () => Object.assign(setSessionImpl, { storageKey }),
    [setSessionImpl, storageKey]
  )

  // Binds this slot to its setter, so async work cannot read one session and write another.
  const controller = useMemo(
    () => createSessionController(setSession, storageKey),
    [storageKey, setSession]
  )

  // Handle session expiration
  useEffect(() => {
    if (!session) return

    const expirationMS = session.claims.exp * 1000
    const expire = () => setSession(null)

    const checkExpiration = () => {
      if (Date.now() >= expirationMS) {
        expire()
        return true
      }
      return false
    }

    // Clear immediately if already expired
    if (checkExpiration()) {
      return
    }

    // Set timer to clear session at expiration time
    sessionTimer.set(expire, expirationMS - Date.now())

    // Also check expiration when tab becomes visible (handles idle sessions)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkExpiration()
      }
    }

    // Only add listener in browser environment
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      sessionTimer.clear(expire)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [session, setSession])

  return [session, setSession, controller, restored]
}
