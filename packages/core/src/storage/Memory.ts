import type { Observer } from '@/observables'
import { Observable } from '@/observables'
import type { Maybe } from '@/types'

/**
 * This is designed to support effectively an in memory key value store singleton,
 * similar to localStorage, but allows you to subscribe to changes within the current
 * window.
 */
export class MemoryStorage<T> {
  private observables: { [key: string]: Observable<T> } = {}
  private written: Set<string> = new Set()

  get = (key: string) => {
    if (this.observables[key]) {
      return this.observables[key].get()
    }
    return undefined
  }

  /**
   * Whether this key was ever written, including with an empty value.
   *
   * `get` cannot answer this: a key written as `undefined` reads back the same as one that was
   * never written, and callers that fall back to a default need to tell those apart. Tracked
   * separately from `observables`, which `subscribe` also populates for keys that were only
   * watched.
   */
  has = (key: string): boolean => this.written.has(key)

  set = (key: string, state: Maybe<T> | undefined): void => {
    this.written.add(key)

    if (!this.observables[key]) {
      this.observables[key] = new Observable<T>(state)
    } else {
      this.observables[key].set(state)
    }
  }

  subscribe = (key: string, observer: Observer<T>): void => {
    if (!this.observables[key]) this.observables[key] = new Observable<T>()

    this.observables[key].subscribe(observer)
  }

  unsubscribe = (key: string, observer: Observer<T>): void => {
    if (this.observables[key]) {
      this.observables[key].unsubscribe(observer)
    }
  }
}
