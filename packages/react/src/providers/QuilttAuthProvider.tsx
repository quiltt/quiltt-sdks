'use client'

import type { FC, PropsWithChildren } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { ApolloProvider } from '@apollo/client/react'
import { createVersionLink, HeadersLink, InMemoryCache, QuilttClient } from '@quiltt/core'

import { useQuilttSession } from '@/hooks'
import { getPlatformInfo, isDeepEqual } from '@/utils'

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
 * If a token is provided, will validate the token against the api and then import
 * it into trusted storage. While this process is happening, the component is put
 * into a loading state and the children are not rendered to prevent race conditions
 * from triggering within the transitionary state.
 */
export const QuilttAuthProvider: FC<QuilttAuthProviderProps> = ({
  graphqlClient,
  headers,
  token,
  children,
}) => {
  const { session, importSession } = useQuilttSession()
  const previousSessionRef = useRef(session)
  const previousTokenRef = useRef<string | undefined>(undefined)
  const previousHeadersRef = useRef<Record<string, string> | undefined>(undefined)
  const importSessionRef = useRef(importSession)

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

  // Reset Client Store when session changes (using deep comparison)
  useEffect(() => {
    if (!isDeepEqual(session, previousSessionRef.current)) {
      apolloClient.resetStore()
      previousSessionRef.current = session
    }
  }, [session, apolloClient])

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}
