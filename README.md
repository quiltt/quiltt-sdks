# Quiltt SDKs

[![Maintainability](https://qlty.sh/gh/quiltt/projects/quiltt-sdks/maintainability.svg)](https://qlty.sh/gh/quiltt/projects/quiltt-sdks) [![Code Coverage](https://qlty.sh/gh/quiltt/projects/quiltt-sdks/coverage.svg)](https://qlty.sh/gh/quiltt/projects/quiltt-sdks)

This repository is the unified home of Quiltt's SDKs, covering JavaScript/TypeScript, Android, Flutter, and iOS. All packages are versioned and released together.

## About Quiltt

Quiltt's unified API streamlines fintech application development by providing a single point of integration to multiple open banking data and enrichment providers. Our platform simplifies complex financial data workflows, enabling developers to focus on building exceptional user experiences.

## Getting Started

For comprehensive documentation including core concepts, guides, and API reference, visit [https://quiltt.dev](https://quiltt.dev).

Each package includes detailed setup instructions and examples. See the individual package READMEs below for specific implementation details:

**JavaScript / TypeScript:** [Core](packages/core#readme) · [React](packages/react#readme) · [Vue](packages/vue#readme) · [React Native](packages/react-native#readme) · [Capacitor](packages/capacitor#readme)

**Native Mobile:** [Android](packages/android#readme) · [Flutter](packages/flutter#readme) · [iOS](packages/ios#readme)

## Examples

- [React + Next.js](examples/react-nextjs/README.md)
- [React Native + Expo](examples/react-native-expo/README.md)
- [Vue + Nuxt](examples/vue-nuxt/README.md)
- [Capacitor + React](examples/capacitor-react/README.md)
- [Capacitor + Vue](examples/capacitor-vue/README.md)

## Packages

### JavaScript / TypeScript

#### [@quiltt/core](packages/core#readme)

[![npm version](https://badge.fury.io/js/%40quiltt%2Fcore.svg)](https://badge.fury.io/js/%40quiltt%2Fcore)

The foundational package providing essential functionality for JavaScript-based Quiltt applications. Features include Auth API client, JWT handling, observables, storage management, timeout utilities, and comprehensive TypeScript types.

#### [@quiltt/react](packages/react#readme)

[![npm version](https://badge.fury.io/js/%40quiltt%2Freact.svg)](https://badge.fury.io/js/%40quiltt%2Freact)

React components and hooks for seamless Quiltt integration, built on a powerful Apollo-based GraphQL client. Includes providers, authentication hooks, and pre-built UI components.

#### [@quiltt/vue](packages/vue#readme)

[![npm version](https://badge.fury.io/js/%40quiltt%2Fvue.svg)](https://badge.fury.io/js/%40quiltt%2Fvue)

Vue 3 components and composables for integrating Quiltt Connector, including plugin-based session management and connector lifecycle utilities.

#### [@quiltt/react-native](packages/react-native#readme)

[![npm version](https://badge.fury.io/js/%40quiltt%2Freact-native.svg)](https://badge.fury.io/js/%40quiltt%2Freact-native)

Native components optimized for React Native and Expo applications, featuring the Quiltt Connector and mobile-specific utilities for financial data integration.

#### [@quiltt/capacitor](packages/capacitor#readme)

[![npm version](https://badge.fury.io/js/%40quiltt%2Fcapacitor.svg)](https://badge.fury.io/js/%40quiltt%2Fcapacitor)

Capacitor plugin and framework adapters for integrating Quiltt Connector in iOS and Android apps with native OAuth deep-link handling.

### Native Mobile

#### [Android SDK](packages/android#readme)

[![Maven Central](https://img.shields.io/maven-central/v/io.quiltt/connector)](https://search.maven.org/artifact/io.quiltt/connector)

Native Android SDK (Kotlin) for integrating Quiltt Connector. Supports View-based and Jetpack Compose layouts with App Links for OAuth deep-link handling. Requires Android API Level 26+.

#### [Flutter SDK](packages/flutter#readme)

[![pub package](https://img.shields.io/pub/v/quiltt_connector.svg)](https://pub.dev/packages/quiltt_connector)

Flutter SDK (Dart) providing a Widget for integrating Quiltt Connector into iOS and Android Flutter apps.

#### [iOS SDK](packages/ios#readme)

Native iOS SDK (Swift) for integrating Quiltt Connector via Swift Package Manager. Supports iOS 13+.

## Development

### Prerequisites

- Node.js
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start development mode
pnpm run dev
```

### Testing

This project uses Vitest for JavaScript unit testing, Playwright for web E2E testing, Detox for React Native E2E testing, and platform-native toolchains for mobile packages.

#### Running Tests

```bash
# Run JS/TS unit tests with coverage
pnpm run test:unit

# Run unit tests for specific package
pnpm run test:unit -- --project react

# Run end-to-end tests
pnpm run test:e2e
```

For platform-specific testing:

```bash
# Android — run from packages/android/
./gradlew connector:test

# Flutter — run from packages/flutter/
flutter test

# iOS — run from packages/ios/
swift test
```

#### Test Structure

- **Unit Tests (JS/TS)**: Located in `packages/<name>/tests/` with `.test.ts/.tsx` extensions
- **Web E2E Tests**: Playwright tests in `examples/react-nextjs/e2e/` and `examples/vue-nuxt/e2e/`
- **Mobile E2E Tests**: Detox tests in `examples/react-native-expo/e2e/`
- **Android Tests**: JUnit tests in `packages/android/connector/src/test/`
- **Flutter Tests**: Dart tests in `packages/flutter/test/`
- **iOS Tests**: Swift tests in `packages/ios/Tests/`
- **Coverage**: Istanbul coverage reports generated in `coverage/` directory

#### Testing Stack

- **Vitest**: Fast unit test runner with native TypeScript support
- **Playwright**: Component and end-to-end testing for web examples
- **Detox**: End-to-end testing for React Native example apps
- **Testing Library**: React and React Native testing utilities
- **Happy DOM**: Lightweight DOM implementation for faster tests
- **Gradle / JUnit**: Android unit and instrumentation testing
- **Flutter Test**: Flutter/Dart testing
- **Swift Testing / XCTest**: iOS testing

### Code Quality

```bash
# Lint all JS/TS packages
pnpm run lint

# Type checking
pnpm run typecheck

# Check dependency versions consistency
pnpm run check:packages
```

## Contributing

We welcome contributions from developers at all skill levels. Whether you're reporting bugs, proposing features, or contributing code, your involvement drives the improvement of these projects.

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for detailed information on how to get started. For information on creating releases and changesets, see our [Release Documentation](RELEASING.md).

## Publishing

All packages in this repository are released together at the same version:

1. **JS/TS packages** (`@quiltt/core`, `@quiltt/react`, etc.) are published to npm via Changesets
2. **Mobile packages** (Android, Flutter, iOS) are published to Maven Central, pub.dev, and GitHub Releases automatically when the JS packages release

```bash
# Create a changeset (only step needed for contributors)
pnpm changeset
```

Once a changeset is created and merged to the `main` branch, our automated release workflow handles versioning and publishing for all packages. For detailed information, see our [Release Documentation](RELEASING.md).

## License

This repository and all published packages are licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.
