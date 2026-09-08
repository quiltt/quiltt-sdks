---
"@quiltt/react-native": patch
"@quiltt/android": patch
"@quiltt/flutter": patch
"@quiltt/ios": patch
---

Fix OAuth handoff aborting on some Android 11+ devices when the URL-open preflight misreports. The mobile SDKs no longer treat `canOpenURL`/`canLaunchUrl`/`resolveActivity` as authoritative — they attempt to open the OAuth URL directly and fire `onExitError` only when the open itself fails, so bank redirects succeed on devices where package-visibility filtering would otherwise abort the flow.

Fix `@quiltt/react-native` retrying the fallback URL with the raw double-encoded value, which could never open. The fallback now runs only when normalization changed the URL and the original is a well-formed HTTPS URL.
