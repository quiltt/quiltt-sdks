# @quiltt/core

## 6.2.0

### Minor Changes

- [#590](https://github.com/quiltt/quiltt-sdks/pull/590) [`4d54ff7`](https://github.com/quiltt/quiltt-sdks/commit/4d54ff78df69cb7eb6e83edd7500ab1669d085b3) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - A session can now be compared before and after an async step, so work that resumes after an `await` can tell whether the session moved on while it waited — which is what lets a sign-out during an in-flight token check win over the late answer.

  - **Added** — `SessionController`, `createSessionController` and the `SessionTokenSource` interface pair a session slot with the setter that writes it, so async work cannot read one session and write another. `markSessionCleared`, `SESSION_STORAGE_KEY` and `sharedSessionTokenSource` come with them, and `@quiltt/core` exposes the module at `@quiltt/core/session`.
  - **Added** — `Storage#has(key)` reports whether a key was ever written, which `get` cannot answer: a key written empty and one never written both read back empty.
  - **Fixed** — a subscription authenticates with the session its request used, rather than the shared session store. A request whose session came from elsewhere failed with `UNAUTHENTICATED` / `NO_TOKEN`, and a store holding a different session connected the WebSocket as that user.
  - **Fixed** — a `401` signs out the session that sent the request, rather than only the shared store, so a server render no longer resends a rejected token on every later query. A rejection that arrives after the session was replaced no longer signs out the newer session.
  - **Fixed** — validating a token drops it through the source that provided it, rather than always through the shared store, so a server render ends its own session and leaves other requests alone.
  - **Fixed** — each GraphQL client batches only its own operations, and a batch never mixes operations that authenticate as different sessions. Two server renders could otherwise travel as one request carrying one `authorization` header, and one render could receive the other's results.
  - **Changed** — a cleared key is written as `null` rather than removed, so a deliberate clear survives a reload and stays distinct from a key that was never written. `LocalStorage#get` reports `null` for it.

## 6.1.6

### Patch Changes

- [#575](https://github.com/quiltt/quiltt-sdks/pull/575) [`b9a7a9d`](https://github.com/quiltt/quiltt-sdks/commit/b9a7a9d1f5a16d7530f0389c7c3cad083c2f0167) Thanks [@lucenstuff](https://github.com/lucenstuff)! - Fix `LocalStorage` throwing a `SecurityError` when a browser blocks storage access. Browsers such as Firefox with cross-site cookies blocked, and sandboxed iframes, throw on the `window.localStorage` property read itself, which escaped before the wrapper's error handling and left the Connector modal blank. Storage reads now fall back to the in-memory store instead of crashing.

## 6.1.5

### Patch Changes

- [#571](https://github.com/quiltt/quiltt-sdks/pull/571) [`eac5d2a`](https://github.com/quiltt/quiltt-sdks/commit/eac5d2a5b0ac26728b40131e8b755e623fbb5fc3) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Cap `fetchWithRetry` retries on HTTP 429 responses so a rate-limited request can no longer amplify into a retry storm

- [#571](https://github.com/quiltt/quiltt-sdks/pull/571) [`eac5d2a`](https://github.com/quiltt/quiltt-sdks/commit/eac5d2a5b0ac26728b40131e8b755e623fbb5fc3) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Validate Session tokens against `POST /v1/introspect/session_token` instead of the deprecated `GET /v1/users/session`. `AuthAPI.ping()` now uses the introspection endpoint; the response payload is unchanged.

## 6.1.4

### Patch Changes

- [#560](https://github.com/quiltt/quiltt-sdks/pull/560) [`e7732ff`](https://github.com/quiltt/quiltt-sdks/commit/e7732ff15ffef69dd3c81dd5e1167f9e151ddb5b) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Configure each service origin explicitly, and refuse a base URL outside Quiltt.

  - **Fixed** — the Connector host is built from `connectorId`, so an ID containing a `/` or `?` could point the iframe or WebView, and the session token in its URL, at another host. `@quiltt/capacitor` and `@quiltt/react-native` now refuse an ID that does not resolve to a Quiltt host, and report an error instead of loading.
  - **Fixed** — `isTrustedQuilttUrl` read some URLs differently than a browser does, so a host it accepted was not always the host that got requested. A backslash ends the authority for a browser but not for the check, so a value like `https://other.example\@quiltt.app` passed the allowlist while resolving to `other.example` — enough to redirect the Connector's session token. It now refuses a backslash, and other characters the parser reinterprets or drops, plus hosts a parser would reject outright.
  - **Added** — `QUILTT_API_BASE_URL`, `QUILTT_AUTH_BASE_URL`, `QUILTT_CDN_BASE_URL` and `QUILTT_WEBSOCKETS_BASE_URL` set a service's origin, scheme included. The SDK still appends the paths it owns. Anything unset keeps its production host, as before.
  - **Added** — `apiBase`, `authBase`, `cdnBase` and `websocketsBase` are exported, along with `isTrustedQuilttUrl`.
  - **Added** — origins are allowlisted: Quiltt hosts (`quiltt.io`, `quiltt.dev`, `quiltt.app`, any subdomain) over TLS on the default port, loopback over a plain connection, and any domain listed in `QUILTT_LOCAL_HOST_DOMAINS`. An untrusted origin throws at import instead of falling back to production.
  - **Replaced** — `QUILTT_API_DOMAIN`, `QUILTT_API_INSECURE` and `QUILTT_INTERNAL_HOST_SEPARATOR`. Set the new variables in the same release; local development also needs `QUILTT_LOCAL_HOST_DOMAINS`.

## 6.1.3

## 6.1.2

## 6.1.1

### Patch Changes

- [#522](https://github.com/quiltt/quiltt-sdks/pull/522) [`a3cabf9`](https://github.com/quiltt/quiltt-sdks/commit/a3cabf9d2efa6121fe6959a569a9f651db9340e4) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Mark `FetchResponse<T>.data` as `T | null` to match runtime reality — `fetchWithRetry` already returns `null` when `response.json()` fails (empty or malformed bodies).

  Add optional chaining guards across `react` and `vue` session, institutions, and resolvable hooks to prevent `Cannot read properties of null` crashes. Previously `data.token` or `data.message` would throw when the response body was unparseable. Now those paths safely short-circuit.

## 6.1.0

## 6.0.2

### Patch Changes

- [#497](https://github.com/quiltt/quiltt-sdks/pull/497) [`462c095`](https://github.com/quiltt/quiltt-sdks/commit/462c095c4781fcc0e3dbe8bd124a70670b9444f5) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Retry empty-body `200` `ServerParseError` responses in `RetryLink`.

  These occur when an in-flight GraphQL request is terminated by a (mobile) webview navigating or backgrounding — WebKit resolves the aborted request as a `200` with zero bytes, so `JSON.parse('')` throws and Apollo raises a `ServerParseError`. The misleading `200` status code previously caused the retry predicate to give up immediately. Session-creating `*Initialize` mutations are intentionally excluded from the retry since they are not idempotent — only the idempotent close mutations, which account for nearly all of these failures, are retried. Also adds a `KeepaliveLink` that sets `keepalive: true` on `*Close` mutations so they can still reach the server during page unload — scoped to closes rather than set link-wide, since `keepalive` requests share a small (~64 KiB) cumulative body budget that a large query or mutation could otherwise exceed.

## 6.0.1

## 6.0.0

## 5.3.0

### Minor Changes

- [#470](https://github.com/quiltt/quiltt-sdks/pull/470) [`0669bd0`](https://github.com/quiltt/quiltt-sdks/commit/0669bd08048010791008f62b5368ee3a5beeb7d0) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Expose `themeMode` prop on all Connector SDK components

  Add a new `themeMode` prop (`'light' | 'dark' | 'auto'`) to control the Connector UI color scheme across all SDKs. Passed as `quiltt-theme-mode` HTML attribute (web) or `theme_mode` URL parameter (mobile). Resolves with priority: SDK override → Dashboard default → `'light'`.

## 5.2.5

## 5.2.4

## 5.2.3

## 5.2.2

### Patch Changes

- [#444](https://github.com/quiltt/quiltt-sdks/pull/444) [`ac582f5`](https://github.com/quiltt/quiltt-sdks/commit/ac582f5313c206765b17ebaacd6d50327130a552) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Trigger manual release

## 5.2.1

### Patch Changes

- [#436](https://github.com/quiltt/quiltt-sdks/pull/436) [`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Added integration tests across all SDK packages (React, Vue, Capacitor React/Vue, React Native, Android, Flutter, and iOS) and validated consistent connector behavior

## 5.2.0

### Minor Changes

- [#427](https://github.com/quiltt/quiltt-sdks/pull/427) [`6d4b768`](https://github.com/quiltt/quiltt-sdks/commit/6d4b7683f49d0a6e649a4bdfaff0398669102a63) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Bump minor version to be consistent with SemVer standards

## 5.1.3

### Patch Changes

- [#425](https://github.com/quiltt/quiltt-sdks/pull/425) [`c684b3b`](https://github.com/quiltt/quiltt-sdks/commit/c684b3b5f6ea2829e2abfa2a75c0d430edad66a5) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Rename `oauthRedirectUrl` to `appLauncherUrl` for mobile OAuth flows

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

## 5.1.2

### Patch Changes

- [#423](https://github.com/quiltt/quiltt-sdks/pull/423) [`aca4d51`](https://github.com/quiltt/quiltt-sdks/commit/aca4d51bc699f80e50977d28b120280db9a4414d) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Fix VersionLink to allow custom Quiltt-SDK-Agent header override

## 5.1.1

### Patch Changes

- [#419](https://github.com/quiltt/quiltt-sdks/pull/419) [`5f5846a`](https://github.com/quiltt/quiltt-sdks/commit/5f5846a1d807f517c156bbebe60d639256a7db1e) Thanks [@rubendinho](https://github.com/rubendinho)! - Update telemetry headers

- [#421](https://github.com/quiltt/quiltt-sdks/pull/421) [`0756cb5`](https://github.com/quiltt/quiltt-sdks/commit/0756cb59d3fb55208cc2d1bdc10a2a8d5b66b595) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Ensure custom Headers are passed to all API calls

## 5.1.0

### Minor Changes

- [#406](https://github.com/quiltt/quiltt-sdks/pull/406) [`177a4fc`](https://github.com/quiltt/quiltt-sdks/commit/177a4fc3d70fa3f313f6586396719dae9763cf4b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add OAuth redirect URL support to React SDK

### Patch Changes

- [#418](https://github.com/quiltt/quiltt-sdks/pull/418) [`2d918a0`](https://github.com/quiltt/quiltt-sdks/commit/2d918a089f8546bb7d20db1eefd958beca296ee0) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Internal: Add `headers` prop to QuilttProvider

  For Quiltt internal usage. Not intended for public use.

## 5.0.3

### Patch Changes

- [#412](https://github.com/quiltt/quiltt-sdks/pull/412) [`099070b`](https://github.com/quiltt/quiltt-sdks/commit/099070b984f7375491e1c736bc3fbd35c93c7fd3) Thanks [@rubendinho](https://github.com/rubendinho)! - Improve User Agent telemetry

- [#410](https://github.com/quiltt/quiltt-sdks/pull/410) [`628887c`](https://github.com/quiltt/quiltt-sdks/commit/628887cc592b492a1fb38ff5898aeda969140855) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Re-Export Upstream Packages

## 5.0.2

## 5.0.1

### Patch Changes

- [#399](https://github.com/quiltt/quiltt-sdks/pull/399) [`77d11b6`](https://github.com/quiltt/quiltt-sdks/commit/77d11b69ceb950da9ca500aa73bae7a3abdfb3a2) Thanks [@CarltonHowell](https://github.com/CarltonHowell)! - Output commonJS

- [#401](https://github.com/quiltt/quiltt-sdks/pull/401) [`2bf07c3`](https://github.com/quiltt/quiltt-sdks/commit/2bf07c36bf8dc573f01db8f4c69a48e05d313b8b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Improve expired auth token detection and clearing

- [#404](https://github.com/quiltt/quiltt-sdks/pull/404) [`45eb8c9`](https://github.com/quiltt/quiltt-sdks/commit/45eb8c907f51c0c8c5a3c069c35e0f301a4c374f) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add Subpath Exports and Reorganize Core Modules

## 5.0.0

### Major Changes

- [#394](https://github.com/quiltt/quiltt-sdks/pull/394) [`2ba646a`](https://github.com/quiltt/quiltt-sdks/commit/2ba646a2efcb7bef7949dab74778ab1c3babdb84) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate Apollo Client to v4

### Minor Changes

- [#395](https://github.com/quiltt/quiltt-sdks/pull/395) [`f635500`](https://github.com/quiltt/quiltt-sdks/commit/f635500f17ab8a76aa0fb87ed7f4971e63a93f12) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Enhanced SDK telemetry with standardized User-Agent headers

## 4.5.1

### Patch Changes

- [#389](https://github.com/quiltt/quiltt-sdks/pull/389) [`a6a2a7e`](https://github.com/quiltt/quiltt-sdks/commit/a6a2a7ea94c7204a69b53f191ee738bcdc520a10) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Upgrade React versions across all projects

## 4.5.0

## 4.4.0

### Minor Changes

- [#378](https://github.com/quiltt/quiltt-sdks/pull/378) [`0af4e66`](https://github.com/quiltt/quiltt-sdks/commit/0af4e6622d1542e0c0c02ac7e897e3e4f9219cbd) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add connector institution search and provider migration support.

  ## New APIs

  ### `useQuilttResolvable` Hook

  Check if external provider institution IDs (e.g., Plaid) can be migrated to your connector.

  ```typescript
  import { useQuilttResolvable } from "@quiltt/react";
  import { useEffect } from "react";

  function ResolvableConnector({ plaidInstitutionId, children }) {
    const { checkResolvable, isResolvable, isLoading } =
      useQuilttResolvable("my-connector-id");

    useEffect(() => {
      checkResolvable({ plaid: plaidInstitutionId });
    }, [plaidInstitutionId]);

    if (isLoading) return <div>Checking...</div>;
    if (!isResolvable) return null;

    return <>{children}</>;
  }

  // Usage
  <ResolvableConnector plaidInstitutionId="ins_3">
    <QuilttButton connectorId="my-connector-id" />
  </ResolvableConnector>;
  ```

## 4.3.3

## 4.3.2

## 4.3.1

### Patch Changes

- [#365](https://github.com/quiltt/quiltt-sdks/pull/365) [`5f6b8af`](https://github.com/quiltt/quiltt-sdks/commit/5f6b8af153086c77bb2227d43ae7023fb0c47985) Thanks [@rubendinho](https://github.com/rubendinho)! - Standardize SDK agent tracking header to `Quiltt-SDK-Agent` and add support for custom Apollo Links injection

## 4.3.0

### Minor Changes

- [#363](https://github.com/quiltt/quiltt-sdks/pull/363) [`641d766`](https://github.com/quiltt/quiltt-sdks/commit/641d76620ffbb99bc80fdc9998ac936883fe1d06) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Upgrade rails/actioncable to v8

## 4.2.3

## 4.2.2

## 4.2.1

## 4.2.0

### Minor Changes

- [#348](https://github.com/quiltt/quiltt-sdks/pull/348) [`7e27845`](https://github.com/quiltt/quiltt-sdks/commit/7e2784523124c87fc6654d8336f924286daade1b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - resolve connectionId persistence issue in QuilttContainer

## 4.1.0

### Minor Changes

- [#342](https://github.com/quiltt/quiltt-sdks/pull/342) [`6a387ba`](https://github.com/quiltt/quiltt-sdks/commit/6a387ba0db77912df85c6cd1924f63edf50f9cdd) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Create useQuilttInstitutions hook

## 4.0.1

### Patch Changes

- [#343](https://github.com/quiltt/quiltt-sdks/pull/343) [`da152b7`](https://github.com/quiltt/quiltt-sdks/commit/da152b7f42606defde5f55488632bcdc095be592) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add the ability to set nonce for the Quiltt SDK Script

## 4.0.0

## 3.9.7

## 3.9.6

### Patch Changes

- [#328](https://github.com/quiltt/quiltt-sdks/pull/328) [`6b8751c`](https://github.com/quiltt/quiltt-sdks/commit/6b8751c981e9e74b347227bc9f427585d21870cd) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Updated QuilttConnector OAuth handler

## 3.9.5

### Patch Changes

- [#325](https://github.com/quiltt/quiltt-sdks/pull/325) [`62b7323`](https://github.com/quiltt/quiltt-sdks/commit/62b732371a8d57242170e0ae838baa4ca8e78059) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Improve useSession and useStorage hooks

## 3.9.4

## 3.9.3

### Patch Changes

- [#319](https://github.com/quiltt/quiltt-sdks/pull/319) [`b97a814`](https://github.com/quiltt/quiltt-sdks/commit/b97a814b87b8bfec9f8b4bb155e1140724e441eb) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Improve typings for query client and react components

## 3.9.2

### Patch Changes

- [#316](https://github.com/quiltt/quiltt-sdks/pull/316) [`de5d43e`](https://github.com/quiltt/quiltt-sdks/commit/de5d43e664a8bbb04595816718f5c645a9c3df27) Thanks [@rubendinho](https://github.com/rubendinho)! - Updated `main` param to `package.json` to improve analyzing the package.

- [#312](https://github.com/quiltt/quiltt-sdks/pull/312) [`11ba6a3`](https://github.com/quiltt/quiltt-sdks/commit/11ba6a3af1975349a63640bb99ed0e34ffee3f1c) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update session handling in QuilttAuthProvider

## 3.9.1

### Patch Changes

- [#310](https://github.com/quiltt/quiltt-sdks/pull/310) [`86b39ac`](https://github.com/quiltt/quiltt-sdks/commit/86b39ac7015fcf21d1c1962df1a76f84c2af9801) Thanks [@rubendinho](https://github.com/rubendinho)! - Added explicit file extensions to import statements to comply with strict ESM module resolution.

## 3.9.0

### Minor Changes

- [#307](https://github.com/quiltt/quiltt-sdks/pull/307) [`d0033cd`](https://github.com/quiltt/quiltt-sdks/commit/d0033cdbdaf33f9227afa55c9a6078156809a563) Thanks [@rubendinho](https://github.com/rubendinho)! - - Significantly reduce bundle size by migrating @apollo/client to "deep entrypoint import style"
  - Bump @apollo/client to v3.11.8

### Patch Changes

- [#305](https://github.com/quiltt/quiltt-sdks/pull/305) [`803a4d0`](https://github.com/quiltt/quiltt-sdks/commit/803a4d09e458ed2e72781fcd475ad5f9639f2bf2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Optimize connector WebView implementation

## 3.8.2

## 3.8.1

### Patch Changes

- [#300](https://github.com/quiltt/quiltt-sdks/pull/300) [`a359810`](https://github.com/quiltt/quiltt-sdks/commit/a3598104565b4428beef9de37f85211e9caf465b)
- Thanks [@zubairaziz](https://github.com/zubairaziz)! - Make @quiltt/react-native ESM only

## 3.8.0

### Minor Changes

- [#298](https://github.com/quiltt/quiltt-sdks/pull/298) [`134b294`](https://github.com/quiltt/quiltt-sdks/commit/134b294019c3bdbccc1f4b5cf9af38d43ea5b3ac) Thanks [@zubairaziz](https://github.com/zubairaziz)! -
  - Update dependencies
  - Update expo-react-native implementation
  - Reorganize test files
  - Fix security vulnerabilities

## 3.7.4

### Patch Changes

- [#296](https://github.com/quiltt/quiltt-sdks/pull/296) [`bff9d1f`](https://github.com/quiltt/quiltt-sdks/commit/bff9d1fb4f89c9c762de85ca0d8ee9a35dd10f7e) Thanks [@rubendinho](https://github.com/rubendinho)! - Fix typings

## 3.7.3

### Patch Changes

- [#293](https://github.com/quiltt/quiltt-sdks/pull/293) [`f4b48e6`](https://github.com/quiltt/quiltt-sdks/commit/f4b48e6db199cae4e880202c28974b481890b7c6) Thanks [@rubendinho](https://github.com/rubendinho)! - Improve documentation

## 3.7.2

### Patch Changes

- [#284](https://github.com/quiltt/quiltt-sdks/pull/284) [`ccfc6a3`](https://github.com/quiltt/quiltt-sdks/commit/ccfc6a36ad465e73723d2286b37a377256c31b11) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Update Dependencies

## 3.7.1

### Patch Changes

- [`524a0d7`](https://github.com/quiltt/quiltt-sdks/commit/524a0d7f83c92648522c7712b82619fcd72e56c8) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add missing opened Enum type

## 3.7.0

### Minor Changes

- [#281](https://github.com/quiltt/quiltt-sdks/pull/281) [`0c5fd75`](https://github.com/quiltt/quiltt-sdks/commit/0c5fd757fa1f688f205431c21c98bb54ea6ea72a) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add bindings for a new onOpen callback event for Connector Modals

## 3.6.14

### Patch Changes

- [#278](https://github.com/quiltt/quiltt-sdks/pull/278) [`0d9e43d`](https://github.com/quiltt/quiltt-sdks/commit/0d9e43d580d73279d7c078219749b000ebb59b02) Thanks [@rubendinho](https://github.com/rubendinho)! - Fix debug config during CI

## 3.6.13

### Patch Changes

- [#276](https://github.com/quiltt/quiltt-sdks/pull/276) [`be1f9be`](https://github.com/quiltt/quiltt-sdks/commit/be1f9be957ef1a7686e6a25807275186c8dd51b4) Thanks [@rubendinho](https://github.com/rubendinho)! - Replace manually imported ActionCable code with official npm package

## 3.6.12

### Patch Changes

- [#274](https://github.com/quiltt/quiltt-sdks/pull/274) [`d684ade`](https://github.com/quiltt/quiltt-sdks/commit/d684ade520689d6207c699cea0681a9331f06069) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update 'rol' types in PrivateClaims

## 3.6.11

### Patch Changes

- [#271](https://github.com/quiltt/quiltt-sdks/pull/271) [`a9ea2a7`](https://github.com/quiltt/quiltt-sdks/commit/a9ea2a7c6592dd5245183996ce0d26ffb53f2ed9) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add 'rol' to private claims

## 3.6.10

### Patch Changes

- [#268](https://github.com/quiltt/quiltt-sdks/pull/268) [`8a82094`](https://github.com/quiltt/quiltt-sdks/commit/8a82094a709d0d7e1478ec32142be33825323708) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate linter to Biome

## 3.6.9

## 3.6.8

## 3.6.7

### Patch Changes

- [#256](https://github.com/quiltt/quiltt-sdks/pull/256) [`824e21e`](https://github.com/quiltt/quiltt-sdks/commit/824e21e14b4731e5ebb0d8bd3ba141ca7d9418e2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add Google recaptcha to allowed URLs

## 3.6.5

## 3.6.4

### Patch Changes

- [#246](https://github.com/quiltt/quiltt-sdks/pull/246) [`38f7904`](https://github.com/quiltt/quiltt-sdks/commit/38f79048e99dc617d700b62fd285623f9f2ae2fa) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update exports for react-native

## 3.6.3

## 3.6.2

### Patch Changes

- [#236](https://github.com/quiltt/quiltt-sdks/pull/236) [`85c0be1`](https://github.com/quiltt/quiltt-sdks/commit/85c0be16803381de5dbd89a7295e326228542080) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix config loading

## 3.6.1

### Patch Changes

- [#232](https://github.com/quiltt/quiltt-sdks/pull/232) [`7a119af`](https://github.com/quiltt/quiltt-sdks/commit/7a119af8b0ba826b8df81f5eb242c002379b4e56) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Improve typeof checks for mobile environments

## 3.6.0

### Minor Changes

- [#229](https://github.com/quiltt/quiltt-sdks/pull/229) [`f688563`](https://github.com/quiltt/quiltt-sdks/commit/f6885635d989fb75918cb13e449ca0eec60850fc) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix Websockets protocol variable

## 3.5.6

### Patch Changes

- [#223](https://github.com/quiltt/quiltt-sdks/pull/223) [`8c5041c`](https://github.com/quiltt/quiltt-sdks/commit/8c5041c1670fd7dbfed06355c06888256ce84b08) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Remove axios and replace with native fetch

## 3.5.5

### Patch Changes

- [#218](https://github.com/quiltt/quiltt-sdks/pull/218) [`7dd42db`](https://github.com/quiltt/quiltt-sdks/commit/7dd42dbc744805d68fbff8fbed73a4bd68022b44) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Fix changeset md to release packages

- [#213](https://github.com/quiltt/quiltt-sdks/pull/213) [`5648e3c`](https://github.com/quiltt/quiltt-sdks/commit/5648e3c91d572d97ad88115710ab840b98e1d469) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add exported files to '@quiltt/react-native'"

- [#210](https://github.com/quiltt/quiltt-sdks/pull/210) [`e57fdb8`](https://github.com/quiltt/quiltt-sdks/commit/e57fdb8c21e90b6a3492bc7a0c858031384caebf) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate bundler to 'bunchee'

- [#216](https://github.com/quiltt/quiltt-sdks/pull/216) [`2895899`](https://github.com/quiltt/quiltt-sdks/commit/289589913c55f8dad2e818d71c4be39c93e5a52a) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Fix release changeset command

## 3.5.4

## 3.5.3

### Patch Changes

- [#197](https://github.com/quiltt/quiltt-sdks/pull/197) [`8d9f24c`](https://github.com/quiltt/quiltt-sdks/commit/8d9f24c59102db5dc665195a6145cfac2c80e2c0) Thanks [@rubendinho](https://github.com/rubendinho)! - Update docs, and fix typo in types

## 3.5.2

### Patch Changes

- [#202](https://github.com/quiltt/quiltt-sdks/pull/202) [`42705f0`](https://github.com/quiltt/quiltt-sdks/commit/42705f0e01b0adb35ab627697169433e1065a8f0) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Expose Institutions to React API

## 3.5.1

### Patch Changes

- [#200](https://github.com/quiltt/quiltt-sdks/pull/200) [`0a07431`](https://github.com/quiltt/quiltt-sdks/commit/0a07431ff936e6cd4fd3aeee66bba1fec21f6624) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Fix release

## 3.5.0

### Minor Changes

- [#198](https://github.com/quiltt/quiltt-sdks/pull/198) [`c65d87a`](https://github.com/quiltt/quiltt-sdks/commit/c65d87a8316dbec82635a0c4108714de7bbd082b) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add Institutions to the Connect API

## 3.4.1

## 3.4.0

## 3.3.10

## 3.3.9

### Patch Changes

- [#187](https://github.com/quiltt/quiltt-sdks/pull/187) [`02f37cd`](https://github.com/quiltt/quiltt-sdks/commit/02f37cda97f501f2d77601d0fd6b7fbbd1c71431) Thanks [@rubendinho](https://github.com/rubendinho)! - Export Quiltt config

## 3.3.8

### Patch Changes

- [#185](https://github.com/quiltt/quiltt-sdks/pull/185) [`a3452da`](https://github.com/quiltt/quiltt-sdks/commit/a3452da3c7604902b5917e1f838e2dced42b708c) Thanks [@rubendinho](https://github.com/rubendinho)! - Fix Vite build error

## 3.3.7

### Patch Changes

- 13bdf9f: Fix URL and atob polyfill

## 3.3.6

### Patch Changes

- bb47eb5: Retry GraphQL requests on Network Errors

## 3.3.5

### Patch Changes

- f633be3: [Internal] Rename Deployments to Clients in Auth

## 3.3.4

### Patch Changes

- b659537: Fix MX OAuth and move some lib into peer dependencies

## 3.3.3

### Patch Changes

- 48a50d0: Fix handle plaid oauth link bug

## 3.3.2

### Patch Changes

- 4a9118b: React Native sdk to support Plaid Oauth url

## 3.3.1

### Patch Changes

- 9bfbc03: Match eventType with MessageType in react native sdk

## 3.3.0

### Minor Changes

- 2a6410f: Add profileId to ConnectorSDKCallbackMetadata

## 3.2.2

### Patch Changes

- 9f3783a: Fix React Native package entry point

## 3.2.1

### Patch Changes

- 31b7543: Drop react-native-url-polyfill

## 3.2.0

### Minor Changes

- 07bc9f3: Release React Native SDK

## 3.1.3

### Patch Changes

- ab55ccb: Skip browser code when in expo app

## 3.1.2

### Patch Changes

- 5ca68bf: Update ConnectorSDKOnLoadCallback type

## 3.1.1

### Patch Changes

- a66f1bd: Add onLoad callbacks

## 3.1.0

### Minor Changes

- af052a7: Add 'Load' to ConnectorSDKEventType

## 3.0.3

### Patch Changes

- 977a6a5: Bump graphql from 16.7.1 to 16.8.1

## 3.0.2

### Patch Changes

- 315de22: Increase 429 handling for ci/cd

## 3.0.1

### Patch Changes

- c8bfa0a: Export additional ConnectorSDK types

## 3.0.0

### Major Changes

- e12a1ef: Rename Connector SDK Types for better namespacing

## 2.4.1

### Patch Changes

- 44e9759: Fix bug with backoff timer, extend max delay before failure

## 2.4.0

### Minor Changes

- 48ae700: Add Reset to the SDK API

## 2.3.2

### Patch Changes

- c4ac918: Add retries to auth api when dealing with network related errors

## 2.3.1

### Patch Changes

- 108899b: Add ability for session import to validate environment

## 2.3.0

### Minor Changes

- 264fb68: Add EID to Session JWT Type

## 2.2.1

### Patch Changes

- b4dd03c: Add ApolloError to graphql exports

## 2.2.0

### Minor Changes

- 24f6df1: This introduces a new Javascript API that can be used instead of or with the DOM API, giving exposure to exit events. There are a few ways to use it:

  ## 1. HTML5

  If you're using the HTML interface, and need to upgrade to using some Javascript code, you can; but all event registrations are on a global level. This means that if you have multiple buttons, you will look at the metadata of the response to see which one you're reacting to.

  ```html
  <head>
    <script src="https://cdn.quiltt.io/v1/connector.js"></script>
    <script language="JavaScript">
      Quiltt.onExitSuccess((metadata) =>
        console.log("Global onExitSuccess", metadata.connectionId)
      );
    </script>
  </head>
  <body>
    <button quiltt-button="<CONNECTOR_ID">Click Here!</button>
  </body>
  ```

  ## 2. Javascript

  Now if you want to do something more complex, and expect to be working with multiple buttons in different ways, then the Javascript SDK may be the way to go. With this, you can control everything in JS.

  ```html
  <head>
    <script src="https://cdn.quiltt.io/v1/connector.js"></script>
    <script language="JavaScript">
      Quiltt.authenticate("<SESSION_TOKEN>");

      const connector = Quiltt.connect("<CONNECTOR_ID>", {
        onExitSuccess: (metadata) => {
          console.log("Connector onExitSuccess", metadata.connectionId),
        });

      connector.open();
    </script>
  </head>
  ```

  ## 3. React

  With these new hooks, the React components now support callbacks.

  ```tsx
  import { QuilttButton } from '@quiltt/react'

  export const App = () => {
    const [connectionId, setConnectionId] = useState<string>()
    const handleSuccess = (metadata) => setConnectionId(metadata?.connectionId)

    return (
      <QuilttButton connectorId="<CONNECTOR_ID>" onExitSuccess={handleSuccess}>
        Add
      </QuilttButton>

      <QuilttButton connectorId="<CONNECTOR_ID>" connectionId={connectionId}>
        Repair
      </QuilttButton>
    )
  }
  ```

## 2.1.2

### Patch Changes

- 541c809: `@quiltt/react`: Add support for using a custom storage key in the `useSession` hook

## 2.1.1

### Patch Changes

- 43131d5: - Add code examples to README
  - Auto-create Github Releases
  - Misc cleanups

## 2.1.0

### Minor Changes

- 7debd45: Add support for custom components 'as' props

## 2.0.0

### Major Changes

- bc6fd8c: Create new React Connector SDK helper components supported by refactored hook

## 1.3.0

### Minor Changes

- 6936687: - Fix transpilation issues caused by importing React components
  - Add CI via Github Action
  - Add test Next.js app
  - Misc cleanups

## 1.2.8

### Patch Changes

- fa07b6a: Add READMEs

## 1.2.7

### Patch Changes

- 0321f3e: Filter packages to publish

## 1.2.6

### Patch Changes

- 1594b4a: Pass NPM_TOKEN for publishing

## 1.2.5

### Patch Changes

- ba18907: Publish to npm registry

## 1.2.4

### Patch Changes

- a05ccfc: Revert types/react and tsup

## 1.2.3

### Patch Changes

- 71ba4d9: Add react and react-dom as devDependency

## 1.2.2

### Patch Changes

- 89fca3b: Add useQuilttConnector hook

## 1.2.1

### Patch Changes

- 01e1247: Update packages

## 1.2.0

### Minor Changes

- 215662a: Update deps

## 1.1.5

### Patch Changes

- 4e237ce: Expose useEventListener

## 1.1.4

### Patch Changes

- c67e98d: Revert attempt to force reset through renders

## 1.1.3

### Patch Changes

- d8fdcaa: Add option to set QuilttProvider to reset on session change

## 1.1.2

### Patch Changes

- dcf2c5c: Improve session yanking after getting a 401

## 1.1.1

### Patch Changes

- 0a78cd2: Move session revoking to be directly to storage

## 1.1.0

### Minor Changes

- 7a1e387: Attempt to reduce race conditions with session changes by pulling token changing logic directly into the respective apollo links

## 1.0.37

### Patch Changes

- 9169fde: Reduce complexity of useSession by replacing useState with useMemo

## 1.0.36

### Patch Changes

- 9f34730: Remove redundant initializeState logic from useSession

## 1.0.35

### Patch Changes

- 14309ed: Update deps
- 6b8d7a4: Reduce the risk of race conditions double subscribing to localstorage changes

## 1.0.34

### Patch Changes

- 54a6574: Save localstorage before memorystorage to give localstorage more time to flush

## 1.0.33

### Patch Changes

- f0c60dd: Update useSession hook to memoize initialSession

## 1.0.32

### Patch Changes

- 97aa921: Revert adding loading state to graphql as it causes unexpected resets to subcomponents

## 1.0.31

### Patch Changes

- 18cb0a2: Add loading state to graphql provider to reduce unauthd requests

## 1.0.30

### Patch Changes

- 5d6027b: Fix issue with useSession setSession not being wrapped in useCallback, causing invalidations every render

## 1.0.29

### Patch Changes

- 098710f: Fix useEffect and useState looping hell

## 1.0.28

### Patch Changes

- 3877274: Fix issues with graphql client not being updated with new sessions

## 1.0.27

### Patch Changes

- 1b073ea: - Fix potential bugs and memory leaks in `Storage`
  - Add helper hooks to compose other hooks
  - Update useStorage hook

## 1.0.26

### Patch Changes

- 4a03bc8: Update types & fix linting

## 1.0.25

### Patch Changes

- 2ffea2f: Fix issue with this being undefined for ActionCableLink

## 1.0.24

### Patch Changes

- d9d234b: Switch to using globalThis for actioncable self

## 1.0.23

### Patch Changes

- 9fb69ae: Fix issues with SSR on nextjs and subscriptions

## 1.0.22

### Patch Changes

- 4a06719: Revert back to upstream packages

## 1.0.21

### Patch Changes

- 49f108a: Fix graphql subscriptions from not working due to channel name mismatch

## 1.0.20

### Patch Changes

- 7e0d314: Set cable to be a singleton to reduce the chance of having multiple trying to run

## 1.0.19

### Patch Changes

- 866407c: Improve websocket subscriptions lifecycle handling

## 1.0.18

### Patch Changes

- bf25cc4: Prevent websockets from attempting to connect without a token

## 1.0.17

### Patch Changes

- 190df4d: Fix issue with ActionCableLink calling the wrong #perform

## 1.0.16

### Patch Changes

- c284002: Add some types to actioncable and connect logging to config

## 1.0.15

### Patch Changes

- 2f6f903: Fix issue with importing sessions and cache resetting causing request cancelations during race conditions

## 1.0.14

### Patch Changes

- a97e9c8: Pin Dependencies & Update Linting
- 6d35bae: Remove unused global declares

## 1.0.13

### Patch Changes

- 24d28f3: Add missing apollo esms

## 1.0.12

### Patch Changes

- 3eb86ce: Force load all of apollo esms

## 1.0.11

### Patch Changes

- 2932555: Load ActionLinkCable Apollo esms

## 1.0.10

### Patch Changes

- f014a84: Set apollo links to load esm from .js

## 1.0.9

### Patch Changes

- be8e696: Attempt to improve esm loading of apollo links

## 1.0.8

### Patch Changes

- 250f817: Refactor AuthLink to improve compiling

## 1.0.7

### Patch Changes

- 9e78757: Fix issues with QuilttClient/Link not working

## 1.0.6

### Patch Changes

- 882b229: Set default forwardlink within quiltt link

## 1.0.5

### Patch Changes

- 795bf20: Improve how graphql client is loaded

## 1.0.4

### Patch Changes

- 9bc26d1: Import action cable code to help with building

## 1.0.3

### Patch Changes

- 19a5f41: Allow client id to be optional for token based apps

## 1.0.2

### Patch Changes

- 3f06262: Update build config

## 1.0.1

### Patch Changes

- 86d6689: Fix issue with react not reexporting core
