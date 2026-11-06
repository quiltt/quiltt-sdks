// ============================================================================
// @quiltt/core - Core Quiltt SDK functionality
// ============================================================================
// This package provides the foundational TypeScript primitives for interacting
// with the Quiltt API. It works across all JavaScript environments (browser,
// Node.js, React Native) and contains no UI-specific dependencies.
//
// Main exports:
// - API clients (AuthAPI, ConnectorsAPI, QuilttClient)
// - Authentication utilities (JsonWebTokenParse, AuthStrategies)
// - Configuration helpers
// - Observable patterns for reactive data
// - Session slot controller and storage abstractions (GlobalStorage)
// - Timeout utilities (Timeoutable)
// - TypeScript utility types
//
// Note: Utils are NOT exported from the main entry point to keep the public
// API clean. Access utils via subpath import: '@quiltt/core/utils'
// ============================================================================

export * from './api'
export * from './auth'
export * from './config'
export * from './observables'
export * from './session'
export * from './storage'
export * from './timing'
export * from './types'
