# quiltt-sdks

Monorepo for Quiltt's SDKs — a unified fintech API platform that simplifies
integration with open banking providers.

**See [`AGENTS.md`](../AGENTS.md) for the full dispatch table** — it maps every
file type and directory in this repo to the correct skills, MCP servers, and
toolchain commands. Load it before editing any code.

## Quick Facts

- **Packages (JS)**: `core` → `react` / `vue` → `react-native` / `capacitor`
- **Mobile SDKs**: `android` (Kotlin), `flutter` (Dart), `ios` (Swift)
- **Package manager**: pnpm (never switch)
- **Lint/format**: Biome (not ESLint/Prettier)
- **Test**: Vitest (JS unit), Playwright (web E2E), Maestro (native E2E)
- **Bundler**: Bunchee (not tsup/rollup/webpack)
- **Releases**: Changesets — all packages version together
