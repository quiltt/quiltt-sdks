---
"@quiltt/core": patch
"@quiltt/capacitor": patch
"@quiltt/react-native": patch
---

Configure each service origin explicitly, and refuse a base URL outside Quiltt.

- **Fixed** — the Connector host is built from `connectorId`, so an ID containing a `/` or `?` could point the iframe or WebView, and the session token in its URL, at another host. `@quiltt/capacitor` and `@quiltt/react-native` now refuse an ID that does not resolve to a Quiltt host, and report an error instead of loading.
- **Fixed** — `isTrustedQuilttUrl` read some URLs differently than a browser does, so a host it accepted was not always the host that got requested. A backslash ends the authority for a browser but not for the check, so a value like `https://other.example\@quiltt.app` passed the allowlist while resolving to `other.example` — enough to redirect the Connector's session token. It now refuses a backslash, and other characters the parser reinterprets or drops, plus hosts a parser would reject outright.
- **Added** — `QUILTT_API_BASE_URL`, `QUILTT_AUTH_BASE_URL`, `QUILTT_CDN_BASE_URL` and `QUILTT_WEBSOCKETS_BASE_URL` set a service's origin, scheme included. The SDK still appends the paths it owns. Anything unset keeps its production host, as before.
- **Added** — `apiBase`, `authBase`, `cdnBase` and `websocketsBase` are exported, along with `isTrustedQuilttUrl`.
- **Added** — origins are allowlisted: Quiltt hosts (`quiltt.io`, `quiltt.dev`, `quiltt.app`, any subdomain) over TLS on the default port, loopback over a plain connection, and any domain listed in `QUILTT_LOCAL_HOST_DOMAINS`. An untrusted origin throws at import instead of falling back to production.
- **Replaced** — `QUILTT_API_DOMAIN`, `QUILTT_API_INSECURE` and `QUILTT_INTERNAL_HOST_SEPARATOR`. Set the new variables in the same release; local development also needs `QUILTT_LOCAL_HOST_DOMAINS`.
