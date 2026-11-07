// ============================================================================
// @quiltt/react-native - React Native Components for Quiltt
// ============================================================================
// This package provides React Native-specific components and hooks for
// integrating Quiltt into mobile applications built with React Native or Expo.
// It re-exports all @quiltt/core and @quiltt/react functionality with
// platform-specific implementations where needed.
//
// Main exports:
// - All @quiltt/core modules (API clients, auth, config, storage, types)
// - All @quiltt/react hooks and utilities
// - Apollo Client types, hooks, and components (via @quiltt/react)
// - React Native-specific components (QuilttConnector)
// - Platform-specific providers (QuilttProvider, QuilttAuthProvider)
//
// Note: Utils are NOT exported from the main entry point. Access utils via
// subpath import: '@quiltt/react-native/utils'
// ============================================================================

// Hermes doesn't have atob - polyfill for JWT decoding
// https://github.com/facebook/hermes/issues/1178
import { decode } from 'base-64'

if (!global.atob) {
  global.atob = decode
}

// ============================================================================
// Quiltt Core - Re-export all modules from @quiltt/core
// ============================================================================
// Re-export all core Quiltt functionality. Note: We exclude utils from the
// main entry as we provide platform-specific implementations.
export * from '@quiltt/core/api'
export * from '@quiltt/core/auth'
export * from '@quiltt/core/config'
export * from '@quiltt/core/observables'
export * from '@quiltt/core/session'
export * from '@quiltt/core/storage'
export * from '@quiltt/core/timing'
export * from '@quiltt/core/types'
// ============================================================================
// Apollo Client - Re-export from @quiltt/react
// ============================================================================
// Apollo Client types for GraphQL operations.
// Note: For hook options types, use Parameters<typeof useMutation>[0],
// Parameters<typeof useQuery>[0], etc., or import directly from @apollo/client.
// For query results, use ObservableQuery.Result<T>.
export type {
  DocumentNode,
  ErrorPolicy,
  FetchPolicy,
  NormalizedCacheObject,
  OperationVariables,
  TypedDocumentNode,
  WatchQueryFetchPolicy,
} from '@quiltt/react'
export {
  ApolloClient,
  ApolloProvider,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  createQueryPreloader,
  gql,
  InMemoryCache,
  LinkError,
  LocalStateError,
  MockedProvider,
  NetworkStatus,
  ObservableQuery,
  ServerError,
  ServerParseError,
  skipToken,
  UnconventionalError,
  useApolloClient,
  useBackgroundQuery,
  useFragment,
  useLazyQuery,
  useLoadableQuery,
  useMutation,
  useQuery,
  useQueryRefHandlers,
  useReactiveVar,
  useReadQuery,
  useSubscription,
  useSuspenseQuery,
} from '@quiltt/react'
// ============================================================================
// React - Re-export hooks, components, and contexts from @quiltt/react
// ============================================================================
// Re-export React-specific modules. Note: We exclude providers and utils
// because we provide platform-specific implementations for React Native.
export * from '@quiltt/react/components'
export * from '@quiltt/react/contexts'
export * from '@quiltt/react/hooks'

// ============================================================================
// React Native - Platform-specific components and providers
// ============================================================================
// React Native implementations that override web versions where needed.
// These are optimized for mobile platforms (iOS, Android) and handle
// platform-specific concerns like async user-agent detection.
export * from './components'
export * from './providers'
