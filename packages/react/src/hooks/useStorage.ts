'use client'

import type { Dispatch, SetStateAction } from 'react'
import * as React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'

import type { Maybe } from '@quiltt/core'
import { GlobalStorage } from '@quiltt/core'

import { isDeepEqual } from '@/utils'

import { useIsomorphicLayoutEffect } from './helpers/useIsomorphicLayoutEffect'

/** What a storage-backed hook needs from the store: the live value, a server-safe one, and changes. */
interface StorageSource<T> {
  /** The slot's contents, standing in the default for a key that was never written. */
  getSnapshot: () => Maybe<T> | undefined
  /** What a server render, and the hydration render that has to match it, may use. */
  getServerSnapshot: () => Maybe<T> | undefined
  subscribe: (onStoreChange: () => void) => () => void
}

type SyncStore = <Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot?: () => Snapshot
) => Snapshot

// `useSyncExternalStore` is the only way to read the slot on the first client render — so a screen
// mounted straight into the browser starts from the stored value instead of the default, and an
// effect that redirects on an empty session does not run for a signed-in user — while a hydration
// render still produces the server's markup. React 18 added it; React 17 and earlier keep the eager
// first read they have always done, which cannot tell the two renders apart.
const useSyncExternalStore = (React as unknown as { useSyncExternalStore?: SyncStore })
  .useSyncExternalStore

const useSyncedValue = <T>(source: StorageSource<T>) =>
  (useSyncExternalStore as SyncStore)(
    source.subscribe,
    source.getSnapshot,
    source.getServerSnapshot
  )

const useEagerValue = <T>(source: StorageSource<T>) => {
  const [value, setValue] = useState<Maybe<T> | undefined>(source.getSnapshot)

  // Adopt and subscribe in one layout pass. A new `source` is a different key, whose value has to
  // replace the old one before paint, and a write made between the render and the subscription — a
  // `useLayoutEffect` sign-in, say — would otherwise never arrive.
  useIsomorphicLayoutEffect(() => {
    const update = () => setValue(source.getSnapshot())
    update()

    return source.subscribe(update)
  }, [source])

  return value
}

const useStoredValue: <T>(source: StorageSource<T>) => Maybe<T> | undefined = useSyncExternalStore
  ? useSyncedValue
  : useEagerValue

/**
 * Attempt to persist state with local storage, so it remains after refresh and
 * across open documents. Falls back to in memory storage when localStorage is
 * unavailable.
 *
 * This hook is used in the same way as useState except that you must pass the
 * storage key in the 1st parameter. A server render cannot read storage, so it returns the
 * default; a mount in the browser starts from the stored value, so a component's first effects
 * see what the user actually has.
 *
 * Expect values to remain in sync
 *   Across Hooks
 *   Across Reloads
 *   Across Windows (Documents)
 *
 * @param key
 * @param initialState
 * @returns `[storage, setStorage, restored]` — the value, the setter, and whether that value is the
 *   one the browser's storage holds. `restored` is `false` until this hook commits on the client,
 *   which on a hydration render is the point at which the stored value has replaced the default the
 *   server had to render. Until it is `true`, do not read an empty value as "there is no value".
 */
export const useStorage = <T>(
  key: string,
  initialState?: Maybe<T>
): [Maybe<T> | undefined, Dispatch<SetStateAction<Maybe<T> | undefined>>, boolean] => {
  // The default each key was first given. A default is mount-time state, like `useState`'s: once a
  // key has been shown with a value, a later prop change must not silently become the value its
  // updaters resolve against while the hook still renders the first one.
  const initialValues = useRef(new Map<string, Maybe<T> | undefined>())

  // Default values are routinely passed inline (`useStorage('settings', {})`), so their identity
  // changes on every render. Reading the latest one through a ref keeps `initialValueForKey` stable:
  // if it depended on `initialState` it would be rebuilt each render, `getSnapshot` with it, and
  // every read would look like a change against a store that parses a fresh object per read.
  const initialStateRef = useRef(initialState)
  initialStateRef.current = initialState

  const initialValueForKey = useCallback((storageKey: string) => {
    if (!initialValues.current.has(storageKey)) {
      initialValues.current.set(storageKey, initialStateRef.current)
    }

    return initialValues.current.get(storageKey)
  }, [])

  // A default stands in only for a key that was never written. An empty read is not enough to tell
  // that apart from a key that was written and then cleared, so ask the store which it is: otherwise
  // the default comes back after a clear, and a hook pointed at a different key inherits the
  // previous key's history.
  const read = useCallback(() => {
    if (!GlobalStorage.has(key)) return initialValueForKey(key)

    return GlobalStorage.get(key)
  }, [key, initialValueForKey])

  // A read parses a fresh object out of localStorage every time, and a snapshot has to keep its
  // identity while the value has not changed: `useSyncExternalStore` reads one on every render, and
  // a new identity each time is a change, so the re-renders never settle. A default whose identity
  // changes every render (`useStorage('settings', {})`) is covered for the same reason.
  const snapshot = useRef<Maybe<T> | undefined>(undefined)
  const getSnapshot = useCallback(() => {
    const next = read()
    if (isDeepEqual(next, snapshot.current)) return snapshot.current

    snapshot.current = next
    return next
  }, [read])

  // The server cannot read storage, so it renders the default; so does the hydration pass that has
  // to match it. The stored value arrives from `getSnapshot` once the browser takes over.
  const getServerSnapshot = useCallback(() => initialValueForKey(key), [key, initialValueForKey])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Writes from other hooks, other tabs, and other Quiltt apps on the page all arrive here.
      GlobalStorage.subscribe(key, onStoreChange)

      return () => GlobalStorage.unsubscribe(key, onStoreChange)
    },
    [key]
  )

  const source = useMemo<StorageSource<T>>(
    () => ({ getSnapshot, getServerSnapshot, subscribe }),
    [getSnapshot, getServerSnapshot, subscribe]
  )

  const value = useStoredValue(source)

  // Whether the value above is the browser's rather than the default the server had to render.
  // `useSyncExternalStore` hands a hydration render the server snapshot and swaps in the stored
  // value before paint, so a value is only certain once this hook has committed on the client.
  // Callers that decide something on an empty value — redirecting a signed-out visitor, say — have
  // to wait for this, or they act on a value the user never had.
  const [restored, setRestored] = useState(false)
  useIsomorphicLayoutEffect(() => setRestored(true), [])

  const setStorage = useCallback(
    (nextState: Maybe<T> | SetStateAction<Maybe<T> | undefined>) => {
      // Resolve updater functions against the live value rather than this render's snapshot.
      // Like `setState`, callers expect the updater to see the current state; here that matters
      // more, because the value is shared (other hooks, other tabs) and a stale snapshot resolves
      // against a value that may already have been replaced or cleared.
      const currentState = read()
      const newState = nextState instanceof Function ? nextState(currentState) : nextState
      // A default stands in for a key that was never written, so `currentState` can equal the value
      // being set while nothing is stored yet — `useStorage('theme', 'dark')` returning `'dark'` is
      // the default, not a saved value. Skipping the write there would leave storage empty and every
      // other reader, this tab after a reload included, without a value. Only an equal value on a
      // key that already holds one is a no-op.
      if (!GlobalStorage.has(key) || currentState !== newState) {
        // The store notifies every subscriber, this hook included, which re-reads `getSnapshot`.
        GlobalStorage.set(key, newState)
      }
    },
    [key, read]
  )

  return [value, setStorage, restored]
}
