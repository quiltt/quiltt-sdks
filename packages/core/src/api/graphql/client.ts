import { ApolloClient, ApolloLink } from '@apollo/client/core'
import type { DefinitionNode, OperationDefinitionNode } from 'graphql'

import { debugging } from '@/config'
import type { SessionTokenSource } from '@/session'

import {
  AuthLink,
  createBatchHttpLink,
  createErrorLink,
  ForwardableLink,
  HttpLink,
  KeepaliveLink,
  RetryLink,
  SubscriptionLink,
} from './links'

export type QuilttClientOptions = Omit<ApolloClient.Options, 'link'> & {
  /** An array of initial links to inject before the default Quiltt Links */
  customLinks?: ApolloLink[]
  /**
   * Where the auth link reads the session token it authenticates with. Defaults to the shared
   * `GlobalStorage` slot, which is what a browser uses; a server render passes its request-local
   * session, because the shared slot cannot hold one session per request. @see SessionTokenSource
   */
  sessionToken?: SessionTokenSource
  /** Platform-specific version link (required) */
  versionLink: ApolloLink
}

export class QuilttClient extends ApolloClient {
  constructor(options: QuilttClientOptions) {
    const finalOptions = {
      ...options,
      devtools: {
        enabled: options.devtools?.enabled ?? debugging,
      },
    }

    const initialLinks = options.customLinks ? [...options.customLinks] : []

    const isOperationDefinition = (def: DefinitionNode): def is OperationDefinitionNode =>
      def.kind === 'OperationDefinition'

    const isSubscriptionOperation = (operation: ApolloLink.Operation) => {
      return operation.query.definitions.some(
        (definition) => isOperationDefinition(definition) && definition.operation === 'subscription'
      )
    }

    const isBatchable = (operation: ApolloLink.Operation) => {
      return operation.getContext().batchable ?? true
    }

    // Every link that authenticates or drops a session takes the same source, so a client
    // authenticates and signs out with one session. Left unset, each link falls back to the shared
    // store, which is what a browser uses.
    const authLink = new AuthLink(options.sessionToken)
    const errorLink = createErrorLink(options.sessionToken)
    const subscriptionsLink = new SubscriptionLink(options.sessionToken)
    // Per client: the batcher sends one request for the operations it queues, and its headers come
    // from the operations in it. Sharing one across clients would put two sessions in one request.
    const batchLink = createBatchHttpLink()

    const quilttLink = ApolloLink.from([
      ...initialLinks,
      options.versionLink,
      authLink,
      errorLink,
      RetryLink,
      KeepaliveLink,
    ] as ApolloLink[])
      .split(isSubscriptionOperation, subscriptionsLink as ApolloLink, ForwardableLink)
      .split(isBatchable, batchLink, HttpLink)

    super({
      link: quilttLink as ApolloLink,
      ...finalOptions,
    })
  }
}

/**
/* Export Apollo GraphQL assets using deep-imports to prevent unnecessary imports
/* and make tree-shaking more effective
*/

/** Client and Tooling */
export type { NormalizedCacheObject } from '@apollo/client/cache'
export { InMemoryCache } from '@apollo/client/cache'
export type { OperationVariables } from '@apollo/client/core'
export { gql } from '@apollo/client/core'
/** React hooks used by @quiltt/react-native and @quiltt/react */
export { useMutation, useQuery, useSubscription } from '@apollo/client/react'
