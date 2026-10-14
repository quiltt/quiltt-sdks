---
"@quiltt/core": patch
---

Fix `LocalStorage` throwing a `SecurityError` when a browser blocks storage access. Browsers such as Firefox with cross-site cookies blocked, and sandboxed iframes, throw on the `window.localStorage` property read itself, which escaped before the wrapper's error handling and left the Connector modal blank. Storage reads now fall back to the in-memory store instead of crashing.
