---
"@quiltt/core": minor
"@quiltt/react": minor
"@quiltt/react-native": minor
"@quiltt/vue": minor
"@quiltt/capacitor": minor
"@quiltt/android": minor
"@quiltt/flutter": minor
"@quiltt/ios": minor
---

Signing out now sticks. `importSession` validated a token with a request and wrote it afterwards, so a sign-out — or a different sign-in — that landed while that request was in flight was overwritten by the late response, and an app that redirects on "signed in" sent the user back where they came from. The token is now adopted only if the session has not moved on in the meantime, and `importSession` resolves `false` when it did not; two overlapping imports of the same token both resolve `true`.

- **Fixed** — a subscription authenticates with the session its request used, rather than the shared session store. A request whose session came from elsewhere failed with `UNAUTHENTICATED` / `NO_TOKEN`, and a store holding a different session connected the WebSocket as that user.
- **Fixed** — a `401` signs out the session that sent the request, rather than only the shared store, so a server render no longer resends a rejected token on every later query. A rejection that arrives after the session was replaced no longer signs out the newer session — whether it came from a query or from the import validating a token — and no longer cancels a sign-in that is still being validated.
- **Fixed** — `revokeSession`, and the timer that ends an expiring session, no longer sign out a session that was adopted while they were waiting. A revoke answered after a new sign-in, or the previous session's timer firing after a new one was stored, cleared the new session.
- **Fixed** — a `@quiltt/react` app sees a sign-out made in another tab while it is validating a token, instead of adopting that token when the answer arrives and bringing the ended session back.
- **Fixed** — a `@quiltt/vue` tab no longer signs out a session another tab has since saved. An expiry it observes — a stale token arriving late, or one that lapses while a newer sign-in is already stored — ends that tab's own session without writing over the stored one.
- **Fixed** — a server-rendered `@quiltt/vue` app keeps each request's session to itself. One request could render another request's session or be signed out by it, and its GraphQL calls could go out without a session of their own or be batched with another request's under one `authorization` header.
- **Fixed** — `QuilttAuthProvider` no longer resets the Apollo cache for the session a mount starts with, so an app reusing one client across route changes no longer loses cached data and refetches it. It still resets when the session really changes — including one that changed while the provider was unmounted, or had already expired by the time it mounted — so one account's cached results are never shown to another.
- **Fixed** — a `@quiltt/vue` app installed with a `token` option now saves it. The option filled only the app's own session, so its GraphQL requests went out with no token at all and importing that same token reported failure.
- **Fixed** — `useStorage` no longer re-renders in a loop, ending in React's "Maximum update depth exceeded", when it persists an object under an inline default such as `useStorage('settings', {})`.
- **Fixed** — `useStorage` no longer reads or writes the shared store on a server, where one request's value was visible to the next.
- **Changed** — `useStorage`'s initial value behaves like `useState`'s default. It now applies in browsers, where a missing key previously read back as `null` and the default was ignored; it applies only to a key that was never written, so a cleared value stays cleared — including after a reload — and a hook pointed at a new key no longer inherits the previous key's value; and setting a value equal to it saves it, where the write used to be dropped as a no-op. A cleared key is saved as `null`, which is how a later visit tells it apart from one that was never written, so `LocalStorage#get` reports `null` for it.
- **Changed** — `useStorage` updater functions receive the current stored value instead of the one captured when the setter was created.
- **Added** — `useStorage` reports whether its value has been read from storage yet, as `restored`: the third element of its tuple, `useSession`'s fourth, and a named property on `useQuilttSession`. It is `false` only for the render that has to match the server's markup, which cannot read storage, so an empty value there does not mean signed out. Redirects and login screens should wait for it.
- **Added** — `useSession` returns a `SessionController` with `snapshot()` and `adopt(token, at)`, for work that resumes after an `await` and has to know whether the session moved on while it waited. `adopt` reports success only when the session now holds the token.
- **Added** — `Storage#has(key)` reports whether a key was ever written, which `get` cannot answer: a key written empty and one never written both read back empty. `@quiltt/core`'s session helpers and types — `createSessionController`, `SESSION_STORAGE_KEY`, `sharedSessionTokenSource`, `SessionController`, `SessionTokenSource` and the rest — are exported from `@quiltt/react`, `@quiltt/vue`, and `@quiltt/react-native` as well, and `@quiltt/core` now exposes them at `@quiltt/core/session`.
