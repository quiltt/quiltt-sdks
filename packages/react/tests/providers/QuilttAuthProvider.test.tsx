import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

import { createVersionLink, InMemoryCache, QuilttClient, TerminatingLink } from '@quiltt/core'

import { QuilttAuthProvider } from '@/providers/QuilttAuthProvider'
import { isDeepEqual } from '@/utils'

// Create a mock function outside to track calls
const mockImportSession = vi.fn()
// Controllable session value for tests that exercise session-expiry behaviour
let mockSession: object | null = {}

// Mock the useQuilttSession hook
vi.mock('@/hooks', () => ({
  useQuilttSession: () => ({
    get session() {
      return mockSession
    },
    importSession: mockImportSession,
  }),
}))

// Mock the utils
vi.mock('@/utils', () => ({
  isDeepEqual: vi.fn().mockReturnValue(true),
  getPlatformInfo: vi.fn().mockReturnValue('React/19.0.0; Chrome/120'),
}))

// Add mocks for Apollo Client
vi.mock('@apollo/client/react', () => ({
  ApolloProvider: ({ children }: any) => children,
}))

vi.mock('@quiltt/core', () => {
  class MockQuilttClient {
    resetStore = vi.fn()
  }
  class MockInMemoryCache {}
  class MockTerminatingLink {}
  class MockApolloLink {}

  return {
    QuilttClient: MockQuilttClient,
    InMemoryCache: MockInMemoryCache,
    TerminatingLink: MockTerminatingLink,
    createVersionLink: vi.fn(() => new MockApolloLink()),
  }
})

describe('QuilttAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {} // reset to a truthy session before each test
  })

  it('renders children correctly', () => {
    const { getByText } = render(
      <QuilttAuthProvider>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(getByText('Test Child')).toBeTruthy()
  })

  it('handles graphqlClient prop correctly', () => {
    const customClient = new QuilttClient({
      customLinks: [TerminatingLink],
      cache: new InMemoryCache(),
      versionLink: createVersionLink('Test'),
    })
    render(
      <QuilttAuthProvider graphqlClient={customClient}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )
  })

  it('handles token prop correctly', () => {
    const testToken = 'test-token'
    render(
      <QuilttAuthProvider token={testToken}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )
  })

  it('only calls importSession when token value changes, not when reference changes', () => {
    const token = 'test-token-123'

    // Initial render with token
    const { rerender } = render(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(mockImportSession).toHaveBeenCalledTimes(1)
    expect(mockImportSession).toHaveBeenCalledWith(token)

    // Rerender with same token value but new string instance
    rerender(
      <QuilttAuthProvider token={'test-token-123'}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    // Should NOT call importSession again since value is the same
    expect(mockImportSession).toHaveBeenCalledTimes(1)

    // Rerender with different token value
    rerender(
      <QuilttAuthProvider token="different-token">
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    // Should call importSession with new token
    expect(mockImportSession).toHaveBeenCalledTimes(2)
    expect(mockImportSession).toHaveBeenCalledWith('different-token')
  })

  it('allows re-importing same token after it becomes undefined', () => {
    const token = 'test-token-123'

    // Initial render with token
    const { rerender } = render(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(mockImportSession).toHaveBeenCalledTimes(1)
    expect(mockImportSession).toHaveBeenCalledWith(token)

    // Clear token (simulate logout or session end)
    rerender(
      <QuilttAuthProvider token={undefined}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    // importSession shouldn't be called with undefined
    expect(mockImportSession).toHaveBeenCalledTimes(1)

    // Re-import the same token (simulate re-login)
    rerender(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    // Should call importSession again since ref was reset when token became undefined
    expect(mockImportSession).toHaveBeenCalledTimes(2)
    expect(mockImportSession).toHaveBeenCalledWith(token)
  })

  it('re-imports token when session expires while token prop is unchanged', () => {
    const token = 'test-token-123'

    // Render with token and an active session
    mockSession = { token }
    const { rerender } = render(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(mockImportSession).toHaveBeenCalledTimes(1)

    // Simulate expiration timer clearing the session while same token prop remains
    mockSession = null

    rerender(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    // Must re-import to re-establish the session
    expect(mockImportSession).toHaveBeenCalledTimes(2)
    expect(mockImportSession).toHaveBeenCalledWith(token)
  })

  it('does not re-import when session changes to a new truthy value with unchanged token', () => {
    const token = 'stable-token'
    mockSession = { token }

    const { rerender } = render(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(mockImportSession).toHaveBeenCalledTimes(1)

    // Change session to a new truthy object while token stays the same.
    // This triggers the [token, session] effect but neither tokenChanged nor sessionExpired is true.
    mockSession = { token: 'new-session-data' }

    rerender(
      <QuilttAuthProvider token={token}>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(mockImportSession).toHaveBeenCalledTimes(1)
  })

  it('resets apollo store when isDeepEqual indicates session changed', () => {
    vi.mocked(isDeepEqual).mockReturnValue(false)

    const { rerender } = render(
      <QuilttAuthProvider>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    mockSession = { updated: true }
    rerender(
      <QuilttAuthProvider>
        <div>Test Child</div>
      </QuilttAuthProvider>
    )

    expect(vi.mocked(isDeepEqual)).toHaveBeenCalled()

    // Restore default behaviour for subsequent tests
    vi.mocked(isDeepEqual).mockReturnValue(true)
  })
})
