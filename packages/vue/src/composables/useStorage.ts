import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'

import type { Maybe } from '@quiltt/core'
import { GlobalStorage } from '@quiltt/core'

import { isBrowser } from '../utils'

export const useStorage = <T>(key: string, initialState?: Maybe<T>) => {
  // A server shares one process-wide store across every request it renders, so reading it there would
  // hand this request whatever another request happened to write, and writing it would hand this
  // request's values to the next. A server render uses the default and keeps its writes local.
  const inBrowser = isBrowser()

  const readStorage = () => {
    if (!inBrowser) return initialState

    // `initialState` stands in only for a key that was never written. An empty value means the key
    // was written and then cleared, in which case the default must stay out of the way.
    // @see Storage#has
    if (!GlobalStorage.has(key)) return initialState

    return GlobalStorage.get(key) as Maybe<T>
  }

  const state = ref<Maybe<T> | undefined>(readStorage())

  const setStorage = (
    nextState: Maybe<T> | undefined | ((prev: Maybe<T> | undefined) => Maybe<T> | undefined)
  ) => {
    const resolved = nextState instanceof Function ? nextState(state.value) : nextState

    // `initialState` stands in for a key that was never written, so the resolved value can match what
    // the composable already renders while nothing is stored. Writing it is what makes it visible to
    // another reader, and to this one after a reload.
    const written = inBrowser && GlobalStorage.has(key)

    if (!written || state.value !== resolved) {
      if (inBrowser) GlobalStorage.set(key, resolved)
      state.value = resolved
    }
  }

  const handleStorageChange = (newValue: Maybe<T> | undefined) => {
    state.value = newValue
  }

  // Browsers only: the store is a process-wide singleton, so on the server every request would follow
  // every other request's writes, and `onScopeDispose` never runs for a server-rendered request.
  if (inBrowser) {
    GlobalStorage.subscribe(key, handleStorageChange)
  }

  // Use onScopeDispose for cleanup in any effect scope (components, effectScope(), etc.)
  // This safely handles cases where composable is called outside a scope
  if (inBrowser && getCurrentScope()) {
    onScopeDispose(() => {
      GlobalStorage.unsubscribe(key, handleStorageChange)
    })
  }

  return {
    storage: computed(() => state.value),
    setStorage,
  }
}
