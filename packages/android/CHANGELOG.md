# @quiltt/android

## 6.2.0

### Minor Changes

- [#590](https://github.com/quiltt/quiltt-sdks/pull/590) [`4d54ff7`](https://github.com/quiltt/quiltt-sdks/commit/4d54ff78df69cb7eb6e83edd7500ab1669d085b3) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Signing out now sticks. `importSession` validated a token with a request and wrote it afterwards, so a sign-out — or a different sign-in — that landed while that request was in flight was overwritten by the late response, and an app that redirects on "signed in" sent the user back where they came from. The token is now adopted only if the session has not moved on in the meantime, and `importSession` resolves `false` when it did not; two overlapping imports of the same token both resolve `true`.

  - **Fixed** — a subscription authenticates with the session its request used, rather than the shared session store. A request whose session came from elsewhere failed with `UNAUTHENTICATED` / `NO_TOKEN`, and a store holding a different session connected the WebSocket as that user.
  - **Fixed** — a `401` signs out the session that sent the request, rather than only the shared store, so a server render no longer resends a rejected token on every later query. A rejection that arrives after the session was replaced no longer signs out the newer session — whether it came from a query or from the import validating a token — and no longer cancels a sign-in that is still being validated.
  - **Fixed** — `revokeSession`, and the timer that ends an expiring session, no longer sign out a session that was adopted while they were waiting. A revoke answered after a new sign-in, or the previous session's timer firing after a new one was stored, cleared the new session.
  - **Fixed** — a `@quiltt/react` app sees a sign-out made in another tab while it is validating a token, instead of adopting that token when the answer arrives and bringing the ended session back.
  - **Fixed** — a `@quiltt/vue` tab no longer signs out a session another tab has since saved. An expiry it observes — a stale token arriving late, or one that lapses while a newer sign-in is already stored — ends that tab's own session without writing over the stored one.
  - **Fixed** — a server-rendered `@quiltt/vue` app keeps each request's session to itself. One request could render another request's session or be signed out by it, and its GraphQL calls could go out without a session of their own or be batched with another request's under one `authorization` header.
  - **Fixed** — `QuilttAuthProvider` no longer resets the Apollo cache for the session a mount starts with, so an app reusing one client across route changes no longer loses cached data and refetches it. It still resets when the session really changes — including one that changed while the provider was unmounted, or had already expired by the time it mounted — so one account's cached results are never shown to another.
  - **Fixed** — a `@quiltt/vue` app installed with a `token` option now saves it. The option filled only the app's own session, so its GraphQL requests went out with no token at all and importing that same token reported failure.
  - **Fixed** — `useStorage` no longer re-renders in a loop, ending in React's "Maximum update depth exceeded", when it persists an object under an inline default such as `useStorage('settings', {})`.
  - **Fixed** — `useStorage` no longer reads or writes the shared store on a server, where one request's value was visible to the next.
  - **Changed** — `useStorage`'s initial value behaves like `useState`'s default. It now applies in browsers, where a missing key previously read back as `null` and the default was ignored; it applies only to a key that was never written, so a cleared value stays cleared — including after a reload — and a hook pointed at a new key no longer inherits the previous key's value; and setting a value equal to it saves it, where the write used to be dropped as a no-op. A cleared key is saved as `null`, which is how a later visit tells it apart from one that was never written, so `LocalStorage#get` reports `null` for it.
  - **Changed** — `useStorage` updater functions receive the current stored value instead of the one captured when the setter was created.
  - **Added** — `useStorage` reports whether its value has been read from storage yet, as `restored`: the third element of its tuple, `useSession`'s fourth, and a named property on `useQuilttSession`. It is `false` only for the render that has to match the server's markup, which cannot read storage, so an empty value there does not mean signed out. Redirects and login screens should wait for it.
  - **Added** — `useSession` returns a `SessionController` with `snapshot()` and `adopt(token, at)`, for work that resumes after an `await` and has to know whether the session moved on while it waited. `adopt` reports success only when the session now holds the token.
  - **Added** — `Storage#has(key)` reports whether a key was ever written, which `get` cannot answer: a key written empty and one never written both read back empty. `@quiltt/core`'s session helpers and types — `createSessionController`, `SESSION_STORAGE_KEY`, `sharedSessionTokenSource`, `SessionController`, `SessionTokenSource` and the rest — are exported from `@quiltt/react`, `@quiltt/vue`, and `@quiltt/react-native` as well, and `@quiltt/core` now exposes them at `@quiltt/core/session`.

## 6.1.6

## 6.1.5

## 6.1.4

## 6.1.3

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
