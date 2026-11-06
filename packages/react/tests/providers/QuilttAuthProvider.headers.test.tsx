import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { QuilttAuthProvider } from '@/providers/QuilttAuthProvider'

// Track QuilttClient instantiations
let clientInstances: any[] = []
let lastCustomLinks: any[] | undefined

// Mock QuilttClient from core
vi.mock('@quiltt/core', async (importOriginal) => {
  const actual = await importOriginal()

  class MockQuilttClient {
    customLinks: any[] | undefined

    constructor(options: any) {
      this.customLinks = options.customLinks
      lastCustomLinks = options.customLinks
      clientInstances.push(this)
    }

    resetStore = vi.fn().mockResolvedValue(undefined)
    clearStore = vi.fn().mockResolvedValue(undefined)
    stop = vi.fn()
    cache = { reset: vi.fn() }
  }

  // Mock HeadersLink
  class MockHeadersLink {
    headers: Record<string, string>
    constructor(options: { headers: Record<string, string> }) {
      this.headers = options.headers
    }
  }

  return {
    ...(actual as any),
    QuilttClient: MockQuilttClient,
    HeadersLink: MockHeadersLink,
    InMemoryCache: vi.fn(),
    createVersionLink: vi.fn(() => ({})),
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
  }
})

// Mock utils
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    getPlatformInfo: () => ({ platform: 'test' }),
  }
})

describe('QuilttAuthProvider headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clientInstances = []
    lastCustomLinks = undefined
  })

  afterEach(() => {
    cleanup()
  })

  describe('when headers prop is provided', () => {
    it('creates a HeadersLink with the provided headers', () => {
      const headers = { 'X-Custom-Header': 'test-value' }

      render(
        <QuilttAuthProvider headers={headers}>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      expect(clientInstances).toHaveLength(1)
      expect(lastCustomLinks).toBeDefined()
      expect(lastCustomLinks).toHaveLength(1)
      expect(lastCustomLinks![0].headers).toEqual(headers)
    })

    it('does not recreate client when headers are deep-equal', () => {
      const { rerender } = render(
        <QuilttAuthProvider headers={{ 'X-Header': 'value' }}>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      const initialCount = clientInstances.length
      expect(initialCount).toBe(1)

      // Re-render with deep-equal headers (new object reference)
      rerender(
        <QuilttAuthProvider headers={{ 'X-Header': 'value' }}>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      // Should not create a new client
      expect(clientInstances).toHaveLength(1)
    })

    it('recreates client when headers actually change', () => {
      const { rerender } = render(
        <QuilttAuthProvider headers={{ 'X-Header': 'value1' }}>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      expect(clientInstances).toHaveLength(1)

      // Re-render with different headers
      rerender(
        <QuilttAuthProvider headers={{ 'X-Header': 'value2' }}>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      // Should create a new client
      expect(clientInstances).toHaveLength(2)
      expect(lastCustomLinks![0].headers).toEqual({ 'X-Header': 'value2' })
    })
  })

  describe('when headers prop is not provided', () => {
    it('does not include customLinks', () => {
      render(
        <QuilttAuthProvider>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      expect(clientInstances).toHaveLength(1)
      expect(lastCustomLinks).toBeUndefined()
    })
  })

  describe('when graphqlClient prop is provided', () => {
    it('uses the provided client and ignores headers', () => {
      const customClient = {
        resetStore: vi.fn(),
        clearStore: vi.fn(),
        stop: vi.fn(),
        cache: { reset: vi.fn() },
      } as any

      render(
        <QuilttAuthProvider graphqlClient={customClient} headers={{ 'X-Ignored': 'header' }}>
          <div>Test</div>
        </QuilttAuthProvider>
      )

      // Should not create any new clients since custom client is provided
      expect(clientInstances).toHaveLength(0)
    })
  })
})
