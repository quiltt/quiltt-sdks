import { describe, expect, it, vi } from 'vitest'

// Import types
import type {
  DocumentNode,
  ErrorData,
  Maybe,
  ObservableQuery,
  QuilttJWT,
  SessionController,
  SessionSnapshot,
  SessionTokenSource,
  SetToken,
} from '@quiltt/react'
/**
 * Verify that @quiltt/react exports:
 * 1. All @quiltt/core modules (re-exports)
 * 2. Apollo Client types and hooks
 * 3. React-specific hooks, components, and providers
 * 4. Does NOT export utils from the main entry point
 */
import * as ReactExports from '@quiltt/react'
import {
  ApolloClient,
  ApolloProvider,
  AuthAPI,
  ConnectorsAPI,
  createSessionController,
  GlobalStorage,
  gql,
  InMemoryCache,
  JsonWebTokenParse,
  MockedProvider,
  markSessionCleared,
  NetworkStatus,
  QuilttAuthProvider,
  QuilttButton,
  QuilttClient,
  QuilttContainer,
  QuilttProvider,
  QuilttSettingsProvider,
  SESSION_STORAGE_KEY,
  sharedSessionTokenSource,
  Timeoutable,
  useApolloClient,
  useLazyQuery,
  useMutation,
  useQuery,
  useQuilttClient,
  useQuilttConnector,
  useQuilttInstitutions,
  useQuilttResolvable,
  useQuilttSession,
  useQuilttSettings,
  useSession,
  useStorage,
  useSubscription,
} from '@quiltt/react'

describe('@quiltt/react exports', () => {
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

    // `useSession` returns a `SessionController`, so an app annotating that value needs the type and
    // the constructor from the package it already depends on.
    it('re-exports the session helpers from @quiltt/core', () => {
      GlobalStorage.set(SESSION_STORAGE_KEY, null)

      const set = vi.fn<SetToken>((token) => GlobalStorage.set(SESSION_STORAGE_KEY, token))
      const controller: SessionController = createSessionController(set)
      const snapshot: SessionSnapshot = controller.snapshot()

      expect(SESSION_STORAGE_KEY).toBe('session')
      expect(typeof markSessionCleared).toBe('function')
      expect(typeof sharedSessionTokenSource.read).toBe('function')

      // The real implementation, not a re-exported stub: adopting an unchanged slot writes through.
      expect(controller.adopt('session-token', snapshot)).toBe(true)
      expect(set).toHaveBeenCalledWith('session-token')
    })

    it('re-exports the session token source type from @quiltt/core', () => {
      const source: SessionTokenSource = { read: () => null }
      expect(source.read()).toBeNull()
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

  describe('React components and providers', () => {
    it.each([
      ['QuilttAuthProvider', QuilttAuthProvider],
      ['QuilttButton', QuilttButton],
      ['QuilttContainer', QuilttContainer],
      ['QuilttProvider', QuilttProvider],
      ['QuilttSettingsProvider', QuilttSettingsProvider],
    ])('exports component %s', (_name, exported) => {
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('function')
    })
  })

  describe('React hooks', () => {
    it.each([
      ['useQuilttClient', useQuilttClient],
      ['useQuilttConnector', useQuilttConnector],
      ['useQuilttInstitutions', useQuilttInstitutions],
      ['useQuilttResolvable', useQuilttResolvable],
      ['useQuilttSession', useQuilttSession],
      ['useQuilttSettings', useQuilttSettings],
      ['useSession', useSession],
      ['useStorage', useStorage],
    ])('exports hook %s', (_name, exported) => {
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('function')
    })
  })

  describe('Types', () => {
    it('exports type utilities', () => {
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
      expect(ReactExports).not.toHaveProperty('getSDKAgent')
      expect(ReactExports).not.toHaveProperty('getBrowserInfo')
      expect(ReactExports).not.toHaveProperty('isDeepEqual')
    })

    it('exports utils via subpath import', async () => {
      // Utils should still be available via subpath import
      const utils = await import('@quiltt/react/utils')
      expect(utils.getSDKAgent).toBeDefined()
      expect(utils.isDeepEqual).toBeDefined()
      expect(typeof utils.getSDKAgent).toBe('function')
      expect(typeof utils.isDeepEqual).toBe('function')
    })
  })
})
