import { ApolloLink } from '@apollo/client/core'
import { Observable } from 'rxjs'

import type { SessionTokenSource } from '@/session'
import { validateSessionToken } from '@/utils/token-validation'

/**
 * Apollo Link that handles authentication and session expiration for GraphQL requests.
 *
 * Features:
 * - Automatically adds Bearer token to request headers
 * - Detects expired tokens and triggers proper error handling
 * - Drops an expired session through the source it was read from (for the shared store, that
 *   triggers React re-renders via observers)
 * - Emits GraphQL errors for consistent Apollo error handling
 */
export class AuthLink extends ApolloLink {
  /**
   * @param session - Where to read the token from. Defaults to the shared `GlobalStorage` slot, which
   *   is what a browser uses; a server render passes its request-local session, which the shared slot
   *   cannot hold. @see SessionTokenSource
   */
  constructor(private readonly session?: SessionTokenSource) {
    super()
  }

  override request(
    operation: ApolloLink.Operation,
    forward: ApolloLink.ForwardFunction
  ): Observable<ApolloLink.Result> {
    const validation = validateSessionToken('', this.session)

    if (!validation.valid) {
      return new Observable((observer) => {
        observer.error(validation.error)
      })
    }

    const { token } = validation

    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    }))

    return forward(operation)
  }
}
