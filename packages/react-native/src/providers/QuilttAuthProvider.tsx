import type { FC } from 'react'
import { useMemo } from 'react'

import { createVersionLink, InMemoryCache, QuilttClient } from '@quiltt/core'
import type { QuilttAuthProviderProps as ReactQuilttAuthProviderProps } from '@quiltt/react'
import { QuilttAuthProvider as ReactQuilttAuthProvider } from '@quiltt/react'

import { getPlatformInfoSync } from '@/utils/telemetry'

export type QuilttAuthProviderProps = ReactQuilttAuthProviderProps

/**
 * React Native-specific QuilttAuthProvider that injects platform information
 * into the GraphQL client's Quiltt-SDK-Agent header.
 *
 * A `token` passed in is validated against the API and adopted into the session in an effect, so
 * children render immediately — the session arrives a render later. @see QuilttAuthProvider
 */
export const QuilttAuthProvider: FC<QuilttAuthProviderProps> = ({
  graphqlClient,
  token,
  children,
}) => {
  // Create React Native-specific GraphQL client with platform info if no custom client provided
  const platformClient = useMemo(() => {
    if (graphqlClient) {
      return graphqlClient
    }

    const platformInfo = getPlatformInfoSync()
    return new QuilttClient({
      cache: new InMemoryCache(),
      versionLink: createVersionLink(platformInfo),
    })
  }, [graphqlClient])

  return (
    <ReactQuilttAuthProvider token={token} graphqlClient={platformClient}>
      {children}
    </ReactQuilttAuthProvider>
  )
}
