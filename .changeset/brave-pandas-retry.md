---
"@quiltt/core": patch
---

Cap `fetchWithRetry` retries on HTTP 429 responses so a rate-limited request can no longer amplify into a retry storm
