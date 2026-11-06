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

Signing out now sticks. `importSession` validates a token with a request and writes it afterwards, so a sign-out — or a different sign-in — that landed while that request was in flight was overwritten when the response arrived, and an app that redirects on "signed in" sent the user back where they came from. The token is now adopted only if the session has not moved on in the meantime, and `importSession` resolves `false` when it did not. Two overlapping imports of the same token both resolve `true`, instead of the later one failing for a session that is active.

- **Fixed** — a subscription authenticates with the session its request used. It read the shared session store instead, so a request whose session came from elsewhere failed with `UNAUTHENTICATED` / `NO_TOKEN`, and a store holding another session connected the WebSocket as that user.
- **Fixed** — a `401` clears the session that sent the request, rather than only the shared store. A server render kept its rejected token and resent it on every later query. It also no longer signs out a newer session: a rejection that arrives after the session was replaced is about the token that is already gone.
- **Fixed** — a `@quiltt/vue` tab no longer signs out a session another tab has since saved: an expiry it observes — a stale token arriving from another tab, or one that lapses while a newer sign-in is already stored — clears that tab's session without writing over the stored one.
- **Fixed** — a server-rendered `@quiltt/vue` app keeps each request's session to itself. One request could render another request's session or be signed out by it, and its GraphQL calls could go out without a session of their own — or be batched with another request's and answered as that user. `useStorage` no longer reads or writes the shared store on a server for the same reason.
- **Fixed** — `QuilttAuthProvider` no longer resets the Apollo cache for the session a mount starts with, so an app reusing one client across route changes no longer loses cached data and refetches it. It still resets when the session really changes, including one that changed while the provider was unmounted and one that had already expired by the time the provider mounted, so one account's cached results are never shown to another.
- **Fixed** — `useStorage` no longer re-renders in a loop — React's "Maximum update depth exceeded" — when it persists an object under an inline default such as `useStorage('settings', {})`.
- **Added** — `useStorage` reports whether its value has been read from storage yet: `restored`, the third element of its tuple (`useSession` returns it fourth, and `useQuilttSession` as `restored`). It is `false` only for the render that has to match the server's markup, which cannot read storage, so an empty value there does not mean signed out — redirects and login screens should wait for it.
- **Added** — `useSession` also returns a `SessionController` with `snapshot()` and `adopt(token, at)`, for work that resumes after an `await` and has to know whether the session moved on while it waited. `adopt` reports success only when the slot really holds the token, so a token the session rejects is not reported as a sign-in. The session helpers — `createSessionController`, `SESSION_STORAGE_KEY`, `markSessionCleared`, `sharedSessionTokenSource` and their types — are now exported from `@quiltt/react` and `@quiltt/vue` as well, not just from `@quiltt/core`.
- **Changed** — `useStorage`'s `initialState` now applies in browsers, where it previously never did because a missing key read back as `null`. This is the one change an existing app could notice.
- **Changed** — a cleared value stays cleared, including after a reload. `initialState` applies only to a key that was never written, so `setStorage(undefined)` no longer brings the default back, and pointing the hook at a new key no longer inherits the previous key's value. A cleared key is saved as `null` instead of being deleted, which is what lets a later visit tell it apart from one that was never written; `LocalStorage#get` reports the `null`.
- **Changed** — setting a value a key is already showing saves it. The initial value is a default, not a stored one, so `setStorage('dark')` on an untouched `useStorage('theme', 'dark')` now writes it, where it used to be dropped as a no-op and left other readers without a value.
- **Changed** — updater functions receive the current stored value instead of the one captured when the setter was created.
