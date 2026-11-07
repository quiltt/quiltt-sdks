import { createContext } from 'react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'

import { QuilttButton } from '@/components/QuilttButton'
import { QuilttContainer } from '@/components/QuilttContainer'
import { QuilttProvider } from '@/providers/QuilttProvider'

// Mock QuilttClient from core with proper async behavior
vi.mock('@quiltt/core', async (importOriginal) => {
  const actual = await importOriginal()

  class MockQuilttClient {
    apolloClient = {
      resetStore: vi.fn().mockResolvedValue(undefined),
      clearStore: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      cache: {
        reset: vi.fn(),
      },
    }
  }

  return {
    ...(actual as any),
    QuilttClient: MockQuilttClient,
    // The provider reads the stored session during render to tell a mount-time restore apart from a
    // session change. Keep the real store's machinery; none is available in this test.
    GlobalStorage: { ...(actual as any).GlobalStorage, get: () => undefined },
    SESSION_STORAGE_KEY: 'session',
  }
})

// Mock the hooks module
vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useQuilttSession: () => ({
      session: null,
      importSession: vi.fn(),
    }),
    useQuilttConnector: vi.fn(() => ({
      open: vi.fn(),
    })),
    QuilttSettings: createContext({ clientId: undefined }),
  }
})

describe('QuilttProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders children correctly', async () => {
    const { getByText } = render(
      <QuilttProvider clientId="test-client-id">
        <div>Test Child</div>
      </QuilttProvider>
    )

    await waitFor(() => {
      expect(getByText('Test Child')).toBeTruthy()
    })
  })

  it('accepts and passes clientId prop', async () => {
    const testClientId = 'test-client-id'
    const { container } = render(
      <QuilttProvider clientId={testClientId}>
        <div>Test Child</div>
      </QuilttProvider>
    )

    await waitFor(() => {
      expect(container).toBeTruthy()
    })
  })

  describe('Render Guard', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    describe('QuilttButton', () => {
      it('logs error when QuilttButton is in same component as QuilttProvider', () => {
        // Simulate the anti-pattern: Provider and Button in same component
        function BadComponent() {
          return (
            <QuilttProvider token="test-token">
              <QuilttButton connectorId="test-connector">Click me</QuilttButton>
            </QuilttProvider>
          )
        }

        render(<BadComponent />)

        // The render guard should detect this anti-pattern
        expect(consoleErrorSpy).toHaveBeenCalled()
        const errorCalls = consoleErrorSpy.mock.calls.filter((call: any) =>
          call[0]?.toString().includes('POTENTIAL ANTI-PATTERN')
        )
        expect(errorCalls.length).toBeGreaterThan(0)
      })

      // Note: Due to React's context propagation, child components will still receive
      // the isRenderingProvider flag. A more sophisticated implementation would require
      // tracking render stack depth, which adds complexity. For now, the guard detects
      // the anti-pattern but may also trigger for valid nested patterns.
      // The key use case (same component) is properly detected.
    })

    describe('QuilttContainer', () => {
      it('logs error when QuilttContainer is in same component as QuilttProvider', () => {
        function BadComponent() {
          return (
            <QuilttProvider token="test-token">
              <QuilttContainer connectorId="test-connector">
                <div>Content</div>
              </QuilttContainer>
            </QuilttProvider>
          )
        }

        render(<BadComponent />)

        expect(consoleErrorSpy).toHaveBeenCalled()
        const errorCalls = consoleErrorSpy.mock.calls.filter((call: any) =>
          call[0]?.toString().includes('POTENTIAL ANTI-PATTERN')
        )
        expect(errorCalls.length).toBeGreaterThan(0)
      })
    })

    describe('Multiple SDK components', () => {
      it('logs error for SDK components in same component as provider', () => {
        function BadComponent() {
          return (
            <QuilttProvider token="test-token">
              <QuilttButton connectorId="test-connector-1">Button 1</QuilttButton>
              <QuilttButton connectorId="test-connector-2">Button 2</QuilttButton>
              <QuilttContainer connectorId="test-connector-3">
                <div>Container</div>
              </QuilttContainer>
            </QuilttProvider>
          )
        }

        render(<BadComponent />)

        const errorCalls = consoleErrorSpy.mock.calls.filter((call: any) =>
          call[0]?.toString().includes('POTENTIAL ANTI-PATTERN')
        )
        // Should detect the components
        expect(errorCalls.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('Error message content', () => {
      it('includes correct component name in error', () => {
        function BadComponent() {
          return (
            <QuilttProvider token="test-token">
              <QuilttButton connectorId="test-connector">Click me</QuilttButton>
            </QuilttProvider>
          )
        }

        render(<BadComponent />)

        const errorCall = consoleErrorSpy.mock.calls.find((call: any) =>
          call[0]?.toString().includes('POTENTIAL ANTI-PATTERN')
        )
        expect(errorCall).toBeDefined()
        expect(errorCall![0]).toContain('QuilttButton')
      })

      it('includes helpful recommendations in error', () => {
        function BadComponent() {
          return (
            <QuilttProvider token="test-token">
              <QuilttButton connectorId="test-connector">Click me</QuilttButton>
            </QuilttProvider>
          )
        }

        render(<BadComponent />)

        const errorCall = consoleErrorSpy.mock.calls.find((call: any) =>
          call[0]?.toString().includes('POTENTIAL ANTI-PATTERN')
        )
        expect(errorCall).toBeDefined()
        const errorMessage = errorCall![0]
        expect(errorMessage).toContain('RECOMMENDED PATTERN')
        expect(errorMessage).toContain('Move QuilttProvider to a parent component')
        expect(errorMessage).toContain('Example')
      })
    })
  })
})
