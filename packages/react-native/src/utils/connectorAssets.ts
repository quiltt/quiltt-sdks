import type { ConnectorSDKStartupErrorCode } from '@quiltt/react'
import { isTrustedQuilttUrl } from '@quiltt/react'
import { URL } from 'react-native-url-polyfill'

import type { ErrorReporter } from './error/ErrorReporter'
import { getErrorMessage } from './error/getErrorMessage'

/**
 * A Connector document is small, but the assets it declares can fail for
 * reasons the document fetch cannot see. These budgets keep the total
 * preflight bounded even when every declared asset is retried.
 */
const HTML_PREFLIGHT_TIMEOUT_MS = 10_000
const PREFLIGHT_DEADLINE_MS = 15_000
const ASSET_PROBE_TIMEOUT_MS = 5_000
const PREFLIGHT_RETRY_DELAYS_MS = [500, 1_000, 2_000]
const ASSET_RETRY_DELAY_MS = 250
const MAX_PREFLIGHT_ASSETS = 12

/** Statuses a HEAD-blocking WAF can return; fall back to a ranged GET. */
const HEAD_BLOCKED_STATUSES = new Set([403, 405, 501])
const MISSING_STATUSES = new Set([404, 410])

export type PreFlightCheck = {
  checked: boolean
  /** Human-readable failure, when the check failed. */
  error?: string
  /** Machine-readable failure class, when the check failed. */
  errorCode?: ConnectorSDKStartupErrorCode
  /** HTTP status associated with the failure, when available. */
  statusCode?: number
  /** Asset URL that failed, when the failure is an asset failure. */
  failedUrl?: string
}

type DocumentResult =
  | { kind: 'ok'; status: number; html: string }
  | { kind: 'http'; status: number }
  | { kind: 'error'; error: unknown; status?: number }

class PreflightAbortError extends Error {
  constructor() {
    super('Connector preflight aborted')
    this.name = 'PreflightAbortError'
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PreflightAbortError())
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      reject(new PreflightAbortError())
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })

/**
 * Fetch with a per-request timeout, linked to the overall preflight deadline.
 * A request that exceeds its own budget rejects with an AbortError; a request
 * cancelled by the deadline rejects with `PreflightAbortError` so the caller
 * can classify it as a timeout rather than a network failure.
 */
const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number,
  deadline?: AbortSignal
): Promise<Response> => {
  if (deadline?.aborted) throw new PreflightAbortError()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onDeadlineAbort = () => controller.abort()

  deadline?.addEventListener('abort', onDeadlineAbort, { once: true })

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (deadline?.aborted) throw new PreflightAbortError()
    throw error
  } finally {
    clearTimeout(timer)
    deadline?.removeEventListener('abort', onDeadlineAbort)
  }
}

const getAttribute = (tag: string, name: string): string | undefined => {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i')
  const match = tag.match(pattern)
  if (!match) return undefined

  const value = match[1] ?? match[2] ?? match[3] ?? ''
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

const isModuleScript = (tag: string) => {
  const type = getAttribute(tag, 'type')
  return type?.toLowerCase().split(';')[0].trim() === 'module'
}

const isScriptPreloadLink = (tag: string) => {
  const rel = getAttribute(tag, 'rel')?.toLowerCase() ?? ''

  if (rel.split(/\s+/).includes('modulepreload')) return true
  if (!rel.split(/\s+/).includes('preload')) return false

  return getAttribute(tag, 'as')?.toLowerCase() === 'script'
}

const toTrustedUrl = (rawUrl: string | undefined, documentUrl: string): string | null => {
  if (!rawUrl) return null

  try {
    const resolved = new URL(rawUrl, documentUrl)
    if (resolved.protocol !== 'https:') return null

    const value = resolved.toString()
    return isTrustedQuilttUrl(value) ? value : null
  } catch {
    return null
  }
}

/**
 * Extract the module graph the document declares before the entry executes:
 * the module entry script and its `modulepreload` / `preload as="script"`
 * dependencies. Returns absolute, trusted, deduplicated URLs.
 */
export const extractConnectorAssetUrls = (html: string, documentUrl: string): string[] => {
  const urls: string[] = []
  const seen = new Set<string>()
  const tags = html.match(/<(?:script|link)\b[^>]*>/gi) ?? []

  for (const tag of tags) {
    const isScript = /^<script\b/i.test(tag)

    let rawUrl: string | undefined
    if (isScript && isModuleScript(tag)) {
      rawUrl = getAttribute(tag, 'src')
    } else if (!isScript && isScriptPreloadLink(tag)) {
      rawUrl = getAttribute(tag, 'href')
    }

    const url = toTrustedUrl(rawUrl, documentUrl)
    if (!url || seen.has(url)) continue

    seen.add(url)
    urls.push(url)
    if (urls.length >= MAX_PREFLIGHT_ASSETS) break
  }

  return urls
}

const fetchAssetStatus = async (
  method: 'HEAD' | 'GET',
  url: string,
  deadline?: AbortSignal
): Promise<number> => {
  const response = await fetchWithTimeout(
    url,
    {
      method,
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
    },
    ASSET_PROBE_TIMEOUT_MS,
    deadline
  )

  // Release the connection; bodies are irrelevant to an existence check.
  try {
    await response.text()
  } catch {
    // A failed body read does not change the status code we already have.
  }

  return response.status
}

const probeAsset = async (
  url: string,
  deadline?: AbortSignal
): Promise<{ url: string; statusCode?: number } | null> => {
  let lastStatus: number | undefined

  // One retry covers transient CDN/WAF blips; a deterministic 404 is not
  // retried, and a 404 found by the ranged GET is final too.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(ASSET_RETRY_DELAY_MS, deadline)

    try {
      const status = await fetchAssetStatus('HEAD', url, deadline)
      lastStatus = status

      if (status >= 200 && status < 300) return null
      if (MISSING_STATUSES.has(status)) return { url, statusCode: status }

      if (HEAD_BLOCKED_STATUSES.has(status)) {
        const getStatus = await fetchAssetStatus('GET', url, deadline)
        if (getStatus >= 200 && getStatus < 300) return null
        if (MISSING_STATUSES.has(getStatus)) return { url, statusCode: getStatus }

        // HEAD is not usable here and the ranged GET was refused: the asset
        // cannot be verified, which is not the same as missing.
        return null
      }

      if (status >= 500 || status === 408 || status === 429) continue

      // Any other 4xx: the asset URL is not servable.
      return { url, statusCode: status }
    } catch (error) {
      if (error instanceof PreflightAbortError) throw error
      lastStatus = undefined
    }
  }

  return { url, statusCode: lastStatus }
}

/**
 * Check every declared asset in parallel. Returns the first failure, or null
 * when all assets exist (or cannot be verified). Throws `PreflightAbortError`
 * if the overall deadline fires.
 */
export const probeConnectorAssets = async (
  assetUrls: string[],
  deadline?: AbortSignal
): Promise<{ url: string; statusCode?: number } | null> => {
  if (assetUrls.length === 0) return null

  const results = await Promise.all(assetUrls.map((url) => probeAsset(url, deadline)))
  return results.find((result) => result !== null) ?? null
}

const fetchDocument = async (
  connectorUrl: string,
  deadline: AbortSignal
): Promise<DocumentResult> => {
  let lastError: unknown
  let lastStatus: number | undefined

  for (let attempt = 0; attempt <= PREFLIGHT_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(PREFLIGHT_RETRY_DELAYS_MS[attempt - 1], deadline)

    try {
      const response = await fetchWithTimeout(
        connectorUrl,
        { method: 'GET' },
        HTML_PREFLIGHT_TIMEOUT_MS,
        deadline
      )

      lastStatus = response.status
      if (response.ok) {
        return { kind: 'ok', status: response.status, html: await response.text() }
      }

      if (!(response.status >= 500 || response.status === 408 || response.status === 429)) {
        return { kind: 'http', status: response.status }
      }

      lastError = new Error(`Connector URL responded with status ${response.status}`)
    } catch (error) {
      if (error instanceof PreflightAbortError) throw error
      lastError = error
    }
  }

  return { kind: 'error', error: lastError, status: lastStatus }
}

/**
 * Preflight the Connector document and the module graph it declares.
 *
 * This is a best-effort early gate: a passing probe cannot guarantee that the
 * next request lands on the same build. The WebView monitor and readiness
 * watchdog remain authoritative.
 */
export const checkConnectorUrl = async (
  connectorUrl: string,
  errorReporter: ErrorReporter
): Promise<PreFlightCheck> => {
  const deadline = new AbortController()
  const deadlineTimer = setTimeout(() => deadline.abort(), PREFLIGHT_DEADLINE_MS)

  const report = async (
    errorCode: ConnectorSDKStartupErrorCode,
    statusCode?: number,
    failedUrl?: string
  ) => {
    await errorReporter.notify(new Error(`Connector preflight failed: ${errorCode}`), {
      connectorUrl,
      errorCode,
      statusCode,
      failedUrl,
    })
  }

  try {
    let document: DocumentResult
    try {
      document = await fetchDocument(connectorUrl, deadline.signal)
    } catch (error) {
      if (error instanceof PreflightAbortError) {
        const errorMessage = 'The Connector did not respond in time.'
        await report('preflight_failed')
        return { checked: true, error: errorMessage, errorCode: 'preflight_failed' }
      }
      throw error
    }

    if (document.kind === 'http') {
      const errorMessage = getErrorMessage(document.status)
      await report('preflight_failed', document.status)
      return {
        checked: true,
        error: errorMessage,
        errorCode: 'preflight_failed',
        statusCode: document.status,
      }
    }

    if (document.kind === 'error') {
      const error = document.error instanceof Error ? document.error : undefined
      // Prefer the HTTP status in the message; a retry-exhausted 5xx otherwise
      // reads as a generic network failure.
      const errorMessage = document.status
        ? getErrorMessage(document.status)
        : getErrorMessage(undefined, error)
      await report('preflight_failed', document.status)
      return {
        checked: true,
        error: errorMessage,
        errorCode: 'preflight_failed',
        statusCode: document.status,
      }
    }

    const assetUrls = extractConnectorAssetUrls(document.html, connectorUrl)
    let assetFailure: { url: string; statusCode?: number } | null = null

    try {
      assetFailure = await probeConnectorAssets(assetUrls, deadline.signal)
    } catch (error) {
      if (error instanceof PreflightAbortError) {
        const errorMessage = 'The Connector did not respond in time.'
        await report('preflight_failed', document.status)
        return {
          checked: true,
          error: errorMessage,
          errorCode: 'preflight_failed',
          statusCode: document.status,
        }
      }
      throw error
    }

    if (assetFailure) {
      const errorMessage = assetFailure.statusCode
        ? `A required Connector asset could not be loaded (HTTP ${assetFailure.statusCode}).`
        : 'A required Connector asset could not be loaded.'
      await report('asset_load_failed', assetFailure.statusCode, assetFailure.url)
      return {
        checked: true,
        error: errorMessage,
        errorCode: 'asset_load_failed',
        statusCode: assetFailure.statusCode,
        failedUrl: assetFailure.url,
      }
    }

    return { checked: true }
  } catch (error) {
    const errorMessage = getErrorMessage(undefined, error instanceof Error ? error : undefined)
    await report('preflight_failed')
    return {
      checked: true,
      error: errorMessage,
      errorCode: 'preflight_failed',
    }
  } finally {
    clearTimeout(deadlineTimer)
  }
}
