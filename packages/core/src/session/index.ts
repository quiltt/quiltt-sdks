import { GlobalStorage } from '@/storage'
import type { Maybe } from '@/types'

/**
 * The slot the SDK stores its session token in.
 *
 * Every framework package reads and writes the same slot, so a session imported through one entry
 * point is visible to the others.
 */
export const SESSION_STORAGE_KEY = 'session'

/** A point-in-time view of a session slot, for comparing after an async step. */
export interface SessionSnapshot {
  /** The token stored in the slot, or `null` when it holds none. */
  token: Maybe<string>
  /** How many times the slot has been cleared. @see markSessionCleared */
  revision: number
}

/** Writes a session token to a slot, or clears the slot with `null`. */
export type SetToken = (token: Maybe<string>) => void

/**
 * A session slot paired with the setter that writes it.
 *
 * Async work that resumes after an `await` has to know whether the session moved on in the
 * meantime, and it cannot ask component state: the component may have unmounted, or its state may
 * predate the change. Handing it this object keeps the slot and the setter together, so the work
 * cannot read one session and write another.
 */
export interface SessionController {
  /** Writes a token to this slot. */
  set: SetToken
  /** The slot's current contents, to compare against later. */
  snapshot: () => SessionSnapshot
  /**
   * Saves `token` to this slot if it has not changed since `since`, and reports whether the session
   * now holds it.
   *
   * Returns `true` when the slot already holds `token` — a concurrent caller may have adopted it,
   * and the session the caller asked for is active either way. Returns `false` when something else
   * got there first, which is what stops a sign-out during an async step from being undone.
   *
   * The setter runs on every path that reports success, including when the slot already held the
   * token, so a setter that wraps the write is always notified. Setters ignore a value the slot
   * already holds. The check, the write, and the read-back happen without an intervening `await`, so
   * they cannot interleave — and `true` means the slot really holds `token`.
   */
  adopt: (token: string, since: SessionSnapshot) => boolean
}

/**
 * Counts explicit clears, per storage key.
 *
 * The stored token cannot report a sign-out on its own: clearing a session that was already empty
 * leaves storage exactly as it was found, so an import started with no session cannot tell "the
 * caller signed out" from "nothing happened". Comparing this count across an await catches it.
 *
 * Keyed rather than global: an app can hold more than one session (React's
 * `useSession('other-session')`), and clearing that one is not a sign-out from the default session.
 */
const clearCounts = new Map<string, number>()

const clearCount = (key: string): number => clearCounts.get(key) ?? 0

/** Records that a slot was cleared. Call this for every clear, including one that changed nothing. */
export const markSessionCleared = (key: string = SESSION_STORAGE_KEY): void => {
  clearCounts.set(key, clearCount(key) + 1)
}

const readToken = (key: string): Maybe<string> => GlobalStorage.get(key) ?? null

/**
 * Where a controller reads the slot it guards.
 *
 * The default is the `GlobalStorage` slot, which a browser shares across tabs and Quiltt apps on the
 * page. A server has no such slot: `GlobalStorage` is one process-wide singleton while every request
 * renders its own app, so state written by one request would be read, and cancelled, by the next. A
 * server render passes accessors over its request-local session instead.
 */
export interface SessionSlot {
  /** The token the slot holds, or `null` when it holds none. */
  read: () => Maybe<string>
  /** How many times this slot has been cleared. @see markSessionCleared */
  clearCount: () => number
}

const globalSlot = (storageKey: string): SessionSlot => ({
  read: () => readToken(storageKey),
  clearCount: () => clearCount(storageKey),
})

/**
 * Where a consumer reads the session token it authenticates with, and drops that token when it has
 * expired.
 *
 * The default is the `GlobalStorage` slot, which a browser shares across tabs. A server render has no
 * shared slot — one process serves every request, each with its own session — so it reads that
 * request's session instead. @see SessionSlot
 */
export interface SessionTokenSource {
  /** The token to authenticate with, or `null` when there is none. */
  read: () => Maybe<string>
  /**
   * Called when the token read has expired, so whoever holds it can drop it. Left out when the holder
   * has no way to write it back.
   */
  clear?: () => void
}

/**
 * The shared slot as a token source: the default for links in a browser, where every Quiltt app on
 * the page and every tab reads the same session.
 *
 * Links take this as an argument instead of reading the store directly, so a server render can pass
 * its request-local session and every link in that client's chain authenticates with — and clears —
 * the same token. A link that reads the store on its own would pick up whichever request wrote last.
 */
export const sharedSessionTokenSource: SessionTokenSource = {
  read: () => readToken(SESSION_STORAGE_KEY),
  clear: () => GlobalStorage.set(SESSION_STORAGE_KEY, null),
}

/** Binds a session slot to the setter that writes it. @see SessionController */
export const createSessionController = (
  set: SetToken,
  storageKey: string = SESSION_STORAGE_KEY,
  slot: SessionSlot = globalSlot(storageKey)
): SessionController => ({
  set,
  snapshot: () => ({ token: slot.read(), revision: slot.clearCount() }),
  adopt: (token, since) => {
    const current = slot.read()
    const moved = current !== since.token || slot.clearCount() !== since.revision

    if (current !== token && moved) return false

    set(token)

    // Reported from the slot rather than assumed: a setter that rejects the token — an unparseable
    // session, say — leaves the slot as it was, and claiming success would send the caller down the
    // signed-in path for a session that is not there.
    return slot.read() === token
  },
})
