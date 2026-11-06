// ============================================================================
// @quiltt/react - React Components and Hooks for Quiltt
// ============================================================================
// This package provides React-specific components and hooks for integrating
// Quiltt's financial data platform into React applications. It re-exports all
// @quiltt/core functionality plus Apollo Client utilities and React-specific
// features.
//
// Main exports:
// - All @quiltt/core modules (API clients, auth, config, storage, types)
// - Apollo Client types, hooks, and components for GraphQL operations
// - React hooks (useQuilttSession, useQuilttConnector, etc.)
// - React components (QuilttProvider, QuilttButton, etc.)
//
// Note: Utils are NOT exported from the main entry point. Access utils via
// subpath import: '@quiltt/react/utils'
// ============================================================================

// ============================================================================
// Apollo Client - Core functionality
// ============================================================================
// Re-export essential Apollo Client types and classes for GraphQL operations.
// Note: Use ObservableQuery.Result instead of deprecated ApolloQueryResult.
// For hook options, use Parameters<typeof useQuery>[0] or import directly
// from @apollo/client.
export type {
  DocumentNode,
  ErrorPolicy,
  FetchPolicy,
  NormalizedCacheObject,
  OperationVariables,
  TypedDocumentNode,
  WatchQueryFetchPolicy,
} from '@apollo/client'
export {
  ApolloClient,
  gql,
  InMemoryCache,
  NetworkStatus,
  ObservableQuery,
} from '@apollo/client'
// ============================================================================
// Apollo Client - Error handling
// ============================================================================
// GraphQL and protocol error classes for handling API errors.
export {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  LinkError,
  LocalStateError,
  ServerError,
  ServerParseError,
  UnconventionalError,
} from '@apollo/client/errors'
// ============================================================================
// Apollo Client - React hooks and components
// ============================================================================
// React hooks and components for GraphQL operations.
// Note: For hook options types, use Parameters<typeof useMutation>[0],
// Parameters<typeof useQuery>[0], etc., or import directly from @apollo/client.
export {
  ApolloProvider,
  createQueryPreloader,
  skipToken,
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
} from '@apollo/client/react'
export { MockedProvider } from '@apollo/client/testing/react'
// ============================================================================
// Quiltt Core - Re-export all modules from @quiltt/core
// ============================================================================
// Re-export all core Quiltt functionality so users only need to install
// @quiltt/react instead of both @quiltt/core and @quiltt/react.
export * from '@quiltt/core/api'
export * from '@quiltt/core/auth'
export * from '@quiltt/core/config'
export * from '@quiltt/core/observables'
export * from '@quiltt/core/session'
export * from '@quiltt/core/storage'
export * from '@quiltt/core/timing'
export * from '@quiltt/core/types'

// ============================================================================
// React-specific exports
// ============================================================================
// Quiltt React components, hooks, and providers for web applications.
export * from './components'
export * from './hooks'
export * from './providers'
