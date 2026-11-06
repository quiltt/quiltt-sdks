// Adapted from https://github.com/rmosolgo/graphql-ruby/blob/master/javascript_client/src/subscriptions/ActionCableLink.ts
import { ApolloLink } from '@apollo/client/core'
import type { Consumer } from '@rails/actioncable'
import { createConsumer } from '@rails/actioncable'
import { print } from 'graphql'
import { Observable } from 'rxjs'

import { endpointWebsockets } from '@/config'
import type { SessionTokenSource } from '@/session'
import { validateSessionToken } from '@/utils/token-validation'

type RequestResult = ApolloLink.Result<{ [key: string]: unknown }>
type ConnectionParams = object | ((operation: ApolloLink.Operation) => object)
type SubscriptionCallbacks = {
  connected?: (args?: { reconnected: boolean }) => void
  disconnected?: () => void
  received?: (payload: unknown) => void
}

export class ActionCableLink extends ApolloLink {
  cables: { [id: string]: Consumer }
  channelName: string
  actionName: string
  connectionParams: ConnectionParams
  callbacks: SubscriptionCallbacks
  session?: SessionTokenSource

  constructor(options: {
    channelName?: string
    actionName?: string
    connectionParams?: ConnectionParams
    callbacks?: SubscriptionCallbacks
    /**
     * Where to read the token the WebSocket connects with. Defaults to the shared store, which is
     * what a browser uses; a server render passes the same request-local session its other links
     * authenticate with, because the shared store holds no session for it.
     */
    session?: SessionTokenSource
  }) {
    super()
    this.cables = {}
    this.channelName = options.channelName || 'GraphqlChannel'
    this.actionName = options.actionName || 'execute'
    this.connectionParams = options.connectionParams || {}
    this.callbacks = options.callbacks || {}
    this.session = options.session
  }

  // Interestingly, this link does _not_ call through to `next` because
  // instead, it sends the request to ActionCable.
  override request(
    operation: ApolloLink.Operation,
    _next: ApolloLink.ForwardFunction
  ): Observable<RequestResult> {
    const validation = validateSessionToken('for subscription', this.session)

    if (!validation.valid) {
      return new Observable((observer) => {
        observer.error(validation.error)
      })
    }

    const { token } = validation

    if (!this.cables[token]) {
      this.cables[token] = createConsumer(endpointWebsockets + (token ? `?token=${token}` : ''))
    }

    return new Observable((observer) => {
      let cancelled = false
      const channelId = Math.round(Date.now() + Math.random() * 100000).toString(16)
      const actionName = this.actionName
      const connectionParams =
        typeof this.connectionParams === 'function'
          ? this.connectionParams(operation)
          : this.connectionParams

      const callbacks = this.callbacks
      const channel = this.cables[token].subscriptions.create(
        Object.assign(
          {},
          {
            channel: this.channelName,
            channelId: channelId,
          },
          connectionParams
        ),
        {
          connected: (args?: { reconnected: boolean }) => {
            if (cancelled) return
            channel.perform(actionName, {
              query: operation.query ? print(operation.query) : null,
              variables: operation.variables,
              // This is added for persisted operation support:
              operationId: (operation as { operationId?: string }).operationId,
              operationName: operation.operationName,
            })
            callbacks.connected?.(args)
          },

          received: (payload: { result: RequestResult; more: any }) => {
            if (cancelled) return

            if (payload?.result?.data || payload?.result?.errors) {
              observer.next(payload.result)
            }

            if (!payload.more) {
              observer.complete()
            }

            callbacks.received?.(payload)
          },
          // Intentionally not guarded by `cancelled` - disconnected represents
          // the WebSocket connection state which users may want to know about
          // for cleanup/status purposes, even after the observable completes.
          disconnected: () => {
            callbacks.disconnected?.()
          },
        }
      )

      // Return teardown logic
      return () => {
        cancelled = true
        channel.unsubscribe()
      }
    })
  }
}
