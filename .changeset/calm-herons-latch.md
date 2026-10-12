---
"@quiltt/react": patch
"@quiltt/vue": patch
---

Stop re-validating a Session token after the server rejects it with 401. `importSession()` now latches rejected tokens, so session-expiry effects and other repeated re-imports of a dead token no longer ping it again
