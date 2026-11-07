import type { ApolloLink } from '@apollo/client/core'
import { ErrorLink as ApolloErrorLink } from '@apollo/client/link/error'
import type { GraphQLFormattedError } from 'graphql'

import { type SessionTokenSource, sharedSessionTokenSource } from '@/session'

/** The token a request carried, as `AuthLink` recorded it on the operation. */
const requestToken = (operation: ApolloLink.Operation): string | undefined => {
  const authorization = operation.getContext().headers?.authorization
  if (typeof authorization !== 'string') return undefined

  const [scheme, value] = authorization.split(' ')

  return scheme?.toLowerCase() === 'bearer' ? value : undefined
}

/**
 * Builds the link that reports GraphQL errors and drops the session a `401` rejected.
 *
 * The rejected session is dropped through the source the request authenticated with, so a server
 * render drops that request's session rather than the process-wide store, which holds no session for
 * it. @see SessionTokenSource
 */
export const createErrorLink = (session: SessionTokenSource = sharedSessionTokenSource) =>
  new ApolloErrorLink(({ error, result, operation }) => {
    // In Apollo Client 4, errors are consolidated to the 'error' and 'result' properties

    // Handle GraphQL errors from result
    if (result?.errors) {
      result.errors.forEach((graphQLError: GraphQLFormattedError) => {
        const { message, path, extensions } = graphQLError
        const formattedPath = Array.isArray(path) ? path.join('.') : (path ?? 'N/A')
        const parts = [`[Quiltt][GraphQL Error]: ${message}`, `Path: ${formattedPath}`]

        if (extensions) {
          if (extensions.code) parts.push(`Code: ${extensions.code}`)
          if (extensions.errorId) parts.push(`Error ID: ${extensions.errorId}`)
          if (extensions.instruction) parts.push(`Instruction: ${extensions.instruction}`)
          if (extensions.documentationUrl) {
            parts.push(`Docs: ${extensions.documentationUrl}`)
          }
        }

        console.warn(parts.join(' | '))
      })
    }

    // Handle network/server errors
    if (error) {
      if ('statusCode' in error && error.statusCode === 401) {
        console.warn('[Quiltt][Authentication Error]:', error)

        // A `401` is about the token that sent the request. By the time it lands the session may
        // have moved on — a refresh, or a sign-in as someone else — and clearing it would sign that
        // newer session out. Drop the token the request actually used, and only while it is still
        // the one in place. A chain that authenticates without `AuthLink` carries no token to
        // compare, so it keeps clearing, as it always has.
        const sent = requestToken(operation)
        if (sent === undefined || session.read() === sent) session.clear?.()
      } else if ('statusCode' in error) {
        console.warn('[Quiltt][Server Error]:', error)
      } else {
        console.warn('[Quiltt][Network Error]:', error)
      }
    }
  })

/** Reports errors for the shared store, which is what a browser client authenticates with. */
export const ErrorLink = createErrorLink()
