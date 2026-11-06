import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApolloLink } from '@apollo/client/core'
import { gql } from '@apollo/client/core'
import { createConsumer } from '@rails/actioncable'
import { Observable } from 'rxjs'

import { ActionCableLink } from '@/api/graphql/links/ActionCableLink'
import { SubscriptionLink } from '@/api/graphql/links/SubscriptionLink'
import { GlobalStorage } from '@/storage'

vi.mock('@/storage', () => ({
  GlobalStorage: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}))

vi.mock('@/auth/json-web-token', () => ({
  JsonWebTokenParse: vi.fn(),
}))

vi.mock('@rails/actioncable', () => ({
  createConsumer: vi.fn(),
}))

const mockQuery = gql`
  {
    mockField
  }
`

const requestSubscription = (link: SubscriptionLink) =>
  link.request(
    { query: mockQuery } as ApolloLink.Operation,
    () => new Observable<ApolloLink.Result>((subscriber) => subscriber.complete())
  )

describe('SubscriptionLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(GlobalStorage.get).mockReturnValue(null)
    vi.mocked(createConsumer).mockReturnValue({
      subscriptions: { create: vi.fn() },
    } as any)
  })

  it('should extend ActionCableLink', () => {
    expect(new SubscriptionLink()).toBeInstanceOf(ActionCableLink)
  })

  it('should use GraphQLChannel as the default channel name', () => {
    const link = new SubscriptionLink()
    expect(link.channelName).toBe('GraphQLChannel')
  })

  it('should use execute as the default action name', () => {
    const link = new SubscriptionLink()
    expect(link.actionName).toBe('execute')
  })

  it('should authenticate the WebSocket with the supplied session source', () => {
    vi.mocked(GlobalStorage.get).mockReturnValue('shared_token')

    requestSubscription(new SubscriptionLink({ read: () => 'request_token' }))

    expect(createConsumer).toHaveBeenCalledWith(expect.stringContaining('token=request_token'))
    expect(GlobalStorage.get).not.toHaveBeenCalled()
  })
})
