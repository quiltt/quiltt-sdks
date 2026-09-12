# quiltt-sdks Agent Dispatch Table

Dispatch table for AI agents working on this monorepo. Routes file types and
directories to the correct skills, MCP servers, and toolchain commands.

---

## How to Use This File

1. Identify what kind of file you're editing (language, framework, directory)
2. Find the matching section below
3. Load the listed skills and activate the listed MCP groups **before** writing code
4. After editing, run the listed quality commands

---

## TypeScript/TSX — JS Packages

**Directories:** `packages/core/`, `packages/react/`, `packages/vue/`, `packages/react-native/`, `packages/capacitor/src/`, `examples/*/src/`

**Skills to load:**

- `./.agents/skills/vercel-react-best-practices/SKILL.md` — when editing `packages/react/`, `examples/react-nextjs/`, or any React `.tsx` files
- `./.agents/skills/vercel-composition-patterns/SKILL.md` — when refactoring component APIs, compound components, render props
- `./.agents/skills/vercel-react-native-skills/SKILL.md` — when editing `packages/react-native/` or `examples/react-native-expo/`
- `./.agents/skills/web-design-guidelines/SKILL.md` — when asked to review UI, check accessibility, or audit design

**Toolchain:**

| Step | Command |
| ------ | --------- |
| Lint/format | `pnpm exec biome check <paths> --fix` |
| Type-check | `pnpm typecheck` (or `pnpm --filter <package> exec tsc --noEmit`) |
| Unit tests | `pnpm test:unit` (or `pnpm --filter <package> exec vitest run`) |
| Bundle | `pnpm --filter <package> build` (uses Bunchee) |

**Key rules:**

- `import type` for type-only imports (`verbatimModuleSyntax: true`)
- Quotes: single. Semicolons: `asNeeded`. Trailing commas: es5. Line width: 100. Indent: 2 spaces.
- Export all public types from package index files
- Use `interface` for object shapes, `type` for unions/intersections
- Place `.test.ts/.tsx` alongside source files
- `*.test.tsx` uses `.tsx` extension

---

## Vue SFC (`.vue`)

**Directories:** `examples/vue-nuxt/src/`, `examples/capacitor-vue/src/`

**Skills to load:** *(none repo-specific — standard Vue 3 patterns)*

**Toolchain:**

| Step | Command |
| ------ | --------- |
| Lint/format | `pnpm exec biome check <paths> --fix` |
| Type-check | `pnpm typecheck` |
| E2E | Playwright in `examples/vue-nuxt/e2e/` |

---

## Swift (`.swift`) — iOS SDK

**Directories:** `packages/ios/Sources/`, `packages/ios/Tests/`, `packages/capacitor/ios/`

**Skills to load:**

- `./.agents/skills/ios-simulator/SKILL.md` — when testing on iOS simulator, sending push notifications, or managing sim devices

**Toolchain:**

| Step | Command |
|------|---------|
| Build | `cd packages/ios && swift build` |
| Test | `cd packages/ios && swift test --enable-code-coverage` |
| Lint | SwiftLint (if configured) |

**Key rules:**

- PascalCase for types, camelCase for files: `QuilttConnector.swift`, `tokenStorage.swift`
- Swift Package Manager (SPM) — `Package.swift` at repo root defines the library + test targets
- XCTest for unit tests

---

## Kotlin (`.kt`) — Android SDK

**Directories:** `packages/android/connector/src/`, `packages/android/app/src/`, `packages/android/app_jetpack_compose/src/`, `packages/capacitor/android/src/`

**Skills to load:** *(none repo-specific — standard Android/Kotlin patterns)*

**Toolchain:**

| Step | Command |
| ------ | --------- |
| Build | `cd packages/android && ./gradlew connector:assembleDebug` |
| Unit test | `cd packages/android && ./gradlew connector:testDebugUnitTest` |
| Instrumentation test | `cd packages/android && ./gradlew connector:connectedAndroidTest` |

**Key rules:**

- PascalCase for class files: `QuilttConnector.kt`, `AuthApi.java`
- Gradle Kotlin DSL (`build.gradle.kts`) for `packages/android/`
- Groovy DSL (`build.gradle`) for `packages/capacitor/android/`

---

## Dart (`.dart`) — Flutter SDK

**Directories:** `packages/flutter/lib/`, `packages/flutter/test/`, `packages/flutter/example/`

**Skills to load:**

- `./.agents/skills/flutter-expert/SKILL.md` — widget development, Riverpod/Bloc state management, GoRouter navigation, platform channels, performance

**Activate MCP tools:**

- `activate_group_0` — Flutter project mgmt, pub, devices, launch, hot-restart
- `activate_group_1` — Widget tree inspection, selected widget
- `activate_group_2` — App logs, running apps
- `activate_dart_code_maintenance_and_tooling` — Dart fix, format, tooling daemon

**Toolchain:**

| Step | Command |
| ------ | --------- |
| Analyze | `cd packages/flutter && flutter analyze` |
| Format | `cd packages/flutter && dart format .` |
| Unit test | `cd packages/flutter && flutter test --coverage` |
| Integration test | `cd packages/flutter/example && flutter test integration_test/` |

**Key rules:**

- `snake_case` for files and directories: `quiltt_connector.dart`, `auth_api.dart`
- `analysis_options.yaml` at `packages/flutter/` and `packages/flutter/example/`
- `pubspec.yaml` package name uses snake_case
- Running `flutter test` may modify `pubspec.lock` files — restore if changes are incidental

---

## Gradle (`.gradle` / `.gradle.kts`) — Android Build Config

**Directories:** `packages/android/`, `packages/capacitor/android/`, `packages/flutter/example/android/`

**Skills to load:** *(none repo-specific)*

**Toolchain:**

| Step | Command |
|------|---------|
| Build | `cd <dir> && ./gradlew build` |

**Key rules:**

- `packages/android/` uses Kotlin DSL (`build.gradle.kts`)
- `packages/capacitor/android/` and `packages/flutter/example/android/` use Groovy DSL (`build.gradle`)
- JDK 21 required

---

## YAML (`.yml` / `.yaml`) — CI/CD & Config

**Directories:** `.github/workflows/`, `.github/actions/`, root-level configs

**Skills to load:** *(none repo-specific)*

**Toolchain:**

| Step | Command |
|------|---------|
| Validate | `yamllint` if available — Biome ignores `.github/workflows/**` |

**Key rules:**

- Workflow files in `.github/workflows/` are **not** checked by Biome
- Validate YAML syntax manually or with `yamllint`
- `pnpm-workspace.yaml`, `turbo.json` control monorepo orchestration

---

## JSON (`.json`) — Config Files

**Files:** `package.json`, `turbo.json`, `biome.json`, `tsconfig.base.json`, `tsconfig.json` per package, `.changeset/config.json`, `skills-lock.json`, `app.json`

**Skills to load:** *(none repo-specific)*

**Toolchain:**

| Step | Command |
|------|---------|
| Validate | JSON syntax errors caught by editor |

**Key rules:**

- `package.json` `exports` map controls subpath exports — keep in sync with source entry points
- All JS packages have `"sideEffects": []` and `"type": "module"`
- Mobile packages have `"private": true`

---

## Markdown (`.md`) — Docs, README & Changesets

**Files:** `README.md`, `CONTRIBUTING.md`, `RELEASING.md`, `CHANGELOG.md` per package, `docs/`, `.changeset/*.md`, skill files

**Skills to load:**

- `./.agents/skills/changeset-fragment/SKILL.md` — when creating or editing `.changeset/*.md` files

**Toolchain:**

| Step | Command |
|------|---------|
| Format | Prettier or manual — Biome Markdown support is limited |

**Key rules:**

- Changesets use `pnpm changeset` to create `.changeset/*.md` files
- Changelogs auto-generated from PR titles
- Package READMEs should include install, usage examples, API reference, link to quiltt.dev

---

## JavaScript (`.js` / `.cjs` / `.mjs`) — Scripts & Config

**Files:** `next.config.js`, `postcss.config.cjs`, `scripts/*.mjs`, Playwright/Maestro E2E configs

**Skills to load:** *(none repo-specific)*

**Toolchain:**

| Step | Command |
|------|---------|
| Lint/format | `pnpm exec biome check <paths> --fix` |

---

## CSS (`.css`)

**Files:** `examples/*/src/*.css`

**Skills to load:** *(none repo-specific)*

**Toolchain:**

| Step | Command |
|------|---------|
| Lint/format | `pnpm exec biome check <paths> --fix` |

---

## Cross-Cutting Concerns

### Linting & Formatting (after EVERY edit)

```bash
# Lint + format changed JS/TS/Vue files
pnpm exec biome check <file-or-dir> --fix
```

### Full Quality Check (before committing)

```bash
pnpm lint          # Biome across all JS packages via Turbo
pnpm typecheck     # tsc --noEmit via Turbo
pnpm test:unit     # Vitest with coverage — all JS packages
```

### Branching & Commits

- Create feature branches from `main`
- Commit messages use imperative verbs: `Add`, `Fix`, `Refactor`, `Update`
- Never amend published commits or force-push without explicit instruction
- Run `pnpm changeset` to document changes before committing

### Changesets

Load `changeset-fragment` skill when creating or editing a changeset.

```bash
pnpm changeset     # Interactive prompt to create a changeset
```

- All 8 packages version together (fixed group in `.changeset/config.json`)
- Types: `major` (breaking), `minor` (new features), `patch` (bug fixes)

### Key Reference Files

| File | What It Covers |
| ------ | ---------------- |
| `.github/copilot-instructions.md` | Full coding standards, naming conventions, import order, patterns |
| `CLAUDE.local.md` | Toolchain versions, builds, per-package commands, biome rules, TypeScript config |
| `docs/architecture.md` | System architecture documentation |
| `docs/testing.md` | Testing strategy documentation |
| `CONTRIBUTING.md` | Contribution workflow |
| `RELEASING.md` | Release process |

---

## Dispatch Quick Reference

| File Extension | Directory Pattern | Skills to Load | MCP to Activate | Post-Edit Command |
| --------------- | ------------------- | ---------------- | ----------------- | ------------------- |
| `.ts` | `packages/core/` | — | — | `biome check --fix` |
| `.tsx` | `packages/react/` | `vercel-react-best-practices` | — | `biome check --fix` |
| `.tsx` | `packages/react-native/` | `vercel-react-native-skills` | — | `biome check --fix` |
| `.tsx` | `examples/react-nextjs/` | `vercel-react-best-practices` | — | `biome check --fix` |
| `.vue` | `examples/vue-nuxt/` | — | — | `biome check --fix` |
| `.swift` | `packages/ios/` | `ios-simulator` | — | `swift build` |
| `.kt` | `packages/android/` | — | — | `./gradlew build` |
| `.dart` | `packages/flutter/` | `flutter-expert` | `group_0`, `group_1`, `group_2`, `dart_code_maintenance` | `flutter analyze` |
| `.ts`/`.tsx` | `packages/capacitor/` | `capacitor-best-practices` | — | `biome check --fix` |
| `.yml` | `.github/workflows/` | — | — | `yamllint` |
| `.json` | root / packages | — | — | syntax check |
| `.md` | docs / root | — | — | manual review |
| `.changeset/*.md` | `.changeset/` | `changeset-fragment` | — | manual review |
