# @quiltt/react

[![npm version](https://badge.fury.io/js/@quiltt%2Freact.svg)](https://badge.fury.io/js/@quiltt%2Freact)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-js.yml)
[![npm unpacked size](https://img.shields.io/npm/unpacked-size/@quiltt/react)](https://www.npmjs.com/package/@quiltt/react)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@quiltt/react)](https://bundlephobia.com/package/@quiltt/react)

`@quiltt/react` provides React Components and Hooks for integrating Quiltt into React-based applications.

See the [React SDK guides](https://www.quiltt.dev/connector/sdks/react).

For general project information and contributing guidelines, see the [main repository README](../../README.md).

## Installation

With `npm`:

```shell
npm install @quiltt/react
```

With `yarn`:

```shell
yarn add @quiltt/react
```

With `pnpm`:

```shell
pnpm add @quiltt/react
```

## Core Modules and Types

`@quiltt/react` re-exports all functionality from `@quiltt/core`, so you only need to install this one package to access core API clients, authentication utilities, storage, and TypeScript types along with React components and hooks. See the [Core README](../core/README.md) for more information about core functionality.

## React Components

All components automatically handle Session token management under the hood, using the `useQuilttSession` hook.

For better tree-shaking, you can import components from subpaths:

```tsx
import { QuilttButton } from '@quiltt/react/components'
```

To pre-authenticate the Connector for one of your user profiles, make sure to set your token using the `QuilttProvider` provider or the `useQuilttSession` hook. See the [Authentication guides](https://www.quiltt.dev/authentication) for how to generate a Session.

### QuilttButton

Launch the [Quiltt Connector](https://www.quiltt.dev/connector) as a pop-out modal.

By default, the rendered component will be a `<button>` element, but you can supply your own component via the `as` prop. You can also pass forward any props to the rendered component.

#### Example

```tsx
import { useState } from 'react'
import { QuilttButton } from '@quiltt/react'
import type { ConnectorSDKCallbackMetadata } from '@quiltt/react'

export const App = () => {
  const [connectionId, setConnectionId] = useState<string>()
  const handleExitSuccess = (metadata: ConnectorSDKCallbackMetadata) => {
    setConnectionId(metadata?.connectionId)
  }

  return (
    <QuilttButton
      connectorId="YOUR_CONNECTOR_ID"
      onExitSuccess={handleExitSuccess}
      className="my-css-class"
      style={{ borderWidth: '2px' }}
      themeMode="auto"
      // ... other props to pass through to the button
    >
      Add Account
    </QuilttButton>
  )
}
export default App
```

### QuilttContainer

Launch the [Quiltt Connector](https://www.quiltt.dev/connector) inside a container.

By default, the rendered component will be a `<div>` element, but you can supply your own component via the `as` prop. You can also pass forward any props to the rendered component.

#### QuilttContainer Example

```tsx
import { useState } from 'react'
import { QuilttContainer } from '@quiltt/react'
import type { ConnectorSDKCallbackMetadata } from '@quiltt/react'

export const App = () => {
  const [connectionId, setConnectionId] = useState<string>()
  const handleExitSuccess = (metadata: ConnectorSDKCallbackMetadata) => {
    setConnectionId(metadata?.connectionId)
  }

  return (
    <QuilttContainer
      connectorId="YOUR_CONNECTOR_ID"
      onExitSuccess={handleExitSuccess}
      className="my-css-class"
      style={{ height: '100%' }}
      themeMode="auto"
      // ... other props to pass through to the container
    />
  )
}

export default App
```

### QuilttProvider

A provider component for passing Session and settings down to the rest of your application.

#### QuilttProvider Example

```tsx
import { QuilttProvider } from '@quiltt/react'

const Layout = ({ children }) => {
  const sessionToken = 'YOUR_SESSION_TOKEN_FROM_SERVER'

  return <QuilttProvider token={sessionToken}>{children}</QuilttProvider>
}

export default Layout
```

## React Hooks

For maximum control over the lifecycle of Quiltt Connector and Quiltt Sessions, you can also use hooks directly.

For better tree-shaking, you can import hooks from subpaths:

```tsx
import { useQuilttSession } from '@quiltt/react/hooks'
```

### useQuilttConnector

A hook to manage the lifecycle of [Quiltt Connector](https://www.quiltt.dev/connector).

#### useQuilttConnector Example

```tsx
import { useQuilttConnector } from '@quiltt/react'

const App = () => {
  const { open } = useQuilttConnector('YOUR_CONNECTOR_ID', {
    onEvent: (type) => console.log(`Received Quiltt Event: ${type}`),
    onExitSuccess: (metadata) => console.log("Connector onExitSuccess", metadata.connectionId),
    themeMode: 'dark',
  })

  return(
    <button onClick={open}>
      Launch Connector
    </button>
  )
}
```

### useQuilttSession

A hook to manage the lifecycle of Quiltt Sessions.

See the [Authentication guides](https://www.quiltt.dev/authentication) for more information.

#### useQuilttSession Example

```tsx
import { useCallback, useEffect } from 'react'

import { useQuilttSession } from '@quiltt/react'

const App = () => {
  const { session, importSession, revokeSession } = useQuilttSession()

  useEffect(() => {
    // Import session from API call, local storage, query param, etc.
    importSession('{SESSION_TOKEN}')
  }, [importSession])

  const logOut = useCallback(() => {
    // Revoke and clear the Quiltt session
    revokeSession()

    // do other stuff!
  }, [revokeSession])

  if (session) {
    console.log('Session token: ', session.token)
  } else {
    console.log('No Session available')
  }

  return (
    <>
      <div>Hello world!</div>
      <button onClick={logOut}>Log Out</button>
    </>
  )
}

export default App
```

### useSession

The lower-level session hook `useQuilttSession` is built on. It takes an optional storage key
(defaults to `session`) and returns the session, a setter, a controller, and whether the session has
been read yet:

```tsx
import { useSession } from '@quiltt/react'

const [session, setSession, controller, restored] = useSession()
```

`useQuilttSession` returns the same `restored` flag alongside the session. It is `false` only before
the hook's first client commit — the render that has to match what the server rendered, which could
not read storage. An empty `session` while `restored` is `false` does not mean signed out:

```tsx
const { session, restored } = useQuilttSession()

useEffect(() => {
  if (restored && !session) router.push('/login')
}, [restored, session])
```

Without the gate, a signed-in user whose session was stored would be redirected during hydration.

`useQuilttSession` covers almost every case. The controller matters when you resume work after an
`await` — a token validation, a refresh — and the session may have changed in the meantime:

```tsx
const at = controller.snapshot()          // the slot's token and clear count
const valid = await validate(token)
if (valid && !controller.adopt(token, at)) {
  // The user signed out or signed in as someone else while we were waiting; the token was dropped.
}
```

`adopt(token, since)` saves the token only if the slot has not changed since `snapshot()`, and
reports whether the session now holds it. Reading the slot through the controller — rather than
component state — is what makes this correct when the component has unmounted, and pairing it with
the setter means you cannot read one session and write another.

`useImportSession` accepts a controller as its optional fifth argument; `useQuilttSession`'s
`importSession` already does this for you. Without a controller it builds one from the setter you
pass, and the setter from `useSession` reports the storage key it writes, so the fallback watches the
slot the caller actually writes — signing out of that slot still cancels a pending import.

## Typescript support

`@quiltt/react` is written in TypeScript and ships with complete type definitions. Since it re-exports all functionality from `@quiltt/core`, you have access to all core types as well, including utility types, API types, and authentication types.

## License

This project is licensed under the terms of the MIT license. See the [LICENSE](LICENSE.md) file for more information.

## Contributing

For information on how to contribute to this project, please refer to the [repository contributing guidelines](../../CONTRIBUTING.md).

## Related Packages

- [`@quiltt/core`](../core#readme) - Essential functionality and types
- [`@quiltt/vue`](../vue#readme) - Vue 3 components and composables
- [`@quiltt/react-native`](../react-native#readme) - React Native and Expo components
- [`@quiltt/capacitor`](../capacitor#readme) - Capacitor plugin and mobile framework adapters
