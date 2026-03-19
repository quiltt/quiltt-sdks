# Quiltt React Native Expo Example

This Expo app demonstrates how to integrate `@quiltt/react-native` in a React Native project.

For more information about Quiltt and the available packages, see:

- [Main Repository README](../../README.md)
- [@quiltt/react-native Documentation](../../packages/react-native#readme)
- [Quiltt Developer Docs](https://quiltt.dev)

## Getting Started

From the repository root:

```bash
cd examples/react-native-expo
cp .env.example .env
pnpm install
pnpm run dev
```

You can also use:

```bash
pnpm run start
```

## Environment

Set these values in `.env` for real Quiltt testing:

- `EXPO_PUBLIC_QUILTT_CLIENT_ID`
- `EXPO_PUBLIC_QUILTT_AUTH_TOKEN`
- `EXPO_PUBLIC_CONNECTOR_ID`
- `EXPO_PUBLIC_APP_LAUNCHER_URL` (must be an `https://` app link)

## Run Targets

Open on iOS Simulator (macOS + Xcode installed):

```bash
pnpm run ios
```

Open on Android emulator (Android Studio installed):

```bash
pnpm run android
```

Run on web:

```bash
pnpm run web
```

## E2E Tests (Detox)

Detox in this example is intentionally smoke-only (app launch + connector mount).

Build and run iOS smoke tests:

```bash
pnpm run test:ios
```

Build and run Android smoke tests:

```bash
pnpm run test:android
```

Run both platform test suites:

```bash
pnpm run test:e2e
```

## Connector Flow Tests (Maestro)

Maestro flows are plain YAML and do not require compilation/transpilation.

Install the Maestro CLI first:

```bash
brew install maestro
```

Run the connector flow:

```bash
pnpm run test:maestro:connector
```

Run the OAuth callback handoff simulation:

```bash
pnpm run test:maestro:oauth
```

Run all Maestro flows in the folder:

```bash
pnpm run test:maestro
```

## Notes

- iOS/Android targets require native toolchains and emulator/simulator setup.
- The app source is under `src/`.
- Expo Go can be used by scanning the QR code shown by `pnpm run dev`.

## Related Docs

- [Main Repository README](../../README.md)
- [@quiltt/react-native Documentation](../../packages/react-native#readme)
- [Quiltt Developer Docs](https://quiltt.dev)
