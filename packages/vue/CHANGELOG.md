# @quiltt/vue

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

### Patch Changes

- Updated dependencies [[`4d54ff7`](https://github.com/quiltt/quiltt-sdks/commit/4d54ff78df69cb7eb6e83edd7500ab1669d085b3)]:
  - @quiltt/core@6.2.0

## 6.1.6

### Patch Changes

- Updated dependencies [[`b9a7a9d`](https://github.com/quiltt/quiltt-sdks/commit/b9a7a9d1f5a16d7530f0389c7c3cad083c2f0167)]:
  - @quiltt/core@6.1.6

## 6.1.5

### Patch Changes

- [#571](https://github.com/quiltt/quiltt-sdks/pull/571) [`eac5d2a`](https://github.com/quiltt/quiltt-sdks/commit/eac5d2a5b0ac26728b40131e8b755e623fbb5fc3) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Stop re-validating a Session token after the server rejects it with 401. `importSession()` now latches rejected tokens at module scope, so session-expiry effects, provider remounts and other repeated re-imports of a dead token no longer ping it again

- Updated dependencies [[`eac5d2a`](https://github.com/quiltt/quiltt-sdks/commit/eac5d2a5b0ac26728b40131e8b755e623fbb5fc3), [`eac5d2a`](https://github.com/quiltt/quiltt-sdks/commit/eac5d2a5b0ac26728b40131e8b755e623fbb5fc3)]:
  - @quiltt/core@6.1.5

## 6.1.4

### Patch Changes

- Updated dependencies [[`e7732ff`](https://github.com/quiltt/quiltt-sdks/commit/e7732ff15ffef69dd3c81dd5e1167f9e151ddb5b)]:
  - @quiltt/core@6.1.4

## 6.1.3

### Patch Changes

- Updated dependencies [[`b09ad7c`](https://github.com/quiltt/quiltt-sdks/commit/b09ad7c03a6e15e145a816ebe545acafff38e11e)]:
  - @quiltt/core@6.1.3

## 6.1.2

### Patch Changes

- [#547](https://github.com/quiltt/quiltt-sdks/pull/547) [`295fa70`](https://github.com/quiltt/quiltt-sdks/commit/295fa702a7c01685c81f7cf5b9e0d59584d6ccec) Thanks [@rubendinho](https://github.com/rubendinho)! - Prevent an unhandled promise rejection in `QuilttAuthProvider` when the session changes. `resetStore()` cancels in-flight queries while clearing data cached under the previous session, and can reject while doing so — the provider now catches and ignores this expected rejection, matching the handling already in the `vue` plugin.

- Updated dependencies []:
  - @quiltt/core@6.1.2

## 6.1.1

### Patch Changes

- [#522](https://github.com/quiltt/quiltt-sdks/pull/522) [`a3cabf9`](https://github.com/quiltt/quiltt-sdks/commit/a3cabf9d2efa6121fe6959a569a9f651db9340e4) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Mark `FetchResponse<T>.data` as `T | null` to match runtime reality — `fetchWithRetry` already returns `null` when `response.json()` fails (empty or malformed bodies).

  Add optional chaining guards across `react` and `vue` session, institutions, and resolvable hooks to prevent `Cannot read properties of null` crashes. Previously `data.token` or `data.message` would throw when the response body was unparseable. Now those paths safely short-circuit.

- Updated dependencies [[`a3cabf9`](https://github.com/quiltt/quiltt-sdks/commit/a3cabf9d2efa6121fe6959a569a9f651db9340e4)]:
  - @quiltt/core@6.1.1

## 6.1.0

### Minor Changes

- [#508](https://github.com/quiltt/quiltt-sdks/pull/508) [`9e01caa`](https://github.com/quiltt/quiltt-sdks/commit/9e01caacabc3288b48f0a40fb4473c0e1998158f) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add Capacitor Vue QuilttConnector bridge component with tests and examples

  - **Capacitor**: Add `components/vue/QuilttConnector.ts` — a Vue 3 `defineComponent` bridge that embeds the Quiltt Connector in an iframe and handles OAuth flows via Capacitor native plugins (mirrors the existing React `QuilttConnector` component)
  - **Capacitor**: Update `vue.ts` to export the new `QuilttConnector` component from `@quiltt/capacitor/vue`
  - **Capacitor**: Add `vue-QuilttConnector.test.ts` with 7 tests covering iframe rendering, URL building, theme mode, OAuth callback exposure, deep link lifecycle, and error states
  - **Capacitor**: Add `components/vue/index.ts` entry point and update module-loads test coverage
  - **Examples**: Update `capacitor-vue` example app to use `QuilttConnector` bridge component (replaces `QuilttContainer` for the inline panel), matching the React example pattern
  - **Examples**: Update capacitor-vue e2e tests (`home.spec.ts`, `connector-flow.spec.ts`) to target the new iframe-based component

### Patch Changes

- Updated dependencies []:
  - @quiltt/core@6.1.0

## 6.0.2

### Patch Changes

- Updated dependencies [[`462c095`](https://github.com/quiltt/quiltt-sdks/commit/462c095c4781fcc0e3dbe8bd124a70670b9444f5)]:
  - @quiltt/core@6.0.2

## 6.0.1

### Patch Changes

- [#483](https://github.com/quiltt/quiltt-sdks/pull/483) [`5c60f90`](https://github.com/quiltt/quiltt-sdks/commit/5c60f90a00e7d2a9eb7a7a5a9139a47d78677101) Thanks [@jethfo](https://github.com/jethfo)! - Fix dark mode background flashes in the React Native Connector

  When using `themeMode="dark"`, the native wrapper around the Quiltt Connector WebView now uses transparent backgrounds instead of hardcoded light ones. This eliminates white flashes and white safe-area insets during loading.

  - **Android**: SafeAreaView wrapper background set to `transparent` to prevent white bleed in the status bar area
  - **iOS**: WebView background set to `transparent` and native loading spinner disabled (`startInLoadingState: false`), since Quiltt renders its own branded loader inside the WebView HTML

- Updated dependencies [[`5c60f90`](https://github.com/quiltt/quiltt-sdks/commit/5c60f90a00e7d2a9eb7a7a5a9139a47d78677101)]:
  - @quiltt/core@6.0.1

## 6.0.0

### Patch Changes

- Updated dependencies []:
  - @quiltt/core@6.0.0

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

- Updated dependencies [[`0669bd0`](https://github.com/quiltt/quiltt-sdks/commit/0669bd08048010791008f62b5368ee3a5beeb7d0), [`292fc83`](https://github.com/quiltt/quiltt-sdks/commit/292fc8313e2c1dcb58156d5d44ca135857b1f40c)]:
  - @quiltt/core@5.3.0

## 5.2.5

### Patch Changes

- [#460](https://github.com/quiltt/quiltt-sdks/pull/460) [`30d2745`](https://github.com/quiltt/quiltt-sdks/commit/30d2745186a38356ec6ecdce32dc70577c4262a3) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix OAuth URL double-encoding validation bug in Android and iOS SDKs. URLs arriving double-encoded from OAuth providers now normalize correctly before HTTPS validation, allowing OAuth flows to launch successfully in the browser.

- Updated dependencies [[`30d2745`](https://github.com/quiltt/quiltt-sdks/commit/30d2745186a38356ec6ecdce32dc70577c4262a3)]:
  - @quiltt/core@5.2.5

## 5.2.4

### Patch Changes

- [#451](https://github.com/quiltt/quiltt-sdks/pull/451) [`e8179ce`](https://github.com/quiltt/quiltt-sdks/commit/e8179ce5dd340b0804da1836c97aec62604d91f2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix SDK Release

- Updated dependencies [[`e8179ce`](https://github.com/quiltt/quiltt-sdks/commit/e8179ce5dd340b0804da1836c97aec62604d91f2)]:
  - @quiltt/core@5.2.4

## 5.2.3

### Patch Changes

- [#448](https://github.com/quiltt/quiltt-sdks/pull/448) [`f5968c6`](https://github.com/quiltt/quiltt-sdks/commit/f5968c65bd5de1bf421d96bc371473f1e9ba4763) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Empty-token early return and no-session revoke guard in useQuilttSession

- Updated dependencies [[`f5968c6`](https://github.com/quiltt/quiltt-sdks/commit/f5968c65bd5de1bf421d96bc371473f1e9ba4763)]:
  - @quiltt/core@5.2.3

## 5.2.2

### Patch Changes

- [#444](https://github.com/quiltt/quiltt-sdks/pull/444) [`ac582f5`](https://github.com/quiltt/quiltt-sdks/commit/ac582f5313c206765b17ebaacd6d50327130a552) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Trigger manual release

- Updated dependencies [[`ac582f5`](https://github.com/quiltt/quiltt-sdks/commit/ac582f5313c206765b17ebaacd6d50327130a552)]:
  - @quiltt/core@5.2.2

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
