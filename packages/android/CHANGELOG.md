# @quiltt/android

## 6.1.2

### Patch Changes

- [#552](https://github.com/quiltt/quiltt-sdks/pull/552) [`54a7d8b`](https://github.com/quiltt/quiltt-sdks/commit/54a7d8b717a15e76f4c641ef87d8d5ecbda9e45e) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix OAuth handoff aborting on some Android 11+ devices when the URL-open preflight misreports. The mobile SDKs no longer treat `canOpenURL`/`canLaunchUrl`/`resolveActivity` as authoritative — they attempt to open the OAuth URL directly and fire `onExitError` only when the open itself fails, so bank redirects succeed on devices where package-visibility filtering would otherwise abort the flow.

  Fix `@quiltt/react-native` retrying the fallback URL with the raw double-encoded value, which could never open. The fallback now runs only when normalization changed the URL and the original is a well-formed HTTPS URL.

## 6.1.1

## 6.1.0

## 6.0.2

## 6.0.1

### Patch Changes

- [#487](https://github.com/quiltt/quiltt-sdks/pull/487) [`6bb6f33`](https://github.com/quiltt/quiltt-sdks/commit/6bb6f3370347f0885a51fb6df4379d90ee850a09) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix unhandled OAuth URL rejections across all mobile SDKs

  - **react-native**: `handleOAuthUrl` is now `async`, await's `Linking.openURL()`,
    calls `Linking.canOpenURL()` as a preflight, and propagates failures through
    `onExitError` so host apps can surface error recovery UI.
  - **iOS**: Added `UIApplication.shared.canOpenURL()` preflight and fires
    `onExitError` when the URL cannot be opened.
  - **Android**: Added `Intent.resolveActivity()` preflight before `startActivity`
    and fires `onExitError` on failure.
  - **Flutter**: Added `canLaunchUrlString()` preflight before `launchUrlString`,
    checks the launch result, and fires `onExitError` on failure.

  Previously, failed OAuth URL opens (e.g. Plaid OAuth URLs the OS cannot handle)
  surfaced as unhandled promise rejections or silent failures without notifying
  the host app. The connector would appear to freeze after the user tapped
  "Connect." Host apps can now listen to `onExitError` to show a recovery UI.

- [#483](https://github.com/quiltt/quiltt-sdks/pull/483) [`5c60f90`](https://github.com/quiltt/quiltt-sdks/commit/5c60f90a00e7d2a9eb7a7a5a9139a47d78677101) Thanks [@jethfo](https://github.com/jethfo)! - Fix dark mode background flashes in the React Native Connector

  When using `themeMode="dark"`, the native wrapper around the Quiltt Connector WebView now uses transparent backgrounds instead of hardcoded light ones. This eliminates white flashes and white safe-area insets during loading.

  - **Android**: SafeAreaView wrapper background set to `transparent` to prevent white bleed in the status bar area
  - **iOS**: WebView background set to `transparent` and native loading spinner disabled (`startInLoadingState: false`), since Quiltt renders its own branded loader inside the WebView HTML

## 6.0.0

## 5.3.0

### Minor Changes

- [#470](https://github.com/quiltt/quiltt-sdks/pull/470) [`0669bd0`](https://github.com/quiltt/quiltt-sdks/commit/0669bd08048010791008f62b5368ee3a5beeb7d0) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Expose `themeMode` prop on all Connector SDK components

  Add a new `themeMode` prop (`'light' | 'dark' | 'auto'`) to control the Connector UI color scheme across all SDKs. Passed as `quiltt-theme-mode` HTML attribute (web) or `theme_mode` URL parameter (mobile). Resolves with priority: SDK override → Dashboard default → `'light'`.

### Patch Changes

- [#469](https://github.com/quiltt/quiltt-sdks/pull/469) [`292fc83`](https://github.com/quiltt/quiltt-sdks/commit/292fc8313e2c1dcb58156d5d44ca135857b1f40c) Thanks [@zubairaziz](https://github.com/zubairaziz)! - ## Vue: Add feature parity with React package

  - **New `QuilttContainer` component** — renders the connector inline, matching the React package API. Deprecates `QuilttConnector` in favor of this component.
  - **New `useQuilttConnector` composable** — provides SDK loading, connector lifecycle management, and session-based authentication outside of components.
  - **`QuilttButton` enhancements** — added `@click` event passthrough with `event.preventDefault()` support, `forceRemountOnConnectionChange` prop, and `quiltt-connection` / `quiltt-app-launcher-uri` attributes.
  - **Additional connector events** — added `@open`, `@exit`, and `@event` emits to `QuilttButton` and `QuilttContainer`.
  - **Force remount mechanism** — new `forceRemountOnConnectionChange` prop on `QuilttButton`, `QuilttContainer`, and `QuilttConnector` forces a complete remount when `connectionId` changes, useful for ensuring clean connector state.
  - **Deprecation check workflow** — CI check that validates deprecated component usage (`.github/actions/check-deprecations`).

## 5.2.5

### Patch Changes

- [#460](https://github.com/quiltt/quiltt-sdks/pull/460) [`30d2745`](https://github.com/quiltt/quiltt-sdks/commit/30d2745186a38356ec6ecdce32dc70577c4262a3) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix OAuth URL double-encoding validation bug in Android and iOS SDKs. URLs arriving double-encoded from OAuth providers now normalize correctly before HTTPS validation, allowing OAuth flows to launch successfully in the browser.

## 5.2.4

### Patch Changes

- [#451](https://github.com/quiltt/quiltt-sdks/pull/451) [`e8179ce`](https://github.com/quiltt/quiltt-sdks/commit/e8179ce5dd340b0804da1836c97aec62604d91f2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix SDK Release

## 5.2.3

### Patch Changes

- [#448](https://github.com/quiltt/quiltt-sdks/pull/448) [`f5968c6`](https://github.com/quiltt/quiltt-sdks/commit/f5968c65bd5de1bf421d96bc371473f1e9ba4763) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Empty-token early return and no-session revoke guard in useQuilttSession

## 5.2.2

### Patch Changes

- [#444](https://github.com/quiltt/quiltt-sdks/pull/444) [`ac582f5`](https://github.com/quiltt/quiltt-sdks/commit/ac582f5313c206765b17ebaacd6d50327130a552) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Trigger manual release

## 5.2.1

### Patch Changes

- [#436](https://github.com/quiltt/quiltt-sdks/pull/436) [`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Added integration tests across all SDK packages (React, Vue, Capacitor React/Vue, React Native, Android, Flutter, and iOS) and validated consistent connector behavior
