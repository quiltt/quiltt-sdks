import crossfetch from 'cross-fetch'

// Use `cross-fetch` only if `fetch` is not available on the `globalThis` object
const effectiveFetch = typeof fetch === 'undefined' ? crossfetch : fetch

type FetchWithRetryOptions = RequestInit & {
  retry?: boolean
  retriesRemaining?: number
  initialRetries?: number
  retries429Remaining?: number
  initial429Retries?: number
  validateStatus?: (status: number) => boolean
}

export type FetchResponse<T> = {
  data: T | null
  status: number
  statusText: string
  headers: Headers
  ok: boolean
}

const RETRY_DELAY = 150 // ms
const MAX_RETRY_DELAY = 1500 // ms
const RETRIES = 10
// Rate limits get their own, much smaller budget. Retrying a 429 is what turns
// one client request into a self-amplifying storm: when the server is shedding
// load, ten more requests per call make it worse rather than better.
const MAX_429_RETRIES = 1

const getRetryDelay = (attemptNumber: number): number => {
  const exponentialDelay = RETRY_DELAY * 2 ** (attemptNumber - 1)
  return Math.min(exponentialDelay, MAX_RETRY_DELAY)
}

type RetryableError = Error & { retryable?: boolean; status?: number }

/**
 * A wrapper around the native `fetch` function that adds automatic retries on failure, including network errors and HTTP 429 responses.
 * Now treats any response with status < 500 as valid.
 */
export const fetchWithRetry = async <T>(
  url: RequestInfo,
  options: FetchWithRetryOptions = { retry: false }
): Promise<FetchResponse<T>> => {
  const {
    retry,
    retriesRemaining,
    initialRetries,
    retries429Remaining,
    initial429Retries,
    validateStatus = (status) => status >= 200 && status < 300, // Default to success for 2xx responses
    ...fetchOptions
  } = options

  try {
    const response = await effectiveFetch(url, fetchOptions)

    const isResponseOk = validateStatus(response.status)

    if (isResponseOk) {
      return {
        data: await response.json().catch(() => null),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: isResponseOk,
      }
    }

    // If validateStatus fails, and retry is enabled, prepare to retry for eligible status codes
    if (retry && (response.status >= 500 || response.status === 429)) {
      const error = new Error(`HTTP error with status ${response.status}`) as RetryableError
      error.retryable = true
      error.status = response.status
      throw error
    }

    const error = new Error(`HTTP error with status ${response.status}`) as RetryableError
    error.retryable = false
    throw error
  } catch (error) {
    const retryableError = error as RetryableError
    const shouldRetry = retry && retryableError.retryable !== false

    if (shouldRetry) {
      const isRateLimited = retryableError.status === 429
      const currentRetriesRemaining = isRateLimited
        ? (retries429Remaining ?? MAX_429_RETRIES)
        : (retriesRemaining ?? RETRIES)

      if (currentRetriesRemaining > 0) {
        if (isRateLimited) {
          const totalRetries = initial429Retries ?? currentRetriesRemaining
          const attemptNumber = totalRetries - currentRetriesRemaining + 1
          await new Promise((resolve) => setTimeout(resolve, getRetryDelay(attemptNumber)))
          return fetchWithRetry(url, {
            ...options,
            retries429Remaining: currentRetriesRemaining - 1,
            initial429Retries: totalRetries,
          })
        }

        const totalRetries = initialRetries ?? currentRetriesRemaining
        const attemptNumber = totalRetries - currentRetriesRemaining + 1
        await new Promise((resolve) => setTimeout(resolve, getRetryDelay(attemptNumber)))
        return fetchWithRetry(url, {
          ...options,
          retriesRemaining: currentRetriesRemaining - 1,
          initialRetries: totalRetries,
        })
      }
    }
    return Promise.reject(error)
  }
}
