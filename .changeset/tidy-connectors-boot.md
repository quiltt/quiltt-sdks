---
"@quiltt/core": patch
"@quiltt/react-native": patch
---

Surface Connector startup failures instead of leaving the user on a blank screen.

`QuilttConnector` now preflights the module graph the Connector document declares, watches the WebView before the `Load` handshake, and times out a startup that never completes (default 20s, configurable with `startupTimeoutMs`). A failed startup shows an actionable error screen and reports `ExitError` with `metadata.error` (`code`, `message`, `statusCode`, `url`); `@quiltt/core` exposes the new `ConnectorSDKCallbackError` and `ConnectorSDKStartupErrorCode` types. Confirmed asset failures notify immediately and offer a retry, while timeouts and WebView errors notify when the user exits. On Android, the WebView now revalidates the stable entry script instead of serving a cached document against chunks that may no longer exist.
