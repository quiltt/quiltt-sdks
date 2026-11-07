# @quiltt/vue

## 6.2.0

### Minor Changes

- [#590](https://github.com/quiltt/quiltt-sdks/pull/590) [`4d54ff7`](https://github.com/quiltt/quiltt-sdks/commit/4d54ff78df69cb7eb6e83edd7500ab1669d085b3) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Signing out now sticks across tabs. `importSession` validated a token with a request and wrote it afterwards, so a sign-out — or a different sign-in — that landed while that request was in flight was overwritten by the late response. The token is now adopted only if the session has not moved on in the meantime, and `importSession` resolves `false` when it did not; two overlapping imports of the same token both resolve `true`.

  - **Fixed** — a tab no longer signs out a session another tab has since saved. An expiry it observes — a stale token arriving late, or one that lapses while a newer sign-in is already stored — ends that tab's own session without writing over the stored one.
  - **Fixed** — a server-rendered app keeps each request's session to itself. One request could render another request's session or be signed out by it, and its GraphQL calls could go out without a session of their own.
  - **Fixed** — an app installed with a `token` option now saves it. The option filled only the app's own session, so its GraphQL requests went out with no token at all and importing that same token reported failure.
  - **Fixed** — a rejected token no longer signs out a session that replaced it while the check was in flight, and no longer cancels a different sign-in that is still being validated.
  - **Fixed** — `revokeSession` no longer signs out a session that was adopted while the revoke was waiting.
  - **Fixed** — `useStorage` no longer reads or writes the shared store on a server, where one request's value was visible to the next.
  - **Changed** — `useStorage`'s initial value applies in browsers, where a missing key previously read back as `null` and the default was ignored, and only to a key that was never written — so a cleared value stays cleared, including after a reload. Setting a value equal to it now saves it instead of being dropped as a no-op.
  - **Added** — the session helpers and types (`createSessionController`, `SESSION_STORAGE_KEY`, `sharedSessionTokenSource`, `SessionController`, `SessionTokenSource`) are exported from `@quiltt/vue` as well as `@quiltt/core`.

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

- [#508](https://github.com/quiltt/quiltt-sdks/pull/508) [`9e01caa`](https://github.com/quiltt/quiltt-sdks/commit/9e01caacabc3288b48f0a40fb4473c0e1998158f) Thanks [@zubairaziz](https://github.com/zubairaziz)! - `@quiltt/vue` now provides the GraphQL client and re-exports Apollo, so a Vue app no longer has to wire either one up itself.

  - **`QuilttPlugin` creates the client** — it builds a `QuilttClient` (or uses a `graphqlClient` you pass in), applies a `headers` option through a `HeadersLink`, and provides it as `DefaultApolloClient` for `useQuery`, `useMutation` and `useSubscription`.
  - **Apollo is re-exported** — Apollo Client types, classes and error types, plus the `@vue/apollo-composable` functions, so they can be imported from `@quiltt/vue`.
  - **`useQuilttSettings` exposes `headers`** — the plugin's `headers` option is provided as `QuilttHeadersKey` and read back through the composable.
  - **Composables and plugin reorganized** — the plugin and its injection keys moved into `plugin/`, with the same public exports.

### Patch Changes

- Updated dependencies []:
  - @quiltt/core@6.1.0

## 6.0.2

### Patch Changes

- Updated dependencies [[`462c095`](https://github.com/quiltt/quiltt-sdks/commit/462c095c4781fcc0e3dbe8bd124a70670b9444f5)]:
  - @quiltt/core@6.0.2

## 6.0.1

### Patch Changes

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

- [#469](https://github.com/quiltt/quiltt-sdks/pull/469) [`292fc83`](https://github.com/quiltt/quiltt-sdks/commit/292fc8313e2c1dcb58156d5d44ca135857b1f40c) Thanks [@zubairaziz](https://github.com/zubairaziz)! - **Vue: Add feature parity with React package**

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

- [#425](https://github.com/quiltt/quiltt-sdks/pull/425) [`c684b3b`](https://github.com/quiltt/quiltt-sdks/commit/c684b3b5f6ea2829e2abfa2a75c0d430edad66a5) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add @quiltt/vue package for Vue 3 applications

  - `QuilttPlugin` for session management via Vue's provide/inject
  - `useQuilttSession` composable for authentication
  - `useQuilttConnector` composable for programmatic control
  - `QuilttButton`, `QuilttConnector`, `QuilttContainer` components

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
