# Quiltt Capacitor Vue Example

This example demonstrates using `@quiltt/capacitor/vue` in a Capacitor + Vue app for web, iOS, and Android.

## Getting Started

From the repository root:

```bash
cd examples/capacitor-vue
pnpm install
pnpm run dev
```

Open <http://localhost:5173>.

## Environment

The app reads these variables (with safe defaults in `src/App.vue`):

- `VITE_QUILTT_AUTH_TOKEN`: Session token for `QuilttPlugin`
- `VITE_QUILTT_CONNECTOR_ID`: Connector ID passed to `QuilttButton` and `QuilttConnector`
- `VITE_APP_LAUNCHER_URL`: Value passed to the `app-launcher-url` prop for mobile OAuth callbacks

Create a `.env` file in this directory for local testing with real values:

```bash
cp .env.example .env
```

## Capacitor Native Setup

```bash
pnpm run build
pnpm run cap:add:ios
pnpm run cap:add:android
pnpm run cap:sync
```

Then open native projects:

```bash
pnpm run cap:open:ios
pnpm run cap:open:android
```

## E2E Tests

```bash
pnpm run playwright:install
pnpm run test:e2e
```

This runs the Playwright project configured in `playwright.config.ts` against the Vite dev server.

## Related Docs

- [Main Repository README](../../README.md)
- [@quiltt/capacitor Documentation](../../packages/capacitor#readme)
- [Quiltt Developer Docs](https://quiltt.dev)
