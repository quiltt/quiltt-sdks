import { describe, expect, it, vi } from 'vitest'

// Mock React Native dependencies
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0' },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: 'View',
  Text: 'Text',
  ActivityIndicator: 'ActivityIndicator',
}))
vi.mock('react-native-webview', () => ({
  default: vi.fn(),
}))

// Mock Honeybadger to avoid initialization issues in tests
vi.mock('@honeybadger-io/react-native', () => ({
  default: {
    notify: vi.fn(),
    setContext: vi.fn(),
    resetContext: vi.fn(),
  },
}))

// Import types
import type {
  DocumentNode,
  ErrorData,
  Maybe,
  ObservableQuery,
  QuilttJWT,
} from '@quiltt/react-native'
/**
 * Verify that @quiltt/react-native exports:
 * 1. All @quiltt/core modules (via @quiltt/react)
 * 2. All @quiltt/react hooks and utilities
 * 3. Apollo Client types and hooks (via @quiltt/react)
 * 4. React Native-specific components and providers
 * 5. Does NOT export utils from the main entry point
 */
import * as ReactNativeExports from '@quiltt/react-native'
import {
  ApolloClient,
  ApolloProvider,
  AuthAPI,
  ConnectorsAPI,
  GlobalStorage,
  gql,
  InMemoryCache,
  JsonWebTokenParse,
  MockedProvider,
  NetworkStatus,
  QuilttAuthProvider,
  QuilttClient,
  QuilttConnector,
  QuilttProvider,
  Timeoutable,
  useApolloClient,
  useLazyQuery,
  useMutation,
  useQuery,
  useQuilttClient,
  useQuilttConnector,
  useQuilttSession,
  useQuilttSettings,
  useSession,
  useStorage,
  useSubscription,
} from '@quiltt/react-native'

describe('@quiltt/react-native exports', () => {
  describe('Core re-exports', () => {
    it.each([
      ['AuthAPI', AuthAPI],
      ['ConnectorsAPI', ConnectorsAPI],
      ['QuilttClient', QuilttClient],
      ['Timeoutable', Timeoutable],
      ['JsonWebTokenParse', JsonWebTokenParse],
    ])('re-exports %s from @quiltt/core', (_name, exported) => {
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('function')
    })

    it('re-exports GlobalStorage instance from @quiltt/core', () => {
      expect(GlobalStorage).toBeDefined()
      expect(typeof GlobalStorage).toBe('object')
    })
  })

  describe('Apollo Client re-exports', () => {
    it.each([
      ['ApolloClient', ApolloClient],
      ['ApolloProvider', ApolloProvider],
      ['InMemoryCache', InMemoryCache],
      ['MockedProvider', MockedProvider],
      ['gql', gql],
      ['NetworkStatus', NetworkStatus],
    ])('re-exports %s from @apollo/client', (_name, exported) => {
      expect(exported).toBeDefined()
    })

    it.each([
      ['useQuery', useQuery],
      ['useMutation', useMutation],
      ['useLazyQuery', useLazyQuery],
      ['useSubscription', useSubscription],
      ['useApolloClient', useApolloClient],
    ])('re-exports hook %s from @apollo/client', (_name, exported) => {
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('function')
    })
  })

  describe('React hooks re-exports', () => {
    it.each([
      ['useQuilttClient', useQuilttClient],
      ['useQuilttConnector', useQuilttConnector],
      ['useQuilttSession', useQuilttSession],
      ['useQuilttSettings', useQuilttSettings],
      ['useSession', useSession],
      ['useStorage', useStorage],
    ])('re-exports hook %s from @quiltt/react', (_name, exported) => {
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('function')
    })
  })

  describe('React Native components and providers', () => {
    it.each([
      ['QuilttAuthProvider', QuilttAuthProvider],
      ['QuilttProvider', QuilttProvider],
    ])('exports %s', (_name, exported) => {
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('function')
    })

    it('exports QuilttConnector (forwardRef component)', () => {
      expect(QuilttConnector).toBeDefined()
      // forwardRef components are objects in React
      expect(typeof QuilttConnector).toBe('object')
    })
  })

  describe('Types', () => {
    it('exports type utilities from core and react', () => {
      // Type-only imports don't create runtime values, so we just verify they compile
      const _maybe: Maybe<string> = null
      const _jwt: QuilttJWT | undefined = undefined
      const _error: ErrorData | undefined = undefined
      const _observableQueryResult: ObservableQuery.Result<unknown> | undefined = undefined
      const _document: DocumentNode | undefined = undefined
      // Note: Hook option types (useMutation.Options, useQuery.Options, etc.) are not
      // exported directly. Use Parameters<typeof useMutation>[0] or import from @apollo/client

      expect(true).toBe(true)
    })
  })

  describe('Utils exclusion', () => {
    it('does NOT export utils from main entry point', () => {
      // Utils functions should not be in the default exports
      expect(ReactNativeExports).not.toHaveProperty('getSDKAgent')
      expect(ReactNativeExports).not.toHaveProperty('getBrowserInfo')
      expect(ReactNativeExports).not.toHaveProperty('isDeepEqual')
      expect(ReactNativeExports).not.toHaveProperty('getPlatformInfo')
    })

    it('exports utils via subpath import', async () => {
      // Utils should still be available via subpath import
      const utils = await import('@quiltt/react-native/utils')
      expect(utils.getSDKAgent).toBeDefined()
      expect(utils.getPlatformInfo).toBeDefined()
      expect(typeof utils.getSDKAgent).toBe('function')
      expect(typeof utils.getPlatformInfo).toBe('function')
    })
  })
})
