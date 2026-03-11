# Changelog

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
