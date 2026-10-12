import { endpointAuth, endpointIntrospectSessionToken, version } from '@/config'
import { extractVersionNumber, getSDKAgent } from '@/utils/telemetry'

import type { FetchResponse } from './fetchWithRetry'
import { fetchWithRetry } from './fetchWithRetry'
import type { NoContentData, UnauthorizedData, UnprocessableData } from './types'

export enum AuthStrategies {
  Email = 'email',
  Phone = 'phone',
}

interface EmailInput {
  email: string
  phone?: never
}

interface PhoneInput {
  phone: string
  email?: never
}

export type UsernamePayload = EmailInput | PhoneInput
export type PasscodePayload = UsernamePayload & { passcode: string }

type SessionData = { token: string }

type Ping = SessionData | UnauthorizedData
type Identify = SessionData | NoContentData | UnprocessableData
type Authenticate = SessionData | UnauthorizedData | UnprocessableData
type Revoke = NoContentData | UnauthorizedData

export type SessionResponse = FetchResponse<SessionData>

// https://www.quiltt.dev/api-reference/auth
export class AuthAPI {
  /** The Connector ID, required for identify & authenticate calls */
  clientId: string | undefined
  /** The SDK Agent string for telemetry */
  sdkAgent: string
  /**
   * Custom headers to include with every request.
   * For Quiltt internal usage. Not intended for public use.
   * @internal
   */
  customHeaders: Record<string, string> | undefined

  constructor(
    clientId?: string | undefined,
    customHeaders?: Record<string, string>,
    sdkAgent: string = getSDKAgent(extractVersionNumber(version), 'Unknown')
  ) {
    this.clientId = clientId
    this.customHeaders = customHeaders
    this.sdkAgent = sdkAgent
  }

  /**
   * Validates a Session token via the introspection endpoint.
   *
   * Response Statuses:
   *  - 200: OK           -> Session is Valid
   *  - 401: Unauthorized -> Session is Invalid
   */
  ping = async (token: string) => {
    const response = await fetchWithRetry<Ping>(endpointIntrospectSessionToken, {
      method: 'POST',
      ...this.config(token),
    })
    return response
  }

  /**
   * Response Statuses:
   *  - 201: Created              -> Profile Created, New Session Returned
   *  - 202: Accepted             -> Profile Found, MFA Code Sent for `authenticate`
   *  - 422: Unprocessable Entity -> Invalid Payload
   */
  identify = async (payload: UsernamePayload) => {
    const response = await fetchWithRetry<Identify>(endpointAuth, {
      method: 'POST',
      body: JSON.stringify(this.body(payload)),
      ...this.config(),
    })
    return response
  }

  /**
   * Response Statuses:
   *  - 201: Created              -> MFA Validated, New Session Returned
   *  - 401: Unauthorized         -> MFA Invalid
   *  - 422: Unprocessable Entity -> Invalid Payload
   */
  authenticate = async (payload: PasscodePayload): Promise<FetchResponse<Authenticate>> => {
    const response = await fetchWithRetry<Authenticate>(endpointAuth, {
      method: 'PUT',
      body: JSON.stringify(this.body(payload)),
      ...this.config(),
    })
    return response
  }

  /**
   * Response Statuses:
   *  - 204: No Content   -> Session Revoked
   *  - 401: Unauthorized -> Session Not Found
   */
  revoke = async (token: string): Promise<FetchResponse<Revoke>> => {
    const response = await fetchWithRetry<Revoke>(endpointAuth, {
      method: 'DELETE',
      ...this.config(token),
    })
    return response
  }

  private config = (token?: string) => {
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    headers.set('Quiltt-SDK-Agent', this.sdkAgent)

    // Apply custom headers
    if (this.customHeaders) {
      Object.entries(this.customHeaders).forEach(([key, value]) => {
        headers.set(key, value)
      })
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return {
      headers,
      validateStatus: this.validateStatus,
      retry: true,
    }
  }
  private validateStatus = (status: number) => status < 500 && status !== 429

  private body = (payload: any) => {
    if (!this.clientId) {
      console.error('Quiltt Client ID is not set. Unable to identify & authenticate')
    }

    return {
      session: {
        clientId: this.clientId,
        ...payload,
      },
    }
  }
}
