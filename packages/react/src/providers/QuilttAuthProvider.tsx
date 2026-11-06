'use client'

import type { FC, PropsWithChildren } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { ApolloProvider } from '@apollo/client/react'
import {
  createVersionLink,
  GlobalStorage,
  HeadersLink,
  InMemoryCache,
  QuilttClient,
  SESSION_STORAGE_KEY,
} from '@quiltt/core'

import { useQuilttSession } from '@/hooks'
import { getPlatformInfo, isDeepEqual } from '@/utils'

// The session each client's cache was last built for. A client passed in through `graphqlClient`
// outlives this provider, so a remount cannot assume the cache belongs to the session it restores
// from storage.
const cacheSessionOwners = new WeakMap<QuilttClient, string | null>()

export type QuilttAuthProviderProps = PropsWithChildren & {
  /**
   * A custom QuilttClient instance to use instead of the default.
   * Note: When provided, the `headers` prop is ignored since the custom client
   * manages its own link chain. To add custom headers with a custom client,
   * include a HeadersLink in your client's customLinks option.
   */
  graphqlClient?: QuilttClient
  /**
   * Custom headers to include with every GraphQL request.
   * Only applies when using the default client (i.e., when `graphqlClient` is not provided).
   * For Quiltt internal usage. Not intended for public use.
   * @internal
   */
  headers?: Record<string, string>
  /** The Quiltt Session token obtained from the server */
  token?: string
}

/**
 * Provides the Apollo client every Quiltt hook and component below it uses, and keeps that client's
 * cache belonging to the current session.
 *
 * A `token` passed in is validated against the API and adopted into the session in an effect, so
 * children render immediately — the session arrives a render later. The store is reset when the
 * session changes, and when a reused client's cache belongs to a different session, but not for the
 * session a mount starts with: that is a restore, not a sign-in. @see useSession
 */
export const QuilttAuthProvider: FC<QuilttAuthProviderProps> = ({
  graphqlClient,
  headers,
  token,
  children,
}) => {
  const { session, importSession, restored } = useQuilttSession()
  const previousSessionRef = useRef(session)
  const previousTokenRef = useRef<string | undefined>(undefined)
  const previousHeadersRef = useRef<Record<string, string> | undefined>(undefined)
  const importSessionRef = useRef(importSession)

  // Whether `previousSessionRef` holds a session that has been read, rather than the default a
  // render before the restore had to use. The first session a mount reads is what the cache will
  // belong to, so it is the baseline, not a change.
  const hasBaselineRef = useRef(false)

  // The session storage held before any effect could change it. A client handed in through
  // `graphqlClient` arrives with a cache that belongs to whatever session was in place then, and that
  // is the only moment the answer is still available: a saved token that has expired is cleared by
  // the first commit, before this provider has a session to compare against.
  const mountTokenRef = useRef<string | null | undefined>(undefined)
  if (mountTokenRef.current === undefined) {
    mountTokenRef.current = GlobalStorage.get(SESSION_STORAGE_KEY) ?? null
  }

  // Keep importSession ref up to date
  useEffect(() => {
    importSessionRef.current = importSession
  }, [importSession])

  // Stabilize headers using deep comparison to prevent unnecessary client recreation
  // when consumers pass inline object literals
  const stableHeaders = useMemo(() => {
    if (isDeepEqual(headers, previousHeadersRef.current)) {
      return previousHeadersRef.current
    }
    previousHeadersRef.current = headers
    return headers
  }, [headers])

  // Memoize the client to avoid unnecessary re-renders
  const apolloClient = useMemo(() => {
    if (graphqlClient) return graphqlClient

    const customLinks = stableHeaders ? [new HeadersLink({ headers: stableHeaders })] : undefined

    return new QuilttClient({
      cache: new InMemoryCache(),
      versionLink: createVersionLink(getPlatformInfo()),
      customLinks,
    })
  }, [graphqlClient, stableHeaders])

  // Import passed in token when it changes, or when the session was cleared
  // externally while the same token is still being passed (e.g. expiration timer).
  useEffect(() => {
    if (!token) {
      // Reset ref when token becomes undefined to allow re-import of same token later
      previousTokenRef.current = undefined
      return
    }

    const tokenChanged = token !== previousTokenRef.current
    // Session was cleared externally (e.g. expiration timer) while the same token
    // prop is still set — we need to re-import to re-establish the session.
    const sessionExpired = !session && previousTokenRef.current === token

    if (tokenChanged || sessionExpired) {
      importSessionRef.current(token)
      previousTokenRef.current = token
    }
  }, [token, session])

  // Reset the Apollo store when the session changes so data cached under a previous
  // session is never served to a different one.
  useEffect(() => {
    // Record what a client's cache arrived holding before deciding anything. Without this an
    // inherited cache has no owner: a session that ends during the first commit — a saved token
    // cleared while the session is still unread — would be recorded as belonging to nobody, and the
    // data it holds would stay available after the session ended.
    if (!cacheSessionOwners.has(apolloClient)) {
      cacheSessionOwners.set(apolloClient, mountTokenRef.current ?? null)
    }

    // Nothing can be decided about a session that has not been read yet. A render that has to match
    // the server's markup cannot read storage, so its empty session may be a stored one arriving
    // next; resetting or recording an owner then would either discard a cache that belongs to the
    // session rendered or hand this session's cache to that arrival.
    if (!restored) return

    const token = session?.token ?? null

    // A session this mount starts with is not a change, but its cache still has to belong to it: a
    // client passed in through `graphqlClient` outlives the provider, so a remount can inherit data
    // cached for a session this mount never rendered.
    const cacheSessionOwner = cacheSessionOwners.get(apolloClient)
    const inheritedFromAnotherSession =
      cacheSessionOwner !== undefined && cacheSessionOwner !== token

    const changed = hasBaselineRef.current && !isDeepEqual(session, previousSessionRef.current)

    if (inheritedFromAnotherSession || changed) {
      apolloClient.resetStore().catch(() => {
        // resetStore cancels and refetches active queries; the rejection it emits for the
        // cancelled in-flight queries is expected, so ignore it.
      })
    }

    // Recorded once the session is known, so the next mount can tell whose data this cache holds.
    cacheSessionOwners.set(apolloClient, token)
    previousSessionRef.current = session
    hasBaselineRef.current = true
  }, [session, restored, apolloClient])

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}
