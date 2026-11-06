import { GraphQLError } from 'graphql'

import { JsonWebTokenParse } from '@/auth/json-web-token'
import { type SessionTokenSource, sharedSessionTokenSource } from '@/session'

/**
 * Result of token validation
 */
export type TokenValidationResult =
  | { valid: true; token: string }
  | { valid: false; error: GraphQLError }

/**
 * Validates the session token it is given, or the one in GlobalStorage.
 *
 * This function:
 * - Checks if a session token exists
 * - Validates token expiration
 * - Drops an expired token through the source that provided it (the store, by default, which
 *   triggers observers and re-renders)
 * - Returns appropriate GraphQL errors for authentication failures
 *
 * @param errorMessagePrefix - Optional prefix for error messages (e.g., "for subscription")
 * @param session - Where to read the token from. Defaults to the shared GlobalStorage slot; a server
 *   render passes its request-local session, because it has no shared slot to read.
 * @returns TokenValidationResult indicating whether the token is valid or providing an error
 */
export function validateSessionToken(
  errorMessagePrefix = '',
  session: SessionTokenSource = sharedSessionTokenSource
): TokenValidationResult {
  const token = session.read()

  if (!token) {
    return {
      valid: false,
      error: new GraphQLError(
        `No session token available${errorMessagePrefix ? ` ${errorMessagePrefix}` : ''}`,
        {
          extensions: {
            code: 'UNAUTHENTICATED',
            reason: 'NO_TOKEN',
            documentationUrl: 'https://www.quiltt.dev/authentication#session-tokens',
          },
        }
      ),
    }
  }

  // Check if token is expired
  const jwt = JsonWebTokenParse(token)
  if (jwt?.claims.exp) {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    if (jwt.claims.exp < nowInSeconds) {
      // Drop the token the source handed us, wherever it keeps it.
      session.clear?.()

      return {
        valid: false,
        error: new GraphQLError('Session token has expired', {
          extensions: {
            code: 'UNAUTHENTICATED',
            reason: 'TOKEN_EXPIRED',
            expiredAt: jwt.claims.exp,
            documentationUrl: 'https://www.quiltt.dev/authentication#session-tokens',
          },
        }),
      }
    }
  }

  return { valid: true, token }
}
