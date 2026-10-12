---
"@quiltt/core": patch
---

Validate Session tokens against `POST /v1/introspect/session_token` instead of the deprecated `GET /v1/users/session`. `AuthAPI.ping()` now uses the introspection endpoint; the response payload is unchanged.
