# Changelog

## 6.2.0

## 6.1.6

## 6.1.5

## 6.1.4

## 6.1.3

## 6.1.2

### Patch Changes

- [#552](https://github.com/quiltt/quiltt-sdks/pull/552) [`54a7d8b`](https://github.com/quiltt/quiltt-sdks/commit/54a7d8b717a15e76f4c641ef87d8d5ecbda9e45e) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix OAuth handoff aborting on some Android 11+ devices when the URL-open preflight misreports. The mobile SDKs no longer treat `canOpenURL`/`canLaunchUrl`/`resolveActivity` as authoritative — they attempt to open the OAuth URL directly and fire `onExitError` only when the open itself fails, so bank redirects succeed on devices where package-visibility filtering would otherwise abort the flow.

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

## 6.0.0

### Major Changes

- [#475](https://github.com/quiltt/quiltt-sdks/pull/475) [`bfc1035`](https://github.com/quiltt/quiltt-sdks/commit/bfc10352aae42264e9b40e2af856cf3e6979cd45) Thanks [@mateusz-pietras](https://github.com/mateusz-pietras)! - Add Flutter Web platform support via dart:js_interop

  - Platform abstraction layer with conditional import (mobile WebView / web JS interop)
  - Lazy-loads Quiltt JS SDK from CDN; detects pre-loaded SDK and skips injection
  - **Breaking**: introduces `ConnectorSDKEventType` enum — `onEvent` and `onExit` callbacks now carry a typed `ConnectorSDKEventType` instead of a raw string
  - **Breaking**: removes previously public `connectorId`, `connectionId`, `controller` fields

## 5.3.0

### Minor Changes

- [#470](https://github.com/quiltt/quiltt-sdks/pull/470) [`0669bd0`](https://github.com/quiltt/quiltt-sdks/commit/0669bd08048010791008f62b5368ee3a5beeb7d0) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Expose `themeMode` prop on all Connector SDK components

  Add a new `themeMode` prop (`'light' | 'dark' | 'auto'`) to control the Connector UI color scheme across all SDKs. Passed as `quiltt-theme-mode` HTML attribute (web) or `theme_mode` URL parameter (mobile). Resolves with priority: SDK override → Dashboard default → `'light'`.

## 5.2.5

## 5.2.4

### Patch Changes

- [#451](https://github.com/quiltt/quiltt-sdks/pull/451) [`e8179ce`](https://github.com/quiltt/quiltt-sdks/commit/e8179ce5dd340b0804da1836c97aec62604d91f2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix SDK Release

## 5.2.3

## 5.2.2

### Patch Changes

- [#444](https://github.com/quiltt/quiltt-sdks/pull/444) [`ac582f5`](https://github.com/quiltt/quiltt-sdks/commit/ac582f5313c206765b17ebaacd6d50327130a552) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Trigger manual release

## 5.2.1

### Patch Changes

- [#436](https://github.com/quiltt/quiltt-sdks/pull/436) [`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Added integration tests across all SDK packages (React, Vue, Capacitor React/Vue, React Native, Android, Flutter, and iOS) and validated consistent connector behavior

## [5.2.0] - 2026-03-04

### Changed

- Move from standalone repo to quiltt/quiltt-sdks

## [3.0.3] - 2025-10-14

### Bugfixes

- Fix WebView reloading by initializing controller once

## [3.0.2] - 2025-07-22

### Fixed

- Fixed Finicity OAuth redirect handling by opening shouldRender to all URLs except quilttconnector:// events
- Aligned URLUtils behavior with iOS SDK for consistent cross-platform experience
- Resolved WebView white screen issues for Finicity and other providers with unlisted domains

### Changed

- Updated URLUtils.isEncoded() to match iOS behavior (ignores double-encoding detection)
- Enhanced error handling in URLUtils.smartEncodeURIComponent()
- Updated Ruby gem dependencies to latest versions

### Documentation

- Added comprehensive deep link configuration guide to README
- Added troubleshooting section with common OAuth redirect issues
- Created CONTRIBUTING.md with Flutter-specific development guidelines
- Added CODE_OF_CONDUCT.md for community guidelines

## [3.0.0] - 2025-01-01

- Initial release.
