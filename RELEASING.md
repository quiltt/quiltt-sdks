# Releasing

This document describes the release process for the quiltt-sdks monorepo. Our release workflow is fully automated using [Changesets](https://github.com/changesets/changesets) and GitHub Actions.

For general contributing guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). For project overview, see the [main README](README.md).

## Overview

All packages in this repository are versioned and released together at the same version number. The release process is:

1. **Contributors** create changesets to describe their changes
2. **Changesets Bot** creates/updates a "Version Packages" PR automatically
3. **Maintainers** review and merge the PR
4. **GitHub Actions** automatically publishes all packages to their respective registries

## Published Packages

### npm (JavaScript / TypeScript)

The following packages are published to npm on every release:

- `@quiltt/core`
- `@quiltt/react`
- `@quiltt/react-native`
- `@quiltt/vue`
- `@quiltt/capacitor`

### Native Mobile

The following packages are published to their respective registries automatically when the JS packages release:

| Package | Registry | Workflow |
| --- | --- | --- |
| Android (`io.quiltt:connector`) | Maven Central | `release-mobile.yml` |
| Flutter (`quiltt_connector`) | pub.dev | `release-mobile.yml` |
| iOS (`QuilttConnector`) | GitHub Releases + SPM (`vX.Y.Z`) tag | `release-mobile.yml` |

Mobile packages have `private: true` in their `package.json` so Changesets tracks their versions but does not publish them to npm. Publishing is handled by `.github/workflows/release-mobile.yml`, which triggers on the `@quiltt/core@*` git tags created by Changesets.

The example projects (`@quiltt/examples-*`) are excluded from publishing entirely.

## For Contributors: Creating a Changeset

### When to Create a Changeset

Create a changeset whenever you make changes that should be included in the next release:

- Bug fixes
- New features
- Breaking changes
- Documentation updates affecting the package API
- Dependency updates that affect consumers

A single changeset bumps all packages together due to the fixed versioning group. You only need to select one affected package — the version bump applies to all.

### How to Create a Changeset

1. Make your code changes in a feature branch

2. Run the changeset command:

   ```bash
   pnpm changeset
   ```

3. Follow the interactive prompts:
   - **Select packages**: Choose any one of the affected packages (the fixed group means all will be bumped)
   - **Select bump type**: Choose the appropriate semantic version bump:
     - **patch**: Bug fixes and minor updates (1.0.0 → 1.0.1)
     - **minor**: New features, backwards-compatible (1.0.0 → 1.1.0)
     - **major**: Breaking changes (1.0.0 → 2.0.0)
   - **Write summary**: Describe your changes in a user-friendly way

4. Commit the generated changeset file (`.changeset/*.md`) with your changes:

   ```bash
   git add .changeset
   git commit -m "Add changeset for feature X"
   ```

5. Push your branch and create a pull request

### Changeset Best Practices

- **Be descriptive**: Write clear, user-facing descriptions of changes
- **One changeset per logical change**: Create separate changesets for unrelated changes
- **Use proper semantic versioning**: Choose the correct bump type
- **Reference issues/PRs**: Include issue numbers when applicable

### Example Changeset

```markdown
---
"@quiltt/react": minor
---

Add new useAccountBalance hook for real-time balance updates.
```

## Snapshot Releases (Pre-release Testing)

Snapshot releases let you publish a test build from any branch without affecting the official release history. Use them when you want someone to test a change before merging.

### How to Publish a Snapshot

1. Ensure your branch has a changeset (`pnpm changeset` if not)
2. Go to **Actions → Snapshot Release → Run workflow**
3. Select your branch from the dropdown
4. Optionally set a dist-tag (default: `next`; use something like `pr-123` to namespace it)
5. Click **Run workflow**

The workflow versions all packages to `0.0.0-<tag>-<timestamp>`, builds, and publishes the 5 public JS packages to npm under the specified dist-tag. The step summary shows the exact install commands.

### Installing a Snapshot

```bash
# Install by exact version
pnpm add @quiltt/core@0.0.0-next-20260303T141200Z

# Or by dist-tag (always resolves to the latest snapshot under that tag)
pnpm add @quiltt/core@next
```

### Notes

- Snapshot versions never become `latest` on npm — they are always published under a named dist-tag
- The mobile packages (`android`, `flutter`, `ios`) are versioned internally but not published to npm
- Snapshots do not create git tags or GitHub releases
- Old snapshot versions accumulate on npm; this is expected and harmless

---

## For Maintainers: The Release Process

### Automated Workflow

Our release process is fully automated through two GitHub Actions workflows:

#### JS/TS Release (`release-js.yml`)

Runs on push to `main`. When changesets are present:

1. **Version PR**: Changesets aggregates pending changesets, bumps all package versions, updates `CHANGELOG.md` files, and opens a "Version Packages" PR
2. **Review and merge**: Maintainers review the PR and merge when ready
3. **Publish**: Upon merge, GitHub Actions builds and publishes all JS/TS packages to npm, creates git tags (`@quiltt/core@x.y.z`, etc.), and creates GitHub releases

#### Mobile Release (`release-mobile.yml`)

Triggered automatically by the `@quiltt/core@*` tag pushed by the JS release:

1. **Extract version** from the Changesets tag
2. **Update version files, commit to `main`, and push platform tags:**
   - Updates the following files with the new version:
     - `packages/android/connector/build.gradle.kts`
     - `packages/android/connector/src/main/java/app/quiltt/connector/QuilttSdkVersion.kt`
     - `packages/flutter/pubspec.yaml`
     - `packages/flutter/lib/quiltt_sdk_version.dart`
     - `packages/ios/Sources/QuilttConnector/QuilttSdkVersion.swift`
   - Commits these changes directly to `main` with `[skip ci]` to avoid re-triggering CI
   - Pushes tags: `v*` (SemVer for SPM), plus platform tags `android/v*`, `flutter/v*`, `ios/v*`
3. **Publish in parallel** (each job checks out `main` after the version commit):
   - Android: builds, tests, publishes to Maven Central, creates `android/v*` GitHub release
   - Flutter: analyzes, validates, publishes to pub.dev, creates `flutter/v*` GitHub release
   - iOS: builds and tests the root `Package.swift`, then creates `ios/v*` GitHub release (iOS is distributed via SPM using the SemVer `v*` tag)

#### Swift Package Index (Optional)

To list the iOS SDK on [Swift Package Index](https://swiftpackageindex.com):

1. Sign in to Swift Package Index with GitHub
2. Click **Add a package**
3. Enter repository URL: `https://github.com/quiltt/quiltt-sdks`
4. Submit for indexing

Swift Package Index discovers updates automatically from new SemVer tags. No bot installation is required.

Requirements for successful indexing:

- Root `Package.swift` exists and builds
- SemVer tags (`vX.Y.Z`) are pushed for releases
- Repository is publicly accessible

### Configuration Details

#### Fixed Versions

All packages are configured with fixed versioning (they always release together with the same version):

```json
["@quiltt/core", "@quiltt/react", "@quiltt/react-native", "@quiltt/vue", "@quiltt/capacitor", "@quiltt/android", "@quiltt/flutter", "@quiltt/ios"]
```

#### Internal Dependencies

When a package updates its internal dependencies, it receives a `patch` bump automatically via the `updateInternalDependencies` setting.

### Manual Release (Emergency Only)

In rare cases where manual intervention is needed for JS/TS packages:

```bash
# 1. Ensure you're on main and up-to-date
git checkout main
git pull origin main

# 2. Version packages (if not already done)
pnpm run version

# 3. Build packages
pnpm run build

# 4. Publish to npm
pnpm run publish
```

**Note**: Manual releases should be avoided as they bypass the automated changelog and GitHub release creation. Mobile releases cannot be triggered manually — they require the `@quiltt/core@*` tag. If a mobile release fails, re-run the `release-mobile.yml` workflow from the Actions tab using the relevant `@quiltt/core@*` tag as the ref.

## Troubleshooting

### Changeset PR Not Created

If the Changesets bot doesn't create a PR:

- Ensure changesets exist in `.changeset/` directory
- Check that the GitHub Action has permissions to create PRs
- Verify the workflow ran successfully in the Actions tab

### Failed npm Publish

If publishing fails:

- Check that `NPM_TOKEN` secret is valid and not expired
- Verify package names are available on npm
- Ensure all packages build successfully locally
- Check npm registry status at [status.npmjs.org](https://status.npmjs.org/)

### Failed Mobile Publish

If a mobile publish fails after the JS release:

- Re-run the `release-mobile.yml` workflow manually from the Actions tab (select the `@quiltt/core@*` tag as the ref)
- Check the specific job logs (Android, Flutter, or iOS) for the root cause

### Version Conflicts

If there are version conflicts:

- Ensure `main` branch is up-to-date before merging version PR
- Resolve conflicts in `package.json` and `CHANGELOG.md` files manually
- Re-run `pnpm install` to update lockfile

## GitHub Actions Configuration

### Required Secrets

#### JS/TS Release

- `NPM_TOKEN`: npm access token with publish permissions
  - **Important**: As of December 2025, npm requires granular access tokens that expire after 90 days. Rotate every 90 days to avoid CI/CD disruption.
- `QUILTTY_RELEASE_GITHUB_TOKEN`: PAT for Changesets GitHub API interactions

#### Android Release

- `MAVEN_CENTRAL_USERNAME`: Maven Central Portal API token username
- `MAVEN_CENTRAL_PASSWORD`: Maven Central Portal API token password
- `ANDROID_SIGNING_KEY_ID`: GPG signing key ID
- `ANDROID_SIGNING_PASSWORD`: GPG signing key passphrase
- `ANDROID_SIGNING_KEY`: GPG signing key (base64 encoded)

> **Note**: `MAVEN_CENTRAL_USERNAME` and `MAVEN_CENTRAL_PASSWORD` must be Portal API tokens, not legacy OSSRH credentials. Generate them at [central.sonatype.com/account](https://central.sonatype.com/usertoken) → "Generate User Token".

#### Flutter Release

No secrets required. Publishing uses GitHub Actions OIDC — pub.dev is configured to trust the `quiltt/quiltt-sdks` repository with the `pub-dev` environment.

### Workflow Triggers

| Workflow | Trigger |
| --- | --- |
| `release-js.yml` | Push to `main` |
| `release-mobile.yml` | Push of `@quiltt/core@*` tag |
| `ci-js.yml` | Push to `main`, pull requests |
| `ci-android.yml` | Push/PR touching `packages/android/**` |
| `ci-flutter.yml` | Push/PR touching `packages/flutter/**` |
| `ci-ios.yml` | Push/PR touching `packages/ios/**` |
| `tests-unit.yml` | Push to `main`, pull requests |
| `tests-e2e.yml` | Push to `main`, pull requests |
| `snapshot.yml` | Manual (`workflow_dispatch`) |
| `bundlewatch.yml` | Pull requests |
| `check-todos.yml` | Push to `main`, pull requests |

## Related Documentation

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Main README](README.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Support

If you encounter issues with the release process:

- Check the [GitHub Actions logs](https://github.com/quiltt/quiltt-sdks/actions)
- Review [Changesets documentation](https://github.com/changesets/changesets/blob/main/docs/common-questions.md)
- Open an issue in the repository
