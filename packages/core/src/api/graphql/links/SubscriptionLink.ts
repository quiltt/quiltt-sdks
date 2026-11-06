'use client'

import type { SessionTokenSource } from '@/session'

import { ActionCableLink } from './ActionCableLink'

export class SubscriptionLink extends ActionCableLink {
  constructor(session?: SessionTokenSource) {
    super({ channelName: 'GraphQLChannel', session })
  }
}
