import type { ApolloLink } from '@apollo/client/core'
import { BatchHttpLink as ApolloBatchHttpLink } from '@apollo/client/link/batch-http'
import crossfetch from 'cross-fetch'

import { endpointGraphQL } from '@/config'

// Use `cross-fetch` only if `fetch` is not available on the `globalThis` object
const effectiveFetch = typeof fetch === 'undefined' ? crossfetch : fetch

/**
 * Keys a batch by what its operations authenticate as, and by whether they are closes.
 *
 * A batch sends one set of headers for every operation in it, so operations that authenticate as
 * different sessions must never share one: the server would see a single `authorization` header and
 * answer both as that user. Including the header also separates operations queued before and after a
 * sign-in lands mid-batch.
 *
 * Close operations stay in their own class so a non-close request is never co-batched with a close
 * that has `keepalive: true`. This keeps the batch body within the keepalive quota (~64 KiB) when
 * the close is sent during unload.
 */
const batchKey = (operation: ApolloLink.Operation): string => {
  const authorization = operation.getContext().headers?.authorization ?? 'anonymous'
  const kind = /Close$/.test(operation.operationName ?? '') ? 'close' : 'default'

  return `${kind}:${authorization}`
}

/**
 * Builds a batch link.
 *
 * A client has to build its own: the link queues operations and sends them as one request with one
 * set of headers, so a shared instance would let one client's operations travel in another client's
 * batch. On a server that is one request's queries answered with another request's session.
 */
export const createBatchHttpLink = () =>
  new ApolloBatchHttpLink({
    uri: endpointGraphQL,
    fetch: effectiveFetch,
    batchKey,
  })

/** Shared instance for callers building their own chain; `QuilttClient` creates one per client. */
export const BatchHttpLink = createBatchHttpLink()
