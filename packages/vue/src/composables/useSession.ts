import { computed, onUnmounted, ref, watch } from 'vue'

import type { Maybe, PrivateClaims, QuilttJWT } from '@quiltt/core'
import { JsonWebTokenParse, SESSION_STORAGE_KEY, Timeoutable } from '@quiltt/core'

import { useStorage } from './useStorage'

const parse = JsonWebTokenParse<PrivateClaims>
const sessionTimer = new Timeoutable()

export const useSession = (storageKey = SESSION_STORAGE_KEY) => {
  const { storage: token, setStorage } = useStorage<string>(storageKey)
  const session = ref<Maybe<QuilttJWT> | undefined>(parse(token.value))
  let currentExpire: (() => void) | null = null

  watch(
    token,
    (newToken) => {
      session.value = parse(newToken)
    },
    { immediate: true }
  )

  watch(
    () => session.value,
    (nextSession) => {
      if (currentExpire) {
        sessionTimer.clear(currentExpire)
        currentExpire = null
      }

      if (!nextSession) {
        return
      }

      const expirationMS = nextSession.claims.exp * 1000
      const expire = () => setStorage(null)
      currentExpire = expire

      if (Date.now() >= expirationMS) {
        expire()
        return
      }

      sessionTimer.set(expire, expirationMS - Date.now())
    },
    { immediate: true }
  )

  const setSession = (
    nextState:
      | Maybe<string>
      | undefined
      | ((prev: Maybe<string> | undefined) => Maybe<string> | undefined)
  ) => {
    const resolved = nextState instanceof Function ? nextState(token.value) : nextState

    if (token.value !== resolved && (!resolved || parse(resolved))) {
      setStorage(resolved)
    }
  }

  onUnmounted(() => {
    if (currentExpire) {
      sessionTimer.clear(currentExpire)
      currentExpire = null
    }
  })

  return {
    session: computed(() => session.value),
    setSession,
  }
}
