# @quiltt/vue

## 5.2.1

### Patch Changes

- [#436](https://github.com/quiltt/quiltt-sdks/pull/436) [`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Added integration tests across all SDK packages (React, Vue, Capacitor React/Vue, React Native, Android, Flutter, and iOS) and validated consistent connector behavior

- Updated dependencies [[`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41)]:
  - @quiltt/core@5.2.1

## 5.2.0

### Minor Changes

- [#427](https://github.com/quiltt/quiltt-sdks/pull/427) [`6d4b768`](https://github.com/quiltt/quiltt-sdks/commit/6d4b7683f49d0a6e649a4bdfaff0398669102a63) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Bump minor version to be consistent with SemVer standards

### Patch Changes

- Updated dependencies [[`6d4b768`](https://github.com/quiltt/quiltt-sdks/commit/6d4b7683f49d0a6e649a4bdfaff0398669102a63)]:
  - @quiltt/core@5.2.0

## 5.1.3

### Patch Changes

- [#425](https://github.com/quiltt/quiltt-sdks/pull/425) [`c684b3b`](https://github.com/quiltt/quiltt-sdks/commit/c684b3b5f6ea2829e2abfa2a75c0d430edad66a5) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add @quiltt/capacitor package for Ionic and Capacitor apps

  - Framework-agnostic by default — works with Vue, Angular, Svelte, or vanilla JS
  - Vue 3 components via `@quiltt/capacitor/vue` subpath
  - React components via `@quiltt/capacitor/react` subpath
  - Native iOS (Swift) and Android (Kotlin) plugins for OAuth deep linking
  - Supports Capacitor 6, 7, and 8

  Add @quiltt/vue package for Vue 3 applications

  - `QuilttPlugin` for session management via Vue's provide/inject
  - `useQuilttSession` composable for authentication
  - `useQuilttConnector` composable for programmatic control
  - `QuilttButton`, `QuilttConnector`, `QuilttContainer` components
  - Add `@quiltt/capacitor/vue` entry point for Capacitor apps

  Rename `oauthRedirectUrl` to `appLauncherUrl` for mobile OAuth flows

  This change introduces `appLauncherUrl` as the new preferred property name for specifying the Universal Link (iOS) or App Link (Android) that redirects users back to your app after OAuth authentication.

  **Deprecation Warning:** The `oauthRedirectUrl` property is now deprecated but remains fully functional for backwards compatibility. Existing code using `oauthRedirectUrl` will continue to work without modifications.

  **Migration:**

  - Replace `oauthRedirectUrl` with `appLauncherUrl` in your component props
  - The behavior remains identical; only the property name has changed

  **Example:**

  ```tsx
  // Before (deprecated, still works)
  <QuilttConnector oauthRedirectUrl="https://myapp.com/callback" />

  // After (recommended)
  <QuilttConnector appLauncherUrl="https://myapp.com/callback" />
  ```

- Updated dependencies [[`c684b3b`](https://github.com/quiltt/quiltt-sdks/commit/c684b3b5f6ea2829e2abfa2a75c0d430edad66a5)]:
  - @quiltt/core@5.1.3
