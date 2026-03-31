# @quiltt/vue

[![npm version](https://badge.fury.io/js/@quiltt%2Fvue.svg)](https://badge.fury.io/js/@quiltt%2Fvue)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml)
[![npm unpacked size](https://img.shields.io/npm/unpacked-size/@quiltt/vue)](https://www.npmjs.com/package/@quiltt/vue)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@quiltt/vue)](https://bundlephobia.com/package/@quiltt/vue)

Vue 3 composables and components for Quiltt Connector.

For general project information and contributing guidelines, see the [main repository README](../../README.md).

## Installation

```shell
npm install @quiltt/vue vue
```

## Core Modules and Types

`@quiltt/vue` re-exports all functionality from `@quiltt/core`, so you only need to install this one package to access core API clients, authentication utilities, storage, and TypeScript types along with Vue components and composables. See the [Core README](../core/README.md) for more information.

## Quick Start

```typescript
// main.ts
import { createApp } from 'vue'
import { QuilttPlugin } from '@quiltt/vue'

createApp(App).use(QuilttPlugin).mount('#app')
```

```vue
<script setup lang="ts">
import { QuilttButton, useQuilttSession } from '@quiltt/vue'

const { importSession } = useQuilttSession()

// Set session token when available (e.g., after login)
const onLogin = async (token: string) => {
  await importSession(token)
}
</script>

<template>
  <QuilttButton
    connector-id="YOUR_CONNECTOR_ID"
    @exit-success="(m) => console.log('Connected:', m.connectionId)"
  >
    Add Bank Account
  </QuilttButton>
</template>
```

## Components

For better tree-shaking, you can import components from subpaths:

```ts
import { QuilttButton } from '@quiltt/vue/components'
```

### QuilttButton

Opens the connector in a modal overlay.

```vue
<QuilttButton connector-id="YOUR_CONNECTOR_ID" @exit-success="handleSuccess">
  Connect Account
</QuilttButton>
```

### QuilttContainer

Renders the connector inline.

```vue
<QuilttContainer connector-id="YOUR_CONNECTOR_ID" @exit-success="handleSuccess" />
```

### QuilttConnector

Full-page iframe for embedded integration.

```vue
<QuilttConnector
  connector-id="YOUR_CONNECTOR_ID"
  @exit-success="handleSuccess"
  @navigate="handleNavigate"
  style="width: 100%; height: 100vh" />
```

## Composables

For better tree-shaking, you can import composables from subpaths:

```ts
import { useQuilttSession } from '@quiltt/vue/composables'
```

### useQuilttSession

```typescript
import { useQuilttSession } from '@quiltt/vue'

const {
  session,             // Reactive session state
  importSession,       // Import an existing token
  identifySession,     // Start auth flow (email/phone)
  authenticateSession, // Complete auth (passcode)
  revokeSession,       // Invalidate session server-side
  forgetSession,       // Clear session locally
} = useQuilttSession('YOUR_ENVIRONMENT_ID') // environmentId is optional

await importSession('YOUR_SESSION_TOKEN')
console.log(session.value?.token)
```

Pass `environmentId` to restrict session import to a specific Quiltt environment (e.g. `env_sandbox_...` vs `env_live_...`). If provided, `importSession` will reject tokens whose JWT claims don't match.

### useQuilttConnector

```typescript
import { useQuilttConnector } from '@quiltt/vue'

const { open } = useQuilttConnector('YOUR_CONNECTOR_ID', {
  onExitSuccess: (m) => console.log('Connected:', m.connectionId),
})
```

```vue
<button @click="open">Add Account</button>
```

### Additional Composables

`@quiltt/vue` also exports:

- `useQuilttInstitutions` — Search available institutions for a connector.
- `useQuilttResolvable` — Check if a provider connection can be resolved.
- `useQuilttSettings` — Access plugin-provided settings such as `clientId`.
- `useSession` — Low-level reactive session state manager.
- `useStorage` — Reactive wrapper around Quiltt global storage.

Composable context behavior:

- `useQuilttSession`, `useQuilttInstitutions`, and `useQuilttResolvable` require `QuilttPlugin` provider context and throw if used without it.
- `useQuilttConnector` continues without plugin session context and logs a warning.
- `useQuilttSettings` returns `undefined` values when plugin context is unavailable.

### Plugin Exports

You can import plugin utilities from the dedicated subpath:

```ts
import { QuilttPlugin, QuilttSessionKey, QuilttSetSessionKey } from '@quiltt/vue/plugin'
```

## Props and Events

| Prop | Type | Description |
| ------ | ------ | ------------- |
| `connector-id` | `string` | **Required.** Quiltt Connector ID |
| `connection-id` | `string` | Existing connection ID for reconnection |
| `institution` | `string` | Pre-select an institution |
| `app-launcher-url` | `string` | Deep link URL for OAuth callbacks |

| Event | Payload | Description |
| ------- | --------- | ------------- |
| `@load` | `metadata` | Connector loaded |
| `@exit-success` | `metadata` | Connection successful |
| `@exit-abort` | `metadata` | User cancelled |
| `@exit-error` | `metadata` | Error occurred |

## Reconnection

Pass `connection-id` to reconnect an existing connection:

```vue
<QuilttButton connection-id="YOUR_EXISTING_CONNECTION_ID" ... />
```

## Capacitor / Ionic

For mobile apps, use `@quiltt/capacitor/vue` which adds native OAuth handling:

```typescript
import { QuilttConnector, QuilttConnectorPlugin } from '@quiltt/capacitor/vue'

// Handle OAuth deep links
QuilttConnectorPlugin.addListener('deepLink', ({ url }) => {
  connectorRef.value?.handleOAuthCallback(url)
})
```

See [@quiltt/capacitor](../capacitor#readme) for full documentation.

## Resources

- [Vue SDK Guide](https://www.quiltt.dev/connector/sdk/vue)
- [Issuing Session Tokens](https://www.quiltt.dev/authentication/issuing-session-tokens)
- [Connector Configuration](https://www.quiltt.dev/connector)

## License

This project is licensed under the terms of the MIT license. See the [LICENSE](LICENSE.md) file for more information.

## Contributing

For information on how to contribute to this project, please refer to the [repository contributing guidelines](../../CONTRIBUTING.md).

## Related Packages

- [`@quiltt/core`](../core#readme) - Essential functionality and types
- [`@quiltt/react`](../react#readme) - React components and hooks
- [`@quiltt/react-native`](../react-native#readme) - React Native and Expo components
- [`@quiltt/capacitor`](../capacitor#readme) - Capacitor plugin and mobile framework adapters
