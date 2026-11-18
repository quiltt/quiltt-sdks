# Testing

## Testing Strategy

This repository uses layered testing across packages and examples:

- Unit tests for JS/TS package behavior
- Web end-to-end tests for React/Vue/Capacitor examples
- React Native end-to-end tests (Maestro)
- Native platform integration tests for Android, Flutter, and iOS SDKs

The goal is to validate connector lifecycle behavior across all supported SDK surfaces.

## Main Test Suites

JavaScript/TypeScript:

- Unit tests: Vitest (`packages/*/tests`)
- Lint: Biome
- Type checking: TypeScript

Web examples:

- Playwright specs in:
  - `examples/react-nextjs/e2e`
  - `examples/vue-nuxt/e2e`
  - `examples/capacitor-react/e2e`
  - `examples/capacitor-vue/e2e`

React Native example:

- Maestro flows: `examples/react-native-expo/maestro`

Native SDK integration:

- Android instrumentation tests in `packages/android/app/src/androidTest`
- Flutter integration tests in `packages/flutter/example/integration_test`
- iOS UI tests in `packages/ios/ExampleSwiftUI/ExampleSwiftUIUITests`

## CI Workflow Map

Integration workflows live in `.github/workflows/`:

- `tests-unit.yml` (JS unit tests)
- `tests-integration-core.yml`
- `tests-integration-react.yml`
- `tests-integration-vue.yml`
- `tests-integration-capacitor.yml`
- `tests-integration-react-native.yml`
- `tests-integration-android.yml`
- `tests-integration-flutter.yml`
- `tests-integration-ios.yml`

## Common Commands

From repository root:

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test:unit
```

Integration suites run per example or package, from that directory. Each line runs in a subshell so
the working directory returns to the repository root before the next command:

```bash
(cd examples/react-nextjs && pnpm run test:e2e)
(cd examples/vue-nuxt && pnpm run test:e2e)
(cd examples/capacitor-react && pnpm run test:e2e)
(cd examples/capacitor-vue && pnpm run test:e2e)
```

React Native example:

```bash
cd examples/react-native-expo
pnpm run build:ios          # build Debug iOS app (macOS + Xcode)
pnpm run build:android      # build Debug Android app
maestro test maestro/connector-flow.yaml
maestro test maestro/oauth-callback-flow.yaml
```

Android SDK package:

```bash
cd packages/android
./gradlew app:connectedDebugAndroidTest
```

Flutter SDK example:

```bash
cd packages/flutter/example
flutter test integration_test/app_test.dart
```

iOS ExampleSwiftUI UI tests:

```bash
cd packages/ios/ExampleSwiftUI
xcodebuild test \
  -scheme ExampleSwiftUI \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro'
```

## Unit Test Coverage

`tests-unit.yml` runs the JS, Android, Flutter, and iOS unit suites and uploads
each report to Qlty under the `QLTY_COVERAGE_TOKEN` project token.

Reproducing mobile coverage locally:

```bash
cd packages/android
./gradlew connector:testDebugUnitTest connector:createDebugUnitTestCoverageReport
# report: connector/build/reports/coverage/test/debug/index.html

swift test --enable-code-coverage
# then export the profile to lcov, as tests-unit.yml does
```

Two things make native reports easy to get wrong:

- Android coverage only sees Robolectric tests because `connector/build.gradle.kts`
  turns on `includeNoLocationClasses` for JaCoCo. Without it the sandbox classloader
  AGP instrumented nothing and every Robolectric-backed test reported 0%. The
  matching `jdk.internal.*` exclusion is required — the JDK's generated reflection
  accessors are location-less too and break class loading when instrumented.
- iOS lcov is produced by `llvm-cov export`, which silently drops source files it has
  no mapping for. The verification step in `tests-unit.yml` warns when a file under
  `packages/ios/Sources` is missing, so a partial report cannot pass as complete.

## Environment and Secrets

Some integration suites require real credentials/secrets in CI.

Common examples:

- Quiltt client ID / connector ID environment variables
- Session token or API key secret for pre-auth test paths

When secrets are not present, tests should prefer explicit skip behavior rather than false negatives.

## Stability Guidelines

- Prefer asserting stable host app surfaces (container IDs, callback signals)
- Treat WebView inner DOM assertions as higher-risk and platform-sensitive
- Keep timeouts explicit and bounded
- Keep retry behavior narrow (single retry at known flaky boundaries)
- Ensure Metro/dev server readiness checks pass before launching mobile flows

## Troubleshooting Checklist

1. Confirm build artifacts exist at expected output paths.
2. Confirm emulator/simulator is booted and target device is explicit.
3. Confirm Metro is running and reachable (including `adb reverse` for Android).
4. Check uploaded artifacts (`playwright-report`, Maestro debug output).
5. Verify selectors against current hierarchy snapshots before changing test logic.
