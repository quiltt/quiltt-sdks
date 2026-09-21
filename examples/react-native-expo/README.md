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

## Native Projects

The `ios/` and `android/` projects are **committed** to the repository and serve
as the single source of truth. Do not run `expo prebuild` as part of any
automated build — it regenerates the native projects from the Expo template and
would churn the committed files (and drop hand-applied settings like the debug
network-security config and the Gradle build cache).

When `app.json`, config plugins, or Expo/React Native dependencies change native
output, regenerate deliberately and commit the resulting delta:

```bash
pnpm run native:prebuild       # CI=1 expo prebuild
pnpm run native:prebuild:clean # CI=1 expo prebuild --clean
```

The package intentionally has no `build`/`prebuild` npm scripts, so root
`pnpm build` (Turbo) skips it and never touches the native projects.

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

## E2E Tests (Maestro)

End-to-end UI tests use [Maestro](https://maestro.mobile.dev), a black-box,
accessibility-driven tool that runs the same flows on both iOS and Android with
no in-app test instrumentation. Flows are plain YAML under `maestro/`:

- `connector-flow.yaml` — launch the app and drive the Quiltt connector
  (email/passcode entry) to a ready state.
- `oauth-callback-flow.yaml` — launch the app, simulate an OAuth callback
  redirect, and confirm the connector reaches a ready state.

Install the Maestro CLI first:

```bash
brew install maestro
```

Build a Debug app for the simulator/emulator you're targeting:

```bash
pnpm run build:ios     # requires macOS + Xcode
pnpm run build:android # requires an Android SDK
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
