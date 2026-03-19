# Architecture

## Monorepo Overview

This repository is a pnpm workspace monorepo with Turbo task orchestration.

Top-level groups:

- `packages/`: SDK and library packages
- `examples/`: runnable integration examples across web and mobile shells
- `.github/workflows/`: CI definitions for build, lint, unit tests, and integration suites

## Package Layout

JavaScript/TypeScript packages:

- `packages/core`: shared primitives (auth/API client, types, utilities)
- `packages/react`: React SDK built on core
- `packages/vue`: Vue SDK built on core
- `packages/react-native`: React Native SDK built on core
- `packages/capacitor`: Capacitor plugin and adapters

Native mobile packages:

- `packages/android`: native Android SDK and example app
- `packages/flutter`: Flutter SDK and example app
- `packages/ios`: native iOS SDK and ExampleSwiftUI app

## Example Apps

Web examples:

- `examples/react-nextjs`
- `examples/vue-nuxt`
- `examples/capacitor-react`
- `examples/capacitor-vue`

Mobile example:

- `examples/react-native-expo`

These examples are the primary integration harnesses used by CI for end-to-end coverage.

## Dependency Direction

Core dependency direction:

- `core` -> consumed by `react`, `vue`, and `react-native`
- `react-native` and `capacitor` provide platform wrappers around shared connector behavior
- Native SDK packages (`android`, `flutter`, `ios`) are independent platform implementations

## Build and Orchestration

- Workspace package manager: `pnpm`
- Task orchestrator: `turbo`
- JS/TS package builds are handled via workspace scripts and Turbo pipelines
- Native packages build with platform-native toolchains (Gradle, Flutter, Xcode/Swift)

## Release Model

- Packages are versioned together via Changesets fixed versioning
- JS packages are published to npm
- Native mobile artifacts are published through dedicated CI release workflows

## Design Principles

- Keep `core` platform-agnostic
- Keep framework adapters thin and explicit
- Keep example apps as executable integration references
- Prefer deterministic, CI-friendly tests over deep UI assumptions for WebView internals
