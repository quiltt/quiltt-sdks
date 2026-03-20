# @quiltt/react-native

## 5.2.2

### Patch Changes

- [#442](https://github.com/quiltt/quiltt-sdks/pull/442) [`253ce5a`](https://github.com/quiltt/quiltt-sdks/commit/253ce5a1f0f6323ec5b449e2be76266f8dad70ee) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Trigger manual release

- Updated dependencies [[`253ce5a`](https://github.com/quiltt/quiltt-sdks/commit/253ce5a1f0f6323ec5b449e2be76266f8dad70ee)]:
  - @quiltt/core@5.2.2
  - @quiltt/react@5.2.2

## 5.2.1

### Patch Changes

- [#436](https://github.com/quiltt/quiltt-sdks/pull/436) [`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Added integration tests across all SDK packages (React, Vue, Capacitor React/Vue, React Native, Android, Flutter, and iOS) and validated consistent connector behavior

- Updated dependencies [[`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41)]:
  - @quiltt/react@5.2.1
  - @quiltt/core@5.2.1

## 5.2.0

### Minor Changes

- [#427](https://github.com/quiltt/quiltt-sdks/pull/427) [`6d4b768`](https://github.com/quiltt/quiltt-sdks/commit/6d4b7683f49d0a6e649a4bdfaff0398669102a63) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Bump minor version to be consistent with SemVer standards

### Patch Changes

- Updated dependencies [[`6d4b768`](https://github.com/quiltt/quiltt-sdks/commit/6d4b7683f49d0a6e649a4bdfaff0398669102a63)]:
  - @quiltt/react@5.2.0
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
  - @quiltt/react@5.1.3

## 5.1.2

### Patch Changes

- [#423](https://github.com/quiltt/quiltt-sdks/pull/423) [`aca4d51`](https://github.com/quiltt/quiltt-sdks/commit/aca4d51bc699f80e50977d28b120280db9a4414d) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Fix VersionLink to allow custom Quiltt-SDK-Agent header override

- Updated dependencies [[`aca4d51`](https://github.com/quiltt/quiltt-sdks/commit/aca4d51bc699f80e50977d28b120280db9a4414d)]:
  - @quiltt/core@5.1.2
  - @quiltt/react@5.1.2

## 5.1.1

### Patch Changes

- [#419](https://github.com/quiltt/quiltt-sdks/pull/419) [`5f5846a`](https://github.com/quiltt/quiltt-sdks/commit/5f5846a1d807f517c156bbebe60d639256a7db1e) Thanks [@rubendinho](https://github.com/rubendinho)! - Update telemetry headers

- [#421](https://github.com/quiltt/quiltt-sdks/pull/421) [`0756cb5`](https://github.com/quiltt/quiltt-sdks/commit/0756cb59d3fb55208cc2d1bdc10a2a8d5b66b595) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Ensure custom Headers are passed to all API calls

- Updated dependencies [[`5f5846a`](https://github.com/quiltt/quiltt-sdks/commit/5f5846a1d807f517c156bbebe60d639256a7db1e), [`0756cb5`](https://github.com/quiltt/quiltt-sdks/commit/0756cb59d3fb55208cc2d1bdc10a2a8d5b66b595)]:
  - @quiltt/react@5.1.1
  - @quiltt/core@5.1.1

## 5.1.0

### Minor Changes

- [#406](https://github.com/quiltt/quiltt-sdks/pull/406) [`177a4fc`](https://github.com/quiltt/quiltt-sdks/commit/177a4fc3d70fa3f313f6586396719dae9763cf4b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add OAuth redirect URL support to React SDK

### Patch Changes

- Updated dependencies [[`2d918a0`](https://github.com/quiltt/quiltt-sdks/commit/2d918a089f8546bb7d20db1eefd958beca296ee0), [`177a4fc`](https://github.com/quiltt/quiltt-sdks/commit/177a4fc3d70fa3f313f6586396719dae9763cf4b)]:
  - @quiltt/core@5.1.0
  - @quiltt/react@5.1.0

## 5.0.3

### Patch Changes

- [#412](https://github.com/quiltt/quiltt-sdks/pull/412) [`099070b`](https://github.com/quiltt/quiltt-sdks/commit/099070b984f7375491e1c736bc3fbd35c93c7fd3) Thanks [@rubendinho](https://github.com/rubendinho)! - Improve User Agent telemetry

- [#410](https://github.com/quiltt/quiltt-sdks/pull/410) [`628887c`](https://github.com/quiltt/quiltt-sdks/commit/628887cc592b492a1fb38ff5898aeda969140855) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Re-Export Upstream Packages

- Updated dependencies [[`099070b`](https://github.com/quiltt/quiltt-sdks/commit/099070b984f7375491e1c736bc3fbd35c93c7fd3), [`628887c`](https://github.com/quiltt/quiltt-sdks/commit/628887cc592b492a1fb38ff5898aeda969140855)]:
  - @quiltt/core@5.0.3
  - @quiltt/react@5.0.3

## 5.0.2

### Patch Changes

- [#407](https://github.com/quiltt/quiltt-sdks/pull/407) [`0262754`](https://github.com/quiltt/quiltt-sdks/commit/0262754fa680d39cea1426a09796783488a4f4d6) Thanks [@rubendinho](https://github.com/rubendinho)! - Add Institution Prop to QuilttContainer

- Updated dependencies [[`0262754`](https://github.com/quiltt/quiltt-sdks/commit/0262754fa680d39cea1426a09796783488a4f4d6)]:
  - @quiltt/react@5.0.2
  - @quiltt/core@5.0.2

## 5.0.1

### Patch Changes

- [#403](https://github.com/quiltt/quiltt-sdks/pull/403) [`b714ff3`](https://github.com/quiltt/quiltt-sdks/commit/b714ff3b3ee878445ca8e09903153ac0b43d693b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Prevent Infinite Re-Renders in QuilttProvider

- [#399](https://github.com/quiltt/quiltt-sdks/pull/399) [`77d11b6`](https://github.com/quiltt/quiltt-sdks/commit/77d11b69ceb950da9ca500aa73bae7a3abdfb3a2) Thanks [@CarltonHowell](https://github.com/CarltonHowell)! - Output commonJS

- [#402](https://github.com/quiltt/quiltt-sdks/pull/402) [`97eccbe`](https://github.com/quiltt/quiltt-sdks/commit/97eccbe6df42843307a11d28a0a8b5a36e43f3d9) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Remove Node.js Dependencies in React Native Builds

- [#401](https://github.com/quiltt/quiltt-sdks/pull/401) [`2bf07c3`](https://github.com/quiltt/quiltt-sdks/commit/2bf07c36bf8dc573f01db8f4c69a48e05d313b8b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Improve expired auth token detection and clearing

- [#404](https://github.com/quiltt/quiltt-sdks/pull/404) [`45eb8c9`](https://github.com/quiltt/quiltt-sdks/commit/45eb8c907f51c0c8c5a3c069c35e0f301a4c374f) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add Subpath Exports and Reorganize Core Modules

- Updated dependencies [[`b714ff3`](https://github.com/quiltt/quiltt-sdks/commit/b714ff3b3ee878445ca8e09903153ac0b43d693b), [`77d11b6`](https://github.com/quiltt/quiltt-sdks/commit/77d11b69ceb950da9ca500aa73bae7a3abdfb3a2), [`97eccbe`](https://github.com/quiltt/quiltt-sdks/commit/97eccbe6df42843307a11d28a0a8b5a36e43f3d9), [`2bf07c3`](https://github.com/quiltt/quiltt-sdks/commit/2bf07c36bf8dc573f01db8f4c69a48e05d313b8b), [`45eb8c9`](https://github.com/quiltt/quiltt-sdks/commit/45eb8c907f51c0c8c5a3c069c35e0f301a4c374f)]:
  - @quiltt/react@5.0.1
  - @quiltt/core@5.0.1

## 5.0.0

### Major Changes

- [#394](https://github.com/quiltt/quiltt-sdks/pull/394) [`2ba646a`](https://github.com/quiltt/quiltt-sdks/commit/2ba646a2efcb7bef7949dab74778ab1c3babdb84) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate Apollo Client to v4

### Minor Changes

- [#395](https://github.com/quiltt/quiltt-sdks/pull/395) [`f635500`](https://github.com/quiltt/quiltt-sdks/commit/f635500f17ab8a76aa0fb87ed7f4971e63a93f12) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Enhanced SDK telemetry with standardized User-Agent headers

### Patch Changes

- Updated dependencies [[`f635500`](https://github.com/quiltt/quiltt-sdks/commit/f635500f17ab8a76aa0fb87ed7f4971e63a93f12), [`2ba646a`](https://github.com/quiltt/quiltt-sdks/commit/2ba646a2efcb7bef7949dab74778ab1c3babdb84)]:
  - @quiltt/react@5.0.0
  - @quiltt/core@5.0.0

## 4.5.1

### Patch Changes

- [#389](https://github.com/quiltt/quiltt-sdks/pull/389) [`a6a2a7e`](https://github.com/quiltt/quiltt-sdks/commit/a6a2a7ea94c7204a69b53f191ee738bcdc520a10) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Upgrade React versions across all projects

- Updated dependencies [[`a6a2a7e`](https://github.com/quiltt/quiltt-sdks/commit/a6a2a7ea94c7204a69b53f191ee738bcdc520a10)]:
  - @quiltt/react@4.5.1
  - @quiltt/core@4.5.1

## 4.5.0

### Minor Changes

- [#386](https://github.com/quiltt/quiltt-sdks/pull/386) [`0bf706c`](https://github.com/quiltt/quiltt-sdks/commit/0bf706ce2ad926304d6eac739ee58971736f913e) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update platform webview props

### Patch Changes

- [#380](https://github.com/quiltt/quiltt-sdks/pull/380) [`31cd190`](https://github.com/quiltt/quiltt-sdks/commit/31cd1902618ebc2314d42dd7aca81b3ab94068ea) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Improve useQuilttResolvable error messaging

- Updated dependencies [[`31cd190`](https://github.com/quiltt/quiltt-sdks/commit/31cd1902618ebc2314d42dd7aca81b3ab94068ea), [`0bf706c`](https://github.com/quiltt/quiltt-sdks/commit/0bf706ce2ad926304d6eac739ee58971736f913e)]:
  - @quiltt/core@4.5.0
  - @quiltt/react@4.5.0

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

### Patch Changes

- Updated dependencies [[`0af4e66`](https://github.com/quiltt/quiltt-sdks/commit/0af4e6622d1542e0c0c02ac7e897e3e4f9219cbd)]:
  - @quiltt/react@4.4.0
  - @quiltt/core@4.4.0

## 4.3.3

### Patch Changes

- [#375](https://github.com/quiltt/quiltt-sdks/pull/375) [`fdc91e3`](https://github.com/quiltt/quiltt-sdks/commit/fdc91e3efb3f63659580f2d1d2ea0ff7fcaee8f5) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add 403 callback to Auth useIdentifySession

- Updated dependencies [[`fdc91e3`](https://github.com/quiltt/quiltt-sdks/commit/fdc91e3efb3f63659580f2d1d2ea0ff7fcaee8f5)]:
  - @quiltt/react@4.3.3
  - @quiltt/core@4.3.3

## 4.3.2

### Patch Changes

- [#372](https://github.com/quiltt/quiltt-sdks/pull/372) [`c022ebe`](https://github.com/quiltt/quiltt-sdks/commit/c022ebed0c82404a1bdbf5abbaf6e60b49f2d07a) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Hardened React SDK against unstable prop references by implementing ref-based callback wrappers and deep equality checks, eliminating unnecessary re-renders, event handler churn, and API calls without requiring customers to use useCallback.

- Updated dependencies [[`c022ebe`](https://github.com/quiltt/quiltt-sdks/commit/c022ebed0c82404a1bdbf5abbaf6e60b49f2d07a)]:
  - @quiltt/react@4.3.2
  - @quiltt/core@4.3.2

## 4.3.1

### Patch Changes

- [#366](https://github.com/quiltt/quiltt-sdks/pull/366) [`dc376b5`](https://github.com/quiltt/quiltt-sdks/commit/dc376b52dd824d7867ca74677bbfd5c54eff5cdc) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Warn if useQuilttConnector is unmounted while in use
- [#365](https://github.com/quiltt/quiltt-sdks/pull/365) [`5f6b8af`](https://github.com/quiltt/quiltt-sdks/commit/5f6b8af153086c77bb2227d43ae7023fb0c47985) Thanks [@rubendinho](https://github.com/rubendinho)! - Standardize SDK agent tracking header to `Quiltt-SDK-Agent` and add support for custom Apollo Links injection

- Updated dependencies [[`dc376b5`](https://github.com/quiltt/quiltt-sdks/commit/dc376b52dd824d7867ca74677bbfd5c54eff5cdc)]:
  - @quiltt/react@4.3.1
  - @quiltt/core@4.3.1

## 4.3.0

### Minor Changes

- [#363](https://github.com/quiltt/quiltt-sdks/pull/363) [`641d766`](https://github.com/quiltt/quiltt-sdks/commit/641d76620ffbb99bc80fdc9998ac936883fe1d06) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Upgrade rails/actioncable to v8

### Patch Changes

- Updated dependencies [[`641d766`](https://github.com/quiltt/quiltt-sdks/commit/641d76620ffbb99bc80fdc9998ac936883fe1d06)]:
  - @quiltt/react@4.3.0
  - @quiltt/core@4.3.0

## 4.2.3

### Patch Changes

- [#355](https://github.com/quiltt/quiltt-sdks/pull/355) [`6d32f3e`](https://github.com/quiltt/quiltt-sdks/commit/6d32f3e40e7554c512ca63ef532d689d5485e10c) Thanks [@rubendinho](https://github.com/rubendinho)! - Improve error handling in React Native

- Updated dependencies [[`6d32f3e`](https://github.com/quiltt/quiltt-sdks/commit/6d32f3e40e7554c512ca63ef532d689d5485e10c)]:
  - @quiltt/core@4.2.3
  - @quiltt/react@4.2.3

## 4.2.2

### Patch Changes

- [#352](https://github.com/quiltt/quiltt-sdks/pull/352) [`45b3b32`](https://github.com/quiltt/quiltt-sdks/commit/45b3b3270b69b95c9553e149e15870be4f43af3b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix useQuilttInstitutions export

- Updated dependencies [[`45b3b32`](https://github.com/quiltt/quiltt-sdks/commit/45b3b3270b69b95c9553e149e15870be4f43af3b)]:
  - @quiltt/react@4.2.2
  - @quiltt/core@4.2.2

## 4.2.1

### Patch Changes

- [#350](https://github.com/quiltt/quiltt-sdks/pull/350) [`0233592`](https://github.com/quiltt/quiltt-sdks/commit/02335928bb872a6588c2ca81a1bd9a081053bd29) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Bugfix: early return in effect prevents reconnect from being called

- Updated dependencies [[`0233592`](https://github.com/quiltt/quiltt-sdks/commit/02335928bb872a6588c2ca81a1bd9a081053bd29)]:
  - @quiltt/react@4.2.1
  - @quiltt/core@4.2.1

## 4.2.0

### Minor Changes

- [#348](https://github.com/quiltt/quiltt-sdks/pull/348) [`7e27845`](https://github.com/quiltt/quiltt-sdks/commit/7e2784523124c87fc6654d8336f924286daade1b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - resolve connectionId persistence issue in QuilttContainer

### Patch Changes

- Updated dependencies [[`7e27845`](https://github.com/quiltt/quiltt-sdks/commit/7e2784523124c87fc6654d8336f924286daade1b)]:
  - @quiltt/react@4.2.0
  - @quiltt/core@4.2.0

## 4.1.0

### Minor Changes

- [#342](https://github.com/quiltt/quiltt-sdks/pull/342) [`6a387ba`](https://github.com/quiltt/quiltt-sdks/commit/6a387ba0db77912df85c6cd1924f63edf50f9cdd) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Create useQuilttInstitutions hook

### Patch Changes

- Updated dependencies [[`6a387ba`](https://github.com/quiltt/quiltt-sdks/commit/6a387ba0db77912df85c6cd1924f63edf50f9cdd)]:
  - @quiltt/react@4.1.0
  - @quiltt/core@4.1.0

## 4.0.1

### Patch Changes

- [#343](https://github.com/quiltt/quiltt-sdks/pull/343) [`da152b7`](https://github.com/quiltt/quiltt-sdks/commit/da152b7f42606defde5f55488632bcdc095be592) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add the ability to set nonce for the Quiltt SDK Script

- Updated dependencies [[`da152b7`](https://github.com/quiltt/quiltt-sdks/commit/da152b7f42606defde5f55488632bcdc095be592)]:
  - @quiltt/react@4.0.1
  - @quiltt/core@4.0.1

## 4.0.0

### Major Changes

- [#333](https://github.com/quiltt/quiltt-sdks/pull/333) [`5afca4a`](https://github.com/quiltt/quiltt-sdks/commit/5afca4a45f357afbb7f6af02088f86230f351e18) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate to 'Navigate' message for URL handling

### Patch Changes

- Updated dependencies [[`5afca4a`](https://github.com/quiltt/quiltt-sdks/commit/5afca4a45f357afbb7f6af02088f86230f351e18)]:
  - @quiltt/core@4.0.0
  - @quiltt/react@4.0.0

## 3.9.7

### Patch Changes

- [#330](https://github.com/quiltt/quiltt-sdks/pull/330) [`e7b8e74`](https://github.com/quiltt/quiltt-sdks/commit/e7b8e74613f7725c6f2653be6d8ac0e06cce661d) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Make OAuth Handling Safer

- Updated dependencies [[`e7b8e74`](https://github.com/quiltt/quiltt-sdks/commit/e7b8e74613f7725c6f2653be6d8ac0e06cce661d)]:
  - @quiltt/core@3.9.7
  - @quiltt/react@3.9.7

## 3.9.6

### Patch Changes

- [#328](https://github.com/quiltt/quiltt-sdks/pull/328) [`6b8751c`](https://github.com/quiltt/quiltt-sdks/commit/6b8751c981e9e74b347227bc9f427585d21870cd) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Updated QuilttConnector OAuth handler

- Updated dependencies [[`6b8751c`](https://github.com/quiltt/quiltt-sdks/commit/6b8751c981e9e74b347227bc9f427585d21870cd)]:
  - @quiltt/react@3.9.6
  - @quiltt/core@3.9.6

## 3.9.5

### Patch Changes

- [#325](https://github.com/quiltt/quiltt-sdks/pull/325) [`62b7323`](https://github.com/quiltt/quiltt-sdks/commit/62b732371a8d57242170e0ae838baa4ca8e78059) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Improve useSession and useStorage hooks

- Updated dependencies [[`62b7323`](https://github.com/quiltt/quiltt-sdks/commit/62b732371a8d57242170e0ae838baa4ca8e78059)]:
  - @quiltt/react@3.9.5
  - @quiltt/core@3.9.5

## 3.9.4

### Patch Changes

- [#321](https://github.com/quiltt/quiltt-sdks/pull/321) [`642ec0f`](https://github.com/quiltt/quiltt-sdks/commit/642ec0f34f2506672993b82785b5b5ddb5c69069) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Bugfix: iOS WebView header drag behavior and scrolling

- Updated dependencies [[`642ec0f`](https://github.com/quiltt/quiltt-sdks/commit/642ec0f34f2506672993b82785b5b5ddb5c69069)]:
  - @quiltt/core@3.9.4
  - @quiltt/react@3.9.4

## 3.9.3

### Patch Changes

- [#319](https://github.com/quiltt/quiltt-sdks/pull/319) [`b97a814`](https://github.com/quiltt/quiltt-sdks/commit/b97a814b87b8bfec9f8b4bb155e1140724e441eb) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Improve typings for query client and react components

- Updated dependencies [[`b97a814`](https://github.com/quiltt/quiltt-sdks/commit/b97a814b87b8bfec9f8b4bb155e1140724e441eb)]:
  - @quiltt/react@3.9.3
  - @quiltt/core@3.9.3

## 3.9.2

### Patch Changes

- [#316](https://github.com/quiltt/quiltt-sdks/pull/316) [`de5d43e`](https://github.com/quiltt/quiltt-sdks/commit/de5d43e664a8bbb04595816718f5c645a9c3df27) Thanks [@rubendinho](https://github.com/rubendinho)! - Updated `main` param to `package.json` to improve analyzing the package.

- [#313](https://github.com/quiltt/quiltt-sdks/pull/313) [`3b789c9`](https://github.com/quiltt/quiltt-sdks/commit/3b789c9413ab2f9bdda965248ed7a8ccaf270172) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update typings for QuilttButton onLoad handler

- [#312](https://github.com/quiltt/quiltt-sdks/pull/312) [`11ba6a3`](https://github.com/quiltt/quiltt-sdks/commit/11ba6a3af1975349a63640bb99ed0e34ffee3f1c) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update session handling in QuilttAuthProvider

- Updated dependencies [[`de5d43e`](https://github.com/quiltt/quiltt-sdks/commit/de5d43e664a8bbb04595816718f5c645a9c3df27), [`3b789c9`](https://github.com/quiltt/quiltt-sdks/commit/3b789c9413ab2f9bdda965248ed7a8ccaf270172), [`11ba6a3`](https://github.com/quiltt/quiltt-sdks/commit/11ba6a3af1975349a63640bb99ed0e34ffee3f1c)]:
  - @quiltt/react@3.9.2
  - @quiltt/core@3.9.2

## 3.9.1

### Patch Changes

- [#310](https://github.com/quiltt/quiltt-sdks/pull/310) [`86b39ac`](https://github.com/quiltt/quiltt-sdks/commit/86b39ac7015fcf21d1c1962df1a76f84c2af9801) Thanks [@rubendinho](https://github.com/rubendinho)! - Added explicit file extensions to import statements to comply with strict ESM module resolution.

- Updated dependencies [[`86b39ac`](https://github.com/quiltt/quiltt-sdks/commit/86b39ac7015fcf21d1c1962df1a76f84c2af9801)]:
  - @quiltt/react@3.9.1
  - @quiltt/core@3.9.1

## 3.9.0

### Minor Changes

- [#307](https://github.com/quiltt/quiltt-sdks/pull/307) [`d0033cd`](https://github.com/quiltt/quiltt-sdks/commit/d0033cdbdaf33f9227afa55c9a6078156809a563) Thanks [@rubendinho](https://github.com/rubendinho)! - - Significantly reduce bundle size by migrating @apollo/client to "deep entrypoint import style"
  - Bump @apollo/client to v3.11.8

### Patch Changes

- [#305](https://github.com/quiltt/quiltt-sdks/pull/305) [`803a4d0`](https://github.com/quiltt/quiltt-sdks/commit/803a4d09e458ed2e72781fcd475ad5f9639f2bf2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Optimize connector WebView implementation

- Updated dependencies [[`803a4d0`](https://github.com/quiltt/quiltt-sdks/commit/803a4d09e458ed2e72781fcd475ad5f9639f2bf2), [`d0033cd`](https://github.com/quiltt/quiltt-sdks/commit/d0033cdbdaf33f9227afa55c9a6078156809a563)]:
  - @quiltt/react@3.9.0
  - @quiltt/core@3.9.0

## 3.8.2

### Patch Changes

- [#303](https://github.com/quiltt/quiltt-sdks/pull/303) [`d1ceb66`](https://github.com/quiltt/quiltt-sdks/commit/d1ceb6648f4c2747988f8d6cacbee9946beaea0c) Thanks [@rubendinho](https://github.com/rubendinho)! - Reduce bundle size

- Updated dependencies [[`d1ceb66`](https://github.com/quiltt/quiltt-sdks/commit/d1ceb6648f4c2747988f8d6cacbee9946beaea0c)]:
  - @quiltt/react@3.8.2
  - @quiltt/core@3.8.2

## 3.8.1

### Patch Changes

- [#300](https://github.com/quiltt/quiltt-sdks/pull/300) [`a359810`](https://github.com/quiltt/quiltt-sdks/commit/a3598104565b4428beef9de37f85211e9caf465b) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Make @quiltt/react-native ESM only

- Updated dependencies [[`a359810`](https://github.com/quiltt/quiltt-sdks/commit/a3598104565b4428beef9de37f85211e9caf465b)]:
  - @quiltt/react@3.8.1
  - @quiltt/core@3.8.1

## 3.8.0

### Minor Changes

- [#298](https://github.com/quiltt/quiltt-sdks/pull/298) [`134b294`](https://github.com/quiltt/quiltt-sdks/commit/134b294019c3bdbccc1f4b5cf9af38d43ea5b3ac) Thanks [@zubairaziz](https://github.com/zubairaziz)! - - Update dependencies
  - Update expo-react-native implementation
  - Reorganize test files
  - Fix security vulnerabilities

### Patch Changes

- Updated dependencies [[`134b294`](https://github.com/quiltt/quiltt-sdks/commit/134b294019c3bdbccc1f4b5cf9af38d43ea5b3ac)]:
  - @quiltt/react@3.8.0
  - @quiltt/core@3.8.0

## 3.7.4

### Patch Changes

- [#296](https://github.com/quiltt/quiltt-sdks/pull/296) [`bff9d1f`](https://github.com/quiltt/quiltt-sdks/commit/bff9d1fb4f89c9c762de85ca0d8ee9a35dd10f7e) Thanks [@rubendinho](https://github.com/rubendinho)! - Fix typings

- Updated dependencies [[`bff9d1f`](https://github.com/quiltt/quiltt-sdks/commit/bff9d1fb4f89c9c762de85ca0d8ee9a35dd10f7e)]:
  - @quiltt/react@3.7.4
  - @quiltt/core@3.7.4

## 3.7.3

### Patch Changes

- [#293](https://github.com/quiltt/quiltt-sdks/pull/293) [`f4b48e6`](https://github.com/quiltt/quiltt-sdks/commit/f4b48e6db199cae4e880202c28974b481890b7c6) Thanks [@rubendinho](https://github.com/rubendinho)! - Improve documentation

- Updated dependencies [[`f4b48e6`](https://github.com/quiltt/quiltt-sdks/commit/f4b48e6db199cae4e880202c28974b481890b7c6)]:
  - @quiltt/react@3.7.3
  - @quiltt/core@3.7.3

## 3.7.2

### Patch Changes

- [#284](https://github.com/quiltt/quiltt-sdks/pull/284) [`ccfc6a3`](https://github.com/quiltt/quiltt-sdks/commit/ccfc6a36ad465e73723d2286b37a377256c31b11) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Update Dependencies

- Updated dependencies [[`ccfc6a3`](https://github.com/quiltt/quiltt-sdks/commit/ccfc6a36ad465e73723d2286b37a377256c31b11)]:
  - @quiltt/core@3.7.2
  - @quiltt/react@3.7.2

## 3.7.1

### Patch Changes

- [`524a0d7`](https://github.com/quiltt/quiltt-sdks/commit/524a0d7f83c92648522c7712b82619fcd72e56c8) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add missing opened Enum type

- Updated dependencies [[`524a0d7`](https://github.com/quiltt/quiltt-sdks/commit/524a0d7f83c92648522c7712b82619fcd72e56c8)]:
  - @quiltt/core@3.7.1
  - @quiltt/react@3.7.1

## 3.7.0

### Minor Changes

- [#281](https://github.com/quiltt/quiltt-sdks/pull/281) [`0c5fd75`](https://github.com/quiltt/quiltt-sdks/commit/0c5fd757fa1f688f205431c21c98bb54ea6ea72a) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add bindings for a new onOpen callback event for Connector Modals

### Patch Changes

- Updated dependencies [[`0c5fd75`](https://github.com/quiltt/quiltt-sdks/commit/0c5fd757fa1f688f205431c21c98bb54ea6ea72a)]:
  - @quiltt/react@3.7.0
  - @quiltt/core@3.7.0

## 3.6.14

### Patch Changes

- [#278](https://github.com/quiltt/quiltt-sdks/pull/278) [`0d9e43d`](https://github.com/quiltt/quiltt-sdks/commit/0d9e43d580d73279d7c078219749b000ebb59b02) Thanks [@rubendinho](https://github.com/rubendinho)! - Fix debug config during CI

- Updated dependencies [[`0d9e43d`](https://github.com/quiltt/quiltt-sdks/commit/0d9e43d580d73279d7c078219749b000ebb59b02)]:
  - @quiltt/core@3.6.14
  - @quiltt/react@3.6.14

## 3.6.13

### Patch Changes

- [#276](https://github.com/quiltt/quiltt-sdks/pull/276) [`be1f9be`](https://github.com/quiltt/quiltt-sdks/commit/be1f9be957ef1a7686e6a25807275186c8dd51b4) Thanks [@rubendinho](https://github.com/rubendinho)! - Replace manually imported ActionCable code with official npm package

- Updated dependencies [[`be1f9be`](https://github.com/quiltt/quiltt-sdks/commit/be1f9be957ef1a7686e6a25807275186c8dd51b4)]:
  - @quiltt/core@3.6.13
  - @quiltt/react@3.6.13

## 3.6.12

### Patch Changes

- [#274](https://github.com/quiltt/quiltt-sdks/pull/274) [`d684ade`](https://github.com/quiltt/quiltt-sdks/commit/d684ade520689d6207c699cea0681a9331f06069) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update 'rol' types in PrivateClaims

- Updated dependencies [[`d684ade`](https://github.com/quiltt/quiltt-sdks/commit/d684ade520689d6207c699cea0681a9331f06069)]:
  - @quiltt/core@3.6.12
  - @quiltt/react@3.6.12

## 3.6.11

### Patch Changes

- [#271](https://github.com/quiltt/quiltt-sdks/pull/271) [`a9ea2a7`](https://github.com/quiltt/quiltt-sdks/commit/a9ea2a7c6592dd5245183996ce0d26ffb53f2ed9) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add 'rol' to private claims

- Updated dependencies [[`a9ea2a7`](https://github.com/quiltt/quiltt-sdks/commit/a9ea2a7c6592dd5245183996ce0d26ffb53f2ed9)]:
  - @quiltt/react@3.6.11
  - @quiltt/core@3.6.11

## 3.6.10

### Patch Changes

- [#268](https://github.com/quiltt/quiltt-sdks/pull/268) [`8a82094`](https://github.com/quiltt/quiltt-sdks/commit/8a82094a709d0d7e1478ec32142be33825323708) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate linter to Biome

- Updated dependencies [[`8a82094`](https://github.com/quiltt/quiltt-sdks/commit/8a82094a709d0d7e1478ec32142be33825323708)]:
  - @quiltt/react@3.6.10
  - @quiltt/core@3.6.10

## 3.6.9

### Patch Changes

- [#260](https://github.com/quiltt/quiltt-sdks/pull/260) [`6e80930`](https://github.com/quiltt/quiltt-sdks/commit/6e80930f84013f483e2c75fcb37a28dc4996dadc) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Refactor QuilttConnector to remove URL allow list

- Updated dependencies [[`6e80930`](https://github.com/quiltt/quiltt-sdks/commit/6e80930f84013f483e2c75fcb37a28dc4996dadc)]:
  - @quiltt/core@3.6.9
  - @quiltt/react@3.6.9

## 3.6.8

### Patch Changes

- [#258](https://github.com/quiltt/quiltt-sdks/pull/258) [`dc97e95`](https://github.com/quiltt/quiltt-sdks/commit/dc97e95dfa73bc1ccf09add6af70e4f95a458fab) Thanks [@rubendinho](https://github.com/rubendinho)! - Add URLs to WebView allowList

- Updated dependencies [[`dc97e95`](https://github.com/quiltt/quiltt-sdks/commit/dc97e95dfa73bc1ccf09add6af70e4f95a458fab)]:
  - @quiltt/core@3.6.8
  - @quiltt/react@3.6.8

## 3.6.7

### Patch Changes

- [#256](https://github.com/quiltt/quiltt-sdks/pull/256) [`824e21e`](https://github.com/quiltt/quiltt-sdks/commit/824e21e14b4731e5ebb0d8bd3ba141ca7d9418e2) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add Google recaptcha to allowed URLs

- Updated dependencies [[`824e21e`](https://github.com/quiltt/quiltt-sdks/commit/824e21e14b4731e5ebb0d8bd3ba141ca7d9418e2)]:
  - @quiltt/react@3.6.7
  - @quiltt/core@3.6.7

## 3.6.5

### Patch Changes

- [#248](https://github.com/quiltt/quiltt-sdks/pull/248) [`d15297e`](https://github.com/quiltt/quiltt-sdks/commit/d15297e4dea40c90dab97d1f8e8797b5cfe8395c) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Fix issue with loading Plaid's new Link

- Updated dependencies [[`d15297e`](https://github.com/quiltt/quiltt-sdks/commit/d15297e4dea40c90dab97d1f8e8797b5cfe8395c)]:
  - @quiltt/core@3.6.5
  - @quiltt/react@3.6.5

## 3.6.4

### Patch Changes

- [#246](https://github.com/quiltt/quiltt-sdks/pull/246) [`38f7904`](https://github.com/quiltt/quiltt-sdks/commit/38f79048e99dc617d700b62fd285623f9f2ae2fa) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Update exports for react-native

- Updated dependencies [[`38f7904`](https://github.com/quiltt/quiltt-sdks/commit/38f79048e99dc617d700b62fd285623f9f2ae2fa)]:
  - @quiltt/react@3.6.4
  - @quiltt/core@3.6.4

## 3.6.3

### Patch Changes

- [#240](https://github.com/quiltt/quiltt-sdks/pull/240) [`96556d4`](https://github.com/quiltt/quiltt-sdks/commit/96556d4e4d29b1a5623b78f60d97c49a974e44e8) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Pre-transpile '@quiltt/react-native' code before publish

- Updated dependencies [[`96556d4`](https://github.com/quiltt/quiltt-sdks/commit/96556d4e4d29b1a5623b78f60d97c49a974e44e8)]:
  - @quiltt/core@3.6.3
  - @quiltt/react@3.6.3

## 3.6.2

### Patch Changes

- [#236](https://github.com/quiltt/quiltt-sdks/pull/236) [`85c0be1`](https://github.com/quiltt/quiltt-sdks/commit/85c0be16803381de5dbd89a7295e326228542080) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix config loading

- Updated dependencies [[`85c0be1`](https://github.com/quiltt/quiltt-sdks/commit/85c0be16803381de5dbd89a7295e326228542080)]:
  - @quiltt/core@3.6.2
  - @quiltt/react@3.6.2

## 3.6.1

### Patch Changes

- [#232](https://github.com/quiltt/quiltt-sdks/pull/232) [`7a119af`](https://github.com/quiltt/quiltt-sdks/commit/7a119af8b0ba826b8df81f5eb242c002379b4e56) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Improve typeof checks for mobile environments

- Updated dependencies [[`7a119af`](https://github.com/quiltt/quiltt-sdks/commit/7a119af8b0ba826b8df81f5eb242c002379b4e56)]:
  - @quiltt/core@3.6.1
  - @quiltt/react@3.6.1

## 3.6.0

### Minor Changes

- [#229](https://github.com/quiltt/quiltt-sdks/pull/229) [`f688563`](https://github.com/quiltt/quiltt-sdks/commit/f6885635d989fb75918cb13e449ca0eec60850fc) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix Websockets protocol variable

- [#229](https://github.com/quiltt/quiltt-sdks/pull/229) [`f688563`](https://github.com/quiltt/quiltt-sdks/commit/f6885635d989fb75918cb13e449ca0eec60850fc) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Fix Websockets protocol variable

### Patch Changes

- Updated dependencies [[`f688563`](https://github.com/quiltt/quiltt-sdks/commit/f6885635d989fb75918cb13e449ca0eec60850fc), [`f688563`](https://github.com/quiltt/quiltt-sdks/commit/f6885635d989fb75918cb13e449ca0eec60850fc)]:
  - @quiltt/core@3.6.0
  - @quiltt/react@3.6.0

## 3.5.6

### Patch Changes

- [#223](https://github.com/quiltt/quiltt-sdks/pull/223) [`8c5041c`](https://github.com/quiltt/quiltt-sdks/commit/8c5041c1670fd7dbfed06355c06888256ce84b08) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Remove axios and replace with native fetch

- Updated dependencies [[`8c5041c`](https://github.com/quiltt/quiltt-sdks/commit/8c5041c1670fd7dbfed06355c06888256ce84b08)]:
  - @quiltt/react@3.5.6
  - @quiltt/core@3.5.6

## 3.5.5

### Patch Changes

- [#218](https://github.com/quiltt/quiltt-sdks/pull/218) [`7dd42db`](https://github.com/quiltt/quiltt-sdks/commit/7dd42dbc744805d68fbff8fbed73a4bd68022b44) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Fix changeset md to release packages

- [#213](https://github.com/quiltt/quiltt-sdks/pull/213) [`5648e3c`](https://github.com/quiltt/quiltt-sdks/commit/5648e3c91d572d97ad88115710ab840b98e1d469) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Add exported files to '@quiltt/react-native'"

- [#210](https://github.com/quiltt/quiltt-sdks/pull/210) [`e57fdb8`](https://github.com/quiltt/quiltt-sdks/commit/e57fdb8c21e90b6a3492bc7a0c858031384caebf) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Migrate bundler to 'bunchee'

- [#215](https://github.com/quiltt/quiltt-sdks/pull/215) [`c36abb4`](https://github.com/quiltt/quiltt-sdks/commit/c36abb47cffea3d754fd243b321f2ae50518c297) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Remove React Native SDK about:srcdoc warning

- [#216](https://github.com/quiltt/quiltt-sdks/pull/216) [`2895899`](https://github.com/quiltt/quiltt-sdks/commit/289589913c55f8dad2e818d71c4be39c93e5a52a) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Fix release changeset command

- Updated dependencies [[`7dd42db`](https://github.com/quiltt/quiltt-sdks/commit/7dd42dbc744805d68fbff8fbed73a4bd68022b44), [`5648e3c`](https://github.com/quiltt/quiltt-sdks/commit/5648e3c91d572d97ad88115710ab840b98e1d469), [`e57fdb8`](https://github.com/quiltt/quiltt-sdks/commit/e57fdb8c21e90b6a3492bc7a0c858031384caebf), [`c36abb4`](https://github.com/quiltt/quiltt-sdks/commit/c36abb47cffea3d754fd243b321f2ae50518c297), [`2895899`](https://github.com/quiltt/quiltt-sdks/commit/289589913c55f8dad2e818d71c4be39c93e5a52a)]:
  - @quiltt/core@3.5.5
  - @quiltt/react@3.5.5

## 3.5.4

### Patch Changes

- [#209](https://github.com/quiltt/quiltt-sdks/pull/209) [`6c5aa5f`](https://github.com/quiltt/quiltt-sdks/commit/6c5aa5fb0212f9dce84e71fe91e2182f463f7318) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Expose Institutions to React Native API

- Updated dependencies [[`6c5aa5f`](https://github.com/quiltt/quiltt-sdks/commit/6c5aa5fb0212f9dce84e71fe91e2182f463f7318)]:
  - @quiltt/react@3.5.4
  - @quiltt/core@3.5.4

## 3.5.3

### Patch Changes

- [#204](https://github.com/quiltt/quiltt-sdks/pull/204) [`ee42bf1`](https://github.com/quiltt/quiltt-sdks/commit/ee42bf137db1029807df49f66ff7e57117e8ace9) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Add missing type to QuilttButton

- [#197](https://github.com/quiltt/quiltt-sdks/pull/197) [`8d9f24c`](https://github.com/quiltt/quiltt-sdks/commit/8d9f24c59102db5dc665195a6145cfac2c80e2c0) Thanks [@rubendinho](https://github.com/rubendinho)! - Update docs, and fix typo in types

- Updated dependencies [[`ee42bf1`](https://github.com/quiltt/quiltt-sdks/commit/ee42bf137db1029807df49f66ff7e57117e8ace9), [`8d9f24c`](https://github.com/quiltt/quiltt-sdks/commit/8d9f24c59102db5dc665195a6145cfac2c80e2c0)]:
  - @quiltt/react@3.5.3
  - @quiltt/core@3.5.3

## 3.5.2

### Patch Changes

- [#202](https://github.com/quiltt/quiltt-sdks/pull/202) [`42705f0`](https://github.com/quiltt/quiltt-sdks/commit/42705f0e01b0adb35ab627697169433e1065a8f0) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Expose Institutions to React API

- Updated dependencies [[`42705f0`](https://github.com/quiltt/quiltt-sdks/commit/42705f0e01b0adb35ab627697169433e1065a8f0)]:
  - @quiltt/react@3.5.2
  - @quiltt/core@3.5.2

## 3.5.1

### Patch Changes

- [#200](https://github.com/quiltt/quiltt-sdks/pull/200) [`0a07431`](https://github.com/quiltt/quiltt-sdks/commit/0a07431ff936e6cd4fd3aeee66bba1fec21f6624) Thanks [@sirwolfgang](https://github.com/sirwolfgang)! - Fix release

- Updated dependencies [[`0a07431`](https://github.com/quiltt/quiltt-sdks/commit/0a07431ff936e6cd4fd3aeee66bba1fec21f6624)]:
  - @quiltt/react@3.5.1
  - @quiltt/core@3.5.1

## 3.5.0

### Patch Changes

- Updated dependencies [[`c65d87a`](https://github.com/quiltt/quiltt-sdks/commit/c65d87a8316dbec82635a0c4108714de7bbd082b)]:
  - @quiltt/react@3.5.0
  - @quiltt/core@3.5.0

## 3.4.1

### Patch Changes

- [#195](https://github.com/quiltt/quiltt-sdks/pull/195) [`6c36908`](https://github.com/quiltt/quiltt-sdks/commit/6c36908678cb46d5f6a0c7438e0ed48889cabf79) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Report preflight error before sending connectorUrl to webview

- Updated dependencies [[`6c36908`](https://github.com/quiltt/quiltt-sdks/commit/6c36908678cb46d5f6a0c7438e0ed48889cabf79)]:
  - @quiltt/react@3.4.1
  - @quiltt/core@3.4.1

## 3.4.0

### Minor Changes

- [#191](https://github.com/quiltt/quiltt-sdks/pull/191) [`58c8f0c`](https://github.com/quiltt/quiltt-sdks/commit/58c8f0c5265dfa379263225baafb4552067514c6) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Add agent QSP for analytic

### Patch Changes

- Updated dependencies [[`58c8f0c`](https://github.com/quiltt/quiltt-sdks/commit/58c8f0c5265dfa379263225baafb4552067514c6)]:
  - @quiltt/react@3.4.0
  - @quiltt/core@3.4.0

## 3.3.10

### Patch Changes

- [#190](https://github.com/quiltt/quiltt-sdks/pull/190) [`21ead66`](https://github.com/quiltt/quiltt-sdks/commit/21ead662e7626f906562f952c9d1c0bc2c859985) Thanks [@tom-quiltt](https://github.com/tom-quiltt)! - Fix Android App with Chase app installed not able to launch Chase app

- Updated dependencies [[`21ead66`](https://github.com/quiltt/quiltt-sdks/commit/21ead662e7626f906562f952c9d1c0bc2c859985)]:
  - @quiltt/core@3.3.10
  - @quiltt/react@3.3.10

## 3.3.9

### Patch Changes

- [#187](https://github.com/quiltt/quiltt-sdks/pull/187) [`02f37cd`](https://github.com/quiltt/quiltt-sdks/commit/02f37cda97f501f2d77601d0fd6b7fbbd1c71431) Thanks [@rubendinho](https://github.com/rubendinho)! - Export Quiltt config

- Updated dependencies [[`02f37cd`](https://github.com/quiltt/quiltt-sdks/commit/02f37cda97f501f2d77601d0fd6b7fbbd1c71431)]:
  - @quiltt/react@3.3.9
  - @quiltt/core@3.3.9

## 3.3.8

### Patch Changes

- [#185](https://github.com/quiltt/quiltt-sdks/pull/185) [`a3452da`](https://github.com/quiltt/quiltt-sdks/commit/a3452da3c7604902b5917e1f838e2dced42b708c) Thanks [@rubendinho](https://github.com/rubendinho)! - Fix Vite build error

- Updated dependencies [[`a3452da`](https://github.com/quiltt/quiltt-sdks/commit/a3452da3c7604902b5917e1f838e2dced42b708c)]:
  - @quiltt/react@3.3.8
  - @quiltt/core@3.3.8

## 3.3.7

### Patch Changes

- 13bdf9f: Fix URL and atob polyfill
- Updated dependencies [13bdf9f]
  - @quiltt/core@3.3.7
  - @quiltt/react@3.3.7

## 3.3.6

### Patch Changes

- bb47eb5: Retry GraphQL requests on Network Errors
- Updated dependencies [bb47eb5]
  - @quiltt/core@3.3.6
  - @quiltt/react@3.3.6

## 3.3.5

### Patch Changes

- f633be3: [Internal] Rename Deployments to Clients in Auth
- Updated dependencies [f633be3]
  - @quiltt/core@3.3.5
  - @quiltt/react@3.3.5

## 3.3.4

### Patch Changes

- b659537: Fix MX OAuth and move some lib into peer dependencies
- Updated dependencies [b659537]
  - @quiltt/core@3.3.4
  - @quiltt/react@3.3.4

## 3.3.3

### Patch Changes

- 48a50d0: Fix handle plaid oauth link bug
- Updated dependencies [48a50d0]
  - @quiltt/core@3.3.3
  - @quiltt/react@3.3.3

## 3.3.2

### Patch Changes

- 4a9118b: React Native sdk to support Plaid Oauth url
- Updated dependencies [4a9118b]
  - @quiltt/core@3.3.2
  - @quiltt/react@3.3.2

## 3.3.1

### Patch Changes

- 9bfbc03: Match eventType with MessageType in react native sdk
- Updated dependencies [9bfbc03]
  - @quiltt/core@3.3.1
  - @quiltt/react@3.3.1

## 3.3.0

### Minor Changes

- 2a6410f: Add profileId to ConnectorSDKCallbackMetadata

### Patch Changes

- Updated dependencies [2a6410f]
  - @quiltt/core@3.3.0
  - @quiltt/react@3.3.0

## 3.2.2

### Patch Changes

- 9f3783a: Fix React Native package entry point
- Updated dependencies [9f3783a]
  - @quiltt/core@3.2.2
  - @quiltt/react@3.2.2

## 3.2.1

### Patch Changes

- 31b7543: Drop react-native-url-polyfill
- Updated dependencies [31b7543]
  - @quiltt/core@3.2.1
  - @quiltt/react@3.2.1

## 3.2.0

### Minor Changes

- 07bc9f3: Release React Native SDK

### Patch Changes

- Updated dependencies [07bc9f3]
  - @quiltt/core@3.2.0
  - @quiltt/react@3.2.0
