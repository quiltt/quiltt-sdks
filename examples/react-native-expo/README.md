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

Build and run iOS tests:

```bash
pnpm run test:ios
```

Build and run Android tests:

```bash
pnpm run test:android
```

Run both platform test suites:

```bash
pnpm run test:e2e
```

## Notes

- iOS/Android targets require native toolchains and emulator/simulator setup.
- The app source is under `src/`.
- Expo Go can be used by scanning the QR code shown by `pnpm run dev`.

## Related Docs

- [Main Repository README](../../README.md)
- [@quiltt/react-native Documentation](../../packages/react-native#readme)
- [Quiltt Developer Docs](https://quiltt.dev)
