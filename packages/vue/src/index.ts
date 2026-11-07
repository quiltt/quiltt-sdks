// ============================================================================
// @quiltt/vue - Vue 3 Composables and Components for Quiltt
// ============================================================================
// This package provides Vue 3-specific composables and components for
// integrating Quiltt's financial data platform into Vue applications.
// It re-exports all @quiltt/core functionality plus Vue-specific features.
//
// Main exports:
// - All @quiltt/core modules (API clients, auth, config, storage, types)
// - Apollo Client types, classes, and Vue composables for GraphQL operations
// - Vue plugin (QuilttPlugin) for app-wide session management
// - Vue composables (useQuilttSession, useQuilttConnector, etc.)
// - Vue components (QuilttButton, QuilttContainer)
// ============================================================================

// ============================================================================
// Apollo Client - Core functionality
// ============================================================================
// Re-export essential Apollo Client types and classes for GraphQL operations.
// Note: Use ObservableQuery.Result instead of deprecated ApolloQueryResult.
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
// Quiltt Core - Re-export all modules from @quiltt/core
// ============================================================================
// Re-export all core Quiltt functionality so users only need to install
// @quiltt/vue instead of both @quiltt/core and @quiltt/vue.
export * from '@quiltt/core/api'
export * from '@quiltt/core/auth'
export * from '@quiltt/core/config'
export * from '@quiltt/core/observables'
export * from '@quiltt/core/session'
export * from '@quiltt/core/storage'
export * from '@quiltt/core/timing'
export * from '@quiltt/core/types'
// ============================================================================
// Apollo Client - Vue composables
// ============================================================================
// Vue 3 composables for GraphQL operations, provided by @vue/apollo-composable.
// The GraphQL client is supplied by QuilttPlugin (see useApolloClient).
export {
  ApolloClients,
  DefaultApolloClient,
  provideApolloClient,
  provideApolloClients,
  useApolloClient,
  useFragment,
  useGlobalMutationLoading,
  useGlobalQueryLoading,
  useGlobalSubscriptionLoading,
  useLazyQuery,
  useMutation,
  useMutationLoading,
  useQuery,
  useQueryLoading,
  useSubscription,
  useSubscriptionLoading,
} from '@vue/apollo-composable'

// ============================================================================
// Vue-specific exports
// ============================================================================
// Quiltt Vue plugin, composables, and components for Vue 3 applications.
export * from './components'
export * from './composables'
export * from './plugin'
