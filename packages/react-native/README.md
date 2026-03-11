# @quiltt/react-native

[![npm version](https://badge.fury.io/js/@quiltt%2Freact-native.svg)](https://badge.fury.io/js/@quiltt%2Freact-native)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml)

`@quiltt/react-native` provides React Native Components for integrating Quiltt Connector into React Native and Expo applications.

For general project information and contributing guidelines, see the [main repository README](../../README.md).

## Installation

`@quiltt/react-native` expects `react`, `react-native`, `react-native-webview`, `base-64` and `react-native-url-polyfill` as peer dependencies.

With `npm`:

```shell
npm install base-64 react-native-webview react-native-url-polyfill
npm install @quiltt/react-native
```

With `yarn`:

```shell
yarn add base-64 react-native-webview react-native-url-polyfill
yarn add @quiltt/react-native
```

With `pnpm`:

```shell
# Make sure to add `node-linker=hoisted` to your `.npmrc` when using pnpm in an Expo app.
$ pnpm add base-64 react-native-webview react-native-url-polyfill
$ pnpm add @quiltt/react-native
```

## Documentation

For full SDK documentation and more code examples, see the Connector [React Native guide](https://www.quiltt.dev/connector/sdk/react-native).

### QuilttConnector

Launch the [Quiltt Connector](https://www.quiltt.dev/connector) in a webview.

`@quiltt/react-native` does not ship with a navigation library, so you might want to navigate to a new "page" when using QuilttConnector.

For better tree-shaking, you can import components from subpaths:

```tsx
import { QuilttConnector } from '@quiltt/react-native/components'
```

#### Example

```tsx
import { QuilttProvider, QuilttConnector } from '@quiltt/react-native'
import type { ConnectorSDKCallbackMetadata } from '@quiltt/react-native'

export const App = () => {
  // See: https://www.quiltt.dev/authentication/issuing-session-tokens
  const sessionToken = 'YOUR_SESSION_TOKEN_FROM_SERVER'

  // Use a universal link (iOS) or app link (Android) to redirect back to your app
  const appLauncherUrl = 'https://myapp.com/my_universal_link'

  const handleExitSuccess = (metadata: ConnectorSDKCallbackMetadata) => {
    console.log('Successfully created connection!', {
      connectionId: metadata.connectionId,
    })
  }

  return (
    <QuilttProvider token={sessionToken}>
      <QuilttConnector
        connectorId="YOUR_CONNECTOR_ID"
        appLauncherUrl={appLauncherUrl}

        // See the JavaScript API docs for the full list of available callbacks...
        onExitSuccess={handleExitSuccess}
      />
    </QuilttProvider>
  )
}

export default App
```

### Handling OAuth Deep Links

When users authenticate with financial institutions, they'll be redirected back to your app via a deep link. You need to listen for these deep links and pass them to the `QuilttConnector` to complete the OAuth flow.

**Platform Note:** This deep link handling is primarily needed for **Android**, where OAuth flows typically open in an external browser. On **iOS**, the OAuth flow usually stays within the app's web view, so this fallback mechanism may not be necessary. However, implementing it ensures consistent behavior across both platforms.

#### Example with Deep Link Handling

```tsx
import { useEffect, useRef } from 'react'
import { Linking, View } from 'react-native'
import { QuilttProvider, QuilttConnector } from '@quiltt/react-native'
import type { ConnectorSDKCallbackMetadata, QuilttConnectorHandle } from '@quiltt/react-native'

export const ConnectorScreen = () => {
  const connectorRef = useRef<QuilttConnectorHandle>(null)

  const sessionToken = 'YOUR_SESSION_TOKEN_FROM_SERVER'
  const appLauncherUrl = 'https://myapp.com/quiltt/callback'

  // Listen for deep links and handle OAuth callbacks
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link received:', event.url)

      // Check if this is an OAuth callback for Quiltt
      if (event.url.includes('quiltt-connect/callback') || event.url.includes('quiltt/callback')) {
        console.log('Processing Quiltt OAuth callback')
        connectorRef.current?.handleOAuthCallback(event.url)
      }
    })

    return () => subscription.remove()
  }, [])

  const handleExitSuccess = (metadata: ConnectorSDKCallbackMetadata) => {
    console.log('Successfully created connection!', {
      connectionId: metadata.connectionId,
    })
  }

  return (
    <QuilttProvider token={sessionToken}>
      <View style={{ flex: 1 }}>
        <QuilttConnector
          ref={connectorRef}
          connectorId="YOUR_CONNECTOR_ID"
          appLauncherUrl={appLauncherUrl}
          onExitSuccess={handleExitSuccess}
        />
      </View>
    </QuilttProvider>
  )
}

export default ConnectorScreen
```

**Important Notes:**

- The `ref` prop is required when handling OAuth callbacks
- The deep link URL pattern should match your `appLauncherUrl` configuration
- Make sure your app is properly configured to handle deep links (see [React Native Linking documentation](https://reactnative.dev/docs/linking))

## Typescript support

`@quiltt/react-native` is written in TypeScript and ships with complete type definitions. Since it re-exports all functionality from `@quiltt/core` and `@quiltt/react`, you have access to all types from those packages as well. This means you only need to import from `@quiltt/react-native` to get full TypeScript support for the entire Quiltt SDK.

## License

This project is licensed under the terms of the MIT license. See the [LICENSE](LICENSE.md) file for more information.

## Contributing

For information on how to contribute to this project, please refer to the [repository contributing guidelines](../../CONTRIBUTING.md).

## Related Packages

- [`@quiltt/core`](../core#readme) - Essential functionality and types
- [`@quiltt/react`](../react#readme) - React components and hooks
- [`@quiltt/vue`](../vue#readme) - Vue 3 components and composables
- [`@quiltt/capacitor`](../capacitor#readme) - Capacitor plugin and mobile framework adapters
