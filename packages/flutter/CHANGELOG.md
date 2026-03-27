# Changelog

## 5.2.3

### Patch Changes

- [#448](https://github.com/quiltt/quiltt-sdks/pull/448) [`f5968c6`](https://github.com/quiltt/quiltt-sdks/commit/f5968c65bd5de1bf421d96bc371473f1e9ba4763) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Empty-token early return and no-session revoke guard in useQuilttSession

## 5.2.2

### Patch Changes

- [#444](https://github.com/quiltt/quiltt-sdks/pull/444) [`ac582f5`](https://github.com/quiltt/quiltt-sdks/commit/ac582f5313c206765b17ebaacd6d50327130a552) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Trigger manual release

## 5.2.1

### Patch Changes

- [#436](https://github.com/quiltt/quiltt-sdks/pull/436) [`4062b87`](https://github.com/quiltt/quiltt-sdks/commit/4062b87e6868b253bd2e878a2d64c754ed9dbf41) Thanks [@zubairaziz](https://github.com/zubairaziz)! - Added integration tests across all SDK packages (React, Vue, Capacitor React/Vue, React Native, Android, Flutter, and iOS) and validated consistent connector behavior

## [5.2.0] - 2026-03-04

### Changed

- Move from standalone repo to quiltt/quiltt-sdks

## [3.0.3] - 2025-10-14

### Bugfixes

- Fix WebView reloading by initializing controller once

## [3.0.2] - 2025-07-22

### Fixed

- Fixed Finicity OAuth redirect handling by opening shouldRender to all URLs except quilttconnector:// events
- Aligned URLUtils behavior with iOS SDK for consistent cross-platform experience
- Resolved WebView white screen issues for Finicity and other providers with unlisted domains

### Changed

- Updated URLUtils.isEncoded() to match iOS behavior (ignores double-encoding detection)
- Enhanced error handling in URLUtils.smartEncodeURIComponent()
- Updated Ruby gem dependencies to latest versions

### Documentation

- Added comprehensive deep link configuration guide to README
- Added troubleshooting section with common OAuth redirect issues
- Created CONTRIBUTING.md with Flutter-specific development guidelines
- Added CODE_OF_CONDUCT.md for community guidelines

## [3.0.0] - 2025-01-01

- Initial release.
