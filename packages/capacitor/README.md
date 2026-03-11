# @quiltt/capacitor

[![npm version](https://badge.fury.io/js/@quiltt%2Fcapacitor.svg)](https://badge.fury.io/js/@quiltt%2Fcapacitor)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml)

Quiltt Connector SDK for Capacitor and Ionic apps on iOS, Android, and web.

| Import                    | Use Case                                         |
| ------------------------- | ------------------------------------------------ |
| `@quiltt/capacitor`       | Any framework (Vue, Angular, Svelte, vanilla JS) |
| `@quiltt/capacitor/vue`   | Vue 3 components and composables                 |
| `@quiltt/capacitor/react` | React components and hooks                       |

## Installation

```shell
npm install @quiltt/capacitor
npx cap sync
```

## Deep Link Configuration

Configure URL schemes for OAuth callbacks from bank authentication. This should match the
`appLauncherUrl` / `app-launcher-url` you pass to Quiltt components.

**iOS** — `ios/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

**Android** — `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
</intent-filter>
```

## Vue 3

```shell
npm install @quiltt/capacitor @quiltt/vue vue
```

```typescript
// main.ts
import { createApp } from 'vue'
import { QuilttPlugin } from '@quiltt/capacitor/vue'

createApp(App).use(QuilttPlugin).mount('#app')
```

```vue
<script setup lang="ts">
import { QuilttConnector, QuilttConnectorPlugin } from '@quiltt/capacitor/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const connectorRef = ref()

onMounted(() => {
  QuilttConnectorPlugin.addListener('deepLink', ({ url }) => {
    connectorRef.value?.handleOAuthCallback(url)
  })
})
onUnmounted(() => QuilttConnectorPlugin.removeAllListeners())
</script>

<template>
  <QuilttConnector
    ref="connectorRef"
    connector-id="YOUR_CONNECTOR_ID"
    app-launcher-url="https://app.example.com/quiltt/callback"
    @exit-success="(m) => console.log('Connected:', m.connectionId)"
    @navigate="(url) => QuilttConnectorPlugin.openUrl({ url })"
    style="width: 100%; height: 100vh"
  />
</template>
```

For modal-based connection:

```vue
<QuilttButton connector-id="YOUR_CONNECTOR_ID" @exit-success="handleSuccess">
  Add Bank Account
</QuilttButton>
```

## React

```shell
npm install @quiltt/capacitor @quiltt/react react react-dom
```

```tsx
import { QuilttProvider, QuilttConnector } from '@quiltt/capacitor/react'

export const App = () => (
  <QuilttProvider token="YOUR_SESSION_TOKEN">
    <QuilttConnector
      connectorId="YOUR_CONNECTOR_ID"
      appLauncherUrl="https://app.example.com/quiltt/callback"
      onExitSuccess={(m) => console.log('Connected:', m.connectionId)}
      style={{ flex: 1 }}
    />
  </QuilttProvider>
)
```

OAuth is handled automatically—bank auth opens in the system browser and deep link callbacks are captured on return.

For modal-based connection:

```tsx
<QuilttButton connectorId="YOUR_CONNECTOR_ID" onExitSuccess={handleSuccess}>
  Add Account
</QuilttButton>
```

## Other Frameworks

Use the native plugin directly with Angular, Svelte, or vanilla JS:

```typescript
import { QuilttConnector } from '@quiltt/capacitor'

// Open OAuth URL in system browser
await QuilttConnector.openUrl({ url: 'https://...' })

// Listen for deep link callbacks
await QuilttConnector.addListener('deepLink', ({ url }) => {
  console.log('OAuth callback:', url)
})
```

## Reconnection

Pass a `connectionId` / `connection-id` to reconnect an existing connection:

```tsx
<QuilttConnector connectionId="YOUR_EXISTING_CONNECTION_ID" ... />
```

## API Reference

### Native Plugin

```typescript
import { QuilttConnector } from '@quiltt/capacitor'
```

| Method                              | Description                           |
| ----------------------------------- | ------------------------------------- |
| `openUrl({ url })`                  | Opens URL in system browser           |
| `getAppLauncherUrl()`               | Returns the app launcher URL          |
| `addListener('deepLink', callback)` | Listens for deep link callbacks       |
| `removeAllListeners()`              | Removes all event listeners           |

### Component Props

| Prop             | Type                 | Description                                                    |
| ---------------- | -------------------- | -------------------------------------------------------------- |
| `connectorId`    | `string`             | **Required.** Quiltt Connector ID                              |
| `connectionId`   | `string`             | Existing connection ID for reconnection                        |
| `institution`    | `string`             | Pre-select an institution                                      |
| `appLauncherUrl` | `string`             | App launcher URL (Universal Link/App Link) for OAuth callbacks |
| `onLoad`         | `(metadata) => void` | Connector loaded                                               |
| `onExitSuccess`  | `(metadata) => void` | Connection successful                                          |
| `onExitAbort`    | `(metadata) => void` | User cancelled                                                 |
| `onExitError`    | `(metadata) => void` | Error occurred                                                 |

### Re-exports

`@quiltt/capacitor/react` re-exports everything from `@quiltt/react`:

- Components: `QuilttProvider`, `QuilttButton`, `QuilttContainer`
- Hooks: `useQuilttSession`, `useQuilttConnector`, `useQuilttClient`
- Apollo Client: `useQuery`, `useMutation`, `gql`

`@quiltt/capacitor/vue` re-exports everything from `@quiltt/vue`.

## Troubleshooting

### OAuth redirects not working

- Verify `appLauncherUrl` matches your configured URL scheme or app link
- Run `npx cap sync` after configuration changes

### Blank screen after bank auth

- Check browser console for errors
- Verify your Connector ID

## Resources

- [Capacitor SDK Guide](https://www.quiltt.dev/connector/sdk/capacitor)
- [Issuing Session Tokens](https://www.quiltt.dev/authentication/issuing-session-tokens)
- [Connector Configuration](https://www.quiltt.dev/connector)
- [Capacitor React Example](../../examples/capacitor-react/README.md)
- [Capacitor Vue Example](../../examples/capacitor-vue/README.md)

## License

This project is licensed under the terms of the MIT license. See the [LICENSE](LICENSE.md) file for more information.
